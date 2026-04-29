import { builderModeVscodeApi } from '../../../../core/utils/vscodeApi';
import type { CDPMessage, ScreencastFrameParams } from './cdpTypes';

const log = (..._args: unknown[]) => {
  // Uncomment for debugging: console.log('[CDPClient]', ...args);
};

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type StateChangeCallback = (state: ConnectionState) => void;
export type FrameCallback = (imageData: string, width: number, height: number) => void;

export interface ScreencastOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

/** Target render interval in ms (~30 fps). */
const FRAME_INTERVAL_MS = 33;

/**
 * CDP client that communicates through the VS Code extension host proxy.
 * The webview cannot connect directly to Chrome's WebSocket (origin rejected),
 * so the extension host opens the WebSocket and relays messages via postMessage.
 *
 * Frame throttling: we only ack frames we render (~30 fps). Chrome pauses
 * sending until it receives the ack, naturally throttling the frame rate.
 */
export class CDPClient {
  private msgId = 1;
  private pendingEnableId: number | null = null;
  private _state: ConnectionState = 'disconnected';
  private onStateChange: StateChangeCallback;
  private onFrame: FrameCallback;
  private screencastOptions: ScreencastOptions;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private reconnectUrl: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private reconnectAttempts = 0;
  private connectId = 0; // guards against stale events from replaced connections
  private static readonly MAX_RECONNECT_DELAY = 8000;
  private static readonly MAX_RECONNECT_ATTEMPTS = 3;

  // Frame throttle state
  private lastRenderTime = 0;
  private pendingFrame: ScreencastFrameParams | null = null;
  private frameTimer: ReturnType<typeof setTimeout> | null = null;

  // Stats (logged periodically)
  private framesReceived = 0;
  private framesRendered = 0;
  private framesDropped = 0;
  private lastStatsLog = 0;

  constructor(
    onStateChange: StateChangeCallback,
    onFrame: FrameCallback,
    screencastOptions?: ScreencastOptions
  ) {
    this.onStateChange = onStateChange;
    this.onFrame = onFrame;
    this.screencastOptions = screencastOptions ?? {};
  }

  get state(): ConnectionState {
    return this._state;
  }

  connect(url: string): void {
    log('connect', url);
    if (this.messageHandler) this.disconnect();
    this.reconnectUrl = url;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.doConnect(url);
  }

  private doConnect(url: string): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    if (this.frameTimer) {
      clearTimeout(this.frameTimer);
      this.frameTimer = null;
    }
    this.pendingFrame = null;
    this.setState('connecting');
    const myConnectId = ++this.connectId;

    this.messageHandler = (event: MessageEvent) => {
      if (this.connectId !== myConnectId) return;
      const msg = event.data;
      if (msg.type === 'cdpStateChange') {
        this.handleStateChange(msg.state, myConnectId);
      } else if (msg.type === 'cdpMessage') {
        this.handleCdpMessage(msg.data);
      }
    };
    window.addEventListener('message', this.messageHandler);

