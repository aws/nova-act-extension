import * as crypto from 'crypto';
import * as vscode from 'vscode';

import { EXTENSION_ID, GlobalStateCommands } from '../../constants';
import logger from '../utils/logger';
import { type WrappedProperties, wrapProperties } from '../utils/telemetryUtils';
import {
  type CopilotChatCommand,
  EVENTS,
  type EventName,
  type EventPayloadMap,
  type ExtensionDeactivateReason,
  type FeatureName,
  type ImportSource,
  type InstallSource,
  SessionDeactivateReason,
  type TelemetryEvent,
  type WebviewKind,
  isLifeCycleEvent,
} from './events';

interface EventContext {
  // Certain events such as extension deactivation may not have a session ID
  session_id?: string;
  extension_version: string;
  vscode_version: string;
  ide: string;
}

type EventData = {
  event: string;
  timestamp: string;
  event_id: string;
  install_id: string;
  context: EventContext;
  properties: WrappedProperties;
};

type Session = { id: string; startedAt: number };

export class TelemetryClient {
  private static instance: TelemetryClient;
  private enabled: boolean = false;
  private installId: string = '';
  private currentSession: Session | null = null;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private context: vscode.ExtensionContext | null = null;

  private readonly TELEMETRY_ENDPOINT = 'https://nova.amazon.com/agent/extension-telemetry';
  private readonly INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  // Use a promise to ensure session is started only once
  private sessionInitPromise: Promise<void> | null = null;

  private constructor() {
    this.enabled = vscode.env.isTelemetryEnabled;
    vscode.env.onDidChangeTelemetryEnabled((enabled) => {
      this.enabled = enabled;

      if (enabled && this.currentSession === null) {
        // Start a new session if telemetry is now enabled
        this.ensureSessionStarted();
      } else if (!enabled && this.currentSession !== null) {
        // End existing session if telemetry is disabled
        this.endSession(SessionDeactivateReason.SHUTDOWN);
      }
    });
  }

  public static getInstance(): TelemetryClient {
    if (!TelemetryClient.instance) {
      TelemetryClient.instance = new TelemetryClient();
    }
    return TelemetryClient.instance;
  }

  public async initialize(context: vscode.ExtensionContext) {
    if (this.context !== null) {
      logger.debug('TelemetryClient is already initialized.');
      return;
    }
    this.context = context;
    await this.initializeInstallId();
    if (this.enabled) {
      await this.ensureSessionStarted();
    }
  }

  private async initializeInstallId() {
    if (!this.context) return;

    this.installId = this.context.globalState.get(GlobalStateCommands.installId) ?? '';
    if (!this.installId) {
      this.installId = crypto.randomUUID();
      await this.context.globalState.update(GlobalStateCommands.installId, this.installId);
    }
  }

  /**
   * Helper method to ensure a session is started. Using the sessionInitPromise to race from multiple sendEvent calls
   */
  private async ensureSessionStarted(): Promise<void> {
    // If a session is already started, do nothing
    if (this.currentSession) return;
    // If a session is already being initialized, we'll just await that same promise later
    if (!this.sessionInitPromise) {
      // If there is no existing session initialization in progress, create a promise to start the session
      this.sessionInitPromise = (async () => {
        // In case some other code path started a session, double check here
        if (!this.currentSession) {
          await this.startSession();
        }
      })().finally(() => {
        // Reset the promise after we finish starting a session
        this.sessionInitPromise = null;
      });
    }
    // Await the session initialization promise to ensure session is started
    await this.sessionInitPromise;
  }

  private async startSession() {
    const session: Session = { id: crypto.randomUUID(), startedAt: Date.now() };
    this.currentSession = session;

    await this.captureSessionStarted();
    // Start the inactivity timer for this session
    this.resetInactivityTimer();
  }

  public async endSession(reason: SessionDeactivateReason) {
    const currentSession = this.currentSession;
    if (currentSession === null) {
      // No active session to end
      return;
    }

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    const duration = Date.now() - currentSession.startedAt;

    // Reset the current session first, so any concurrent events will start a new session
    this.currentSession = null;
    await this.captureSessionEnded(reason, duration, currentSession.id);
  }

  private buildEventContext(overrideSessionId?: string): EventContext {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    const ide = vscode.env.appName.toLowerCase();
    return {
      session_id: overrideSessionId ?? this.currentSession?.id,
      extension_version: extension?.packageJSON.version ?? 'unknown',
      vscode_version: vscode.version,
      ide,
    };
  }

  private resetInactivityTimer() {
    if (!this.enabled || this.currentSession === null) return;

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.inactivityTimer = setTimeout(() => {
      this.handleInactivity();
    }, this.INACTIVITY_TIMEOUT_MS);
  }

  private handleInactivity() {
    this.endSession(SessionDeactivateReason.IDLE);
  }

  /**
   * Telemetry client cleanups on extension deactivation
   */
  public async dispose() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  private getEventData<N extends EventName>(
    { eventName, properties }: TelemetryEvent & { eventName: N; properties: EventPayloadMap[N] },
    overrideSessionId?: string
  ): EventData {
    const wrappedProperties = wrapProperties(properties);
    return {
      event: eventName,
      timestamp: new Date().toISOString(),
      event_id: crypto.randomUUID(),
      install_id: this.installId,
      context: this.buildEventContext(overrideSessionId),
      properties: wrappedProperties,
    };
  }

  public async sendEvent(event: TelemetryEvent, options?: { overrideSessionId?: string }) {
    if (!this.enabled) {
      return;
    }

    if (!isLifeCycleEvent(event.eventName)) {
      // For all events except lifecycle events, ensure we have an active session and bump the inactivity timer
      await this.ensureSessionStarted();
      this.resetInactivityTimer();
    }

    const eventData = this.getEventData(event, options?.overrideSessionId);

    try {
      const response = await fetch(this.TELEMETRY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NovaActExtension-Install-Id': this.installId,
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        logger.debug(`Failed to send telemetry: ${response.statusText}`);
      }
    } catch (error) {
      logger.debug(`Error sending telemetry: ${error}`);
    }
  }

  /* ---------------------------- Extension Events ---------------------------- */
  public captureExtensionInstalled(installSource: InstallSource) {
    this.sendEvent({
      eventName: EVENTS.EXTENSION.INSTALLED,
      properties: { install_source: installSource },
    });
  }

  public captureExtensionActivated() {
    this.sendEvent({
      eventName: EVENTS.EXTENSION.ACTIVATED,
      properties: {},
    });
  }

  public async captureExtensionDeactivated(reason: ExtensionDeactivateReason) {
    await this.sendEvent({
      eventName: EVENTS.EXTENSION.DEACTIVATED,
      properties: { reason },
    });
  }

  /* ---------------------------- Session Events --------------------------- */
  private async captureSessionStarted() {
    await this.sendEvent({
      eventName: EVENTS.SESSION.STARTED,
      properties: {},
    });
  }

  /**
   * Cature session ended event
   * @param reason
   * @param sessionDurationMs
   * @param endedSessionId Since it's possible for a new session to start before the ended event is sent, we explicitly pass the ended session ID here
   */
  private async captureSessionEnded(
    reason: SessionDeactivateReason,
    sessionDurationMs: number,
    endedSessionId: string
  ) {
    await this.sendEvent(
      {
        eventName: EVENTS.SESSION.ENDED,
        properties: { reason, session_duration_ms: sessionDurationMs },
      },
      { overrideSessionId: endedSessionId }
    );
  }

  /* ----------------------------- Feature Events ----------------------------- */
  public captureFeatureActivated(feature: FeatureName) {
    this.sendEvent({
      eventName: EVENTS.FEATURE.ACTIVATED,
      properties: { feature },
    });
  }

  /* ------------------------------ Script Events ----------------------------- */
  public captureScriptImported(source: ImportSource) {
    this.sendEvent({
      eventName: EVENTS.SCRIPT.IMPORTED,
      properties: { source },
    });
  }

  public captureScriptExported({ cellCount, lineCount }: { cellCount: number; lineCount: number }) {
    this.sendEvent({
      eventName: EVENTS.SCRIPT.EXPORTED,
      properties: { cell_count: cellCount, line_count: lineCount },
    });
  }

  /* ------------------------------ Chat Events ------------------------------ */
  public captureChatMessageSent(command: CopilotChatCommand) {
    this.sendEvent({
      eventName: EVENTS.CHAT.MESSAGE,
      properties: { command },
    });
  }

  /* ------------------------------ Error Events ------------------------------ */
  public captureWebviewError({
    errorMessage,
    webview,
  }: {
    errorMessage: string;
    webview: WebviewKind;
  }) {
    this.sendEvent({
      eventName: EVENTS.ERROR.WEBVIEW,
      properties: { error_message: errorMessage, webview },
    });
  }

  public captureExtensionHostError(errorMessage: string) {
    this.sendEvent({
      eventName: EVENTS.ERROR.EXT_HOST,
      properties: { error_message: errorMessage },
    });
  }
}