    this.postToExtension({ command: 'cdpConnect', wsUrl: url });
  }

  private handleStateChange(
    state: 'connected' | 'disconnected' | 'error',
    expectedConnectId: number
  ): void {
    if (this.connectId !== expectedConnectId) return;

    if (state === 'connected') {
      log('connected, sending Page.enable');
      this.reconnectDelay = 1000;
      this.reconnectAttempts = 0;
      this.setState('connected');

      const enableId = this.msgId;
      this.send('Page.enable');
      this.pendingEnableId = enableId;
    } else if (state === 'error') {
      // Don't transition to 'error' state. Per WebSocket spec, onerror is always
      // followed by onclose, which sends 'disconnected' and triggers reconnect.
      // Skipping the intermediate state avoids a brief error flash in the UI.
      log('received error from proxy, waiting for disconnected');
    } else if (state === 'disconnected') {
      log('received disconnected from proxy');
      this.setState('disconnected');
      this.scheduleReconnect();
    }
  }

  private handleCdpMessage(data: string): void {
    const msg: CDPMessage = JSON.parse(data);

    if (msg.id === this.pendingEnableId) {
      log('Page.enable response', { error: msg.error });
      if (!msg.error) {
        log('sending Page.startScreencast');
        this.send('Page.startScreencast', {
          format: 'jpeg',
          quality: this.screencastOptions.quality ?? 80,
          maxWidth: this.screencastOptions.maxWidth ?? 1920,
          maxHeight: this.screencastOptions.maxHeight ?? 1080,
          everyNthFrame: 1,
        });
      } else {
        log('Page.enable failed', msg.error);
        this.setState('error');
      }
      this.pendingEnableId = null;
      return;
    }

    if (msg.method === 'Page.screencastFrame') {
      this.handleScreencastFrame(msg.params as unknown as ScreencastFrameParams);
      return;
    }

    if (msg.method) {
      log('cdp event:', msg.method);
    }
  }

  private handleScreencastFrame(params: ScreencastFrameParams): void {
    this.framesReceived++;
    this.logStatsIfDue();

    const now = Date.now();
    const elapsed = now - this.lastRenderTime;

    if (elapsed >= FRAME_INTERVAL_MS) {
      this.lastRenderTime = now;
      this.framesRendered++;
      this.send('Page.screencastFrameAck', { sessionId: params.sessionId });
      this.onFrame(params.data, params.metadata.deviceWidth, params.metadata.deviceHeight);
    } else {
      this.framesDropped++;
      this.pendingFrame = params;
      if (!this.frameTimer) {
        const delay = FRAME_INTERVAL_MS - elapsed;
        this.frameTimer = setTimeout(() => {
          this.frameTimer = null;
          if (this.pendingFrame) {
            this.lastRenderTime = Date.now();
            this.framesRendered++;
            this.framesDropped--;
            this.send('Page.screencastFrameAck', { sessionId: this.pendingFrame.sessionId });
            this.onFrame(
              this.pendingFrame.data,
              this.pendingFrame.metadata.deviceWidth,
              this.pendingFrame.metadata.deviceHeight
            );
            this.pendingFrame = null;
          }
        }, delay);
      }
    }
  }

  private logStatsIfDue(): void {
    const now = Date.now();
    if (now - this.lastStatsLog > 5000) {
      log(
        'frame stats (5s): received=' +
          this.framesReceived +
          ' rendered=' +
          this.framesRendered +
          ' dropped=' +
          this.framesDropped
      );
      this.framesReceived = 0;
      this.framesRendered = 0;
      this.framesDropped = 0;
      this.lastStatsLog = now;
    }
  }

  private scheduleReconnect(): void {
    if (!this.reconnectUrl) return;
    if (this.reconnectAttempts >= CDPClient.MAX_RECONNECT_ATTEMPTS) {
      log('max reconnect attempts reached, giving up silently');
      this.reconnectUrl = null;
      return;
    }
    this.reconnectAttempts++;
    log(
      'scheduling reconnect in ' +
        this.reconnectDelay +
        'ms (attempt ' +
        this.reconnectAttempts +
        ')'
    );
    const url = this.reconnectUrl;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect(url);
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, CDPClient.MAX_RECONNECT_DELAY);
  }

  disconnect(): void {
    log('disconnect');
    this.reconnectUrl = null;
    this.connectId++;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.frameTimer) {
      clearTimeout(this.frameTimer);
      this.frameTimer = null;
    }
    this.pendingFrame = null;
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    // Stop the screencast before tearing down the socket so Chrome
    // doesn't keep encoding frames for a connection that's going away.
    this.send('Page.stopScreencast');
    this.postToExtension({ command: 'cdpDisconnect' });
    this.setState('disconnected');
  }

  sendMouseEvent(params: Record<string, unknown>): void {
    this.send('Input.dispatchMouseEvent', params);
  }

  sendKeyEvent(params: Record<string, unknown>): void {
    this.send('Input.dispatchKeyEvent', params);
  }

  sendInsertText(text: string): void {
    this.send('Input.insertText', { text });
  }

  sendScroll(params: { x: number; y: number; deltaX: number; deltaY: number }): void {
    this.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: params.x,
      y: params.y,
      deltaX: params.deltaX,
      deltaY: params.deltaY,
    });
  }

  navigate(url: string): void {
    this.send('Page.navigate', { url });
  }

  private send(method: string, params: Record<string, unknown> = {}): void {
    const data = JSON.stringify({ id: this.msgId++, method, params });
    this.postToExtension({ command: 'cdpSend', data });
  }

  private setState(state: ConnectionState): void {
    if (this._state !== state) {
      log('setState:', this._state, '->', state);
      this._state = state;
      this.onStateChange(state);
    }
  }

  private postToExtension(message: Record<string, unknown>): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    builderModeVscodeApi?.postMessage(message as any);
  }
}
