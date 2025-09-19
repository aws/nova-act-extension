export const EVENTS = {
  EXTENSION: {
    INSTALLED: 'extension.installed',
    ACTIVATED: 'extension.activated',
    DEACTIVATED: 'extension.deactivated',
  },
  SESSION: {
    STARTED: 'session.started',
    ENDED: 'session.ended',
  },
  FEATURE: {
    ACTIVATED: 'feature.activated',
  },
  CHAT: {
    MESSAGE: 'chat.message',
  },
  SCRIPT: {
    LOADED_TEMPLATE: 'script.loaded_template',
    IMPORTED: 'script.imported',
    EXPORTED: 'script.exported',
  },
  EDITOR: {
    CELLS_ADDED: 'editor.cells.added',
    CELLS_DELETED: 'editor.cells.deleted',
    RUN_CELL_STARTED: 'editor.run.cell.started',
    RUN_CELL_COMPLETED: 'editor.run.cell.completed',
    RUN_CELL_FAILED: 'editor.run.cell.failed',
    RUN_CELL_ABORTED: 'editor.run.cell.aborted',
    RUN_ALL_STARTED: 'editor.run.all.started',
    RUN_ALL_COMPLETED: 'editor.run.all.completed',
  },
  ERROR: {
    WEBVIEW: 'error.webview',
    EXT_HOST: 'error.extension_host',
  },
} as const;

type Groups = typeof EVENTS;
export type EventName = {
  [K in keyof Groups]: Groups[K][keyof Groups[K]];
}[keyof Groups];

export enum InstallSource {
  MARKETPLACE = 'marketplace',
  VSIX = 'vsix',
  UNKNOWN = 'unknown',
}

export enum FeatureName {
  BUILDER_MODE = 'BUILDER_MODE',
  COPILOT_CHAT = 'COPILOT_CHAT',
}

export enum ImportSource {
  FILE = 'file',
  COPILOT = 'copilot',
  UNKNOWN = 'unknown',
}

export enum ExtensionDeactivateReason {
  SHUTDOWN = 'shutdown',
  ERROR = 'error',
}

export enum SessionDeactivateReason {
  IDLE = 'idle',
  SHUTDOWN = 'shutdown',
  ERROR = 'error',
}

export enum CopilotChatCommand {
  DEFAULT = 'default',
  LEARN = 'learn',
  SHOPPING = 'shopping',
  EXTRACT = 'extract',
  SEARCH = 'search',
  QA_TESTS = 'qa',
  FORM_FILLING = 'formfilling',
}

export enum WebviewKind {
  SIDEBAR = 'sidebar',
  BUILDER = 'builder',
  ACTION_VIEWER = 'actionViewer',
}

export type EventPayloadMap = {
  [EVENTS.EXTENSION.INSTALLED]: { install_source: InstallSource };
  [EVENTS.EXTENSION.ACTIVATED]: {};
  [EVENTS.EXTENSION.DEACTIVATED]: { reason: ExtensionDeactivateReason };

  [EVENTS.SESSION.STARTED]: {};
  [EVENTS.SESSION.ENDED]: { reason: SessionDeactivateReason; session_duration_ms: number };

  [EVENTS.FEATURE.ACTIVATED]: { feature: FeatureName };

  [EVENTS.SCRIPT.LOADED_TEMPLATE]: { template_id: string; template_name: string };
  [EVENTS.SCRIPT.IMPORTED]: { source: ImportSource };
  [EVENTS.SCRIPT.EXPORTED]: { cell_count: number; line_count: number };

  [EVENTS.EDITOR.CELLS_ADDED]: { count: number };
  [EVENTS.EDITOR.CELLS_DELETED]: { count: number };

  [EVENTS.EDITOR.RUN_CELL_STARTED]: {
    run_id: string;
    cell_id: string;
    line_count: number;
    act_call_count: number;
  };
  [EVENTS.EDITOR.RUN_CELL_COMPLETED]: {
    run_id: string;
    cell_id: string;
    duration_ms: number;
    line_count: number;
    act_call_count: number;
  };
  [EVENTS.EDITOR.RUN_CELL_FAILED]: {
    run_id: string;
    cell_id: string;
    duration_ms: number;
    line_count: number;
    act_call_count: number;
    error_message?: string;
  };
  [EVENTS.EDITOR.RUN_CELL_ABORTED]: {
    run_id: string;
    cell_id: string;
    line_count: number;
    duration_ms: number;
    act_call_count: number;
  };

  [EVENTS.EDITOR.RUN_ALL_STARTED]: {
    run_id: string;
    cell_count: number;
    line_count: number;
    act_call_count: number;
    cell_ids: string[];
  };
  [EVENTS.EDITOR.RUN_ALL_COMPLETED]: {
    run_id: string;
    duration_ms: number;
    cell_count: number;
    line_count: number;
    act_call_count: number;
    succeeded: number;
    failed: number;
    aborted: number;
    cell_ids: string[];
  };

  [EVENTS.CHAT.MESSAGE]: { command: CopilotChatCommand };

  [EVENTS.ERROR.WEBVIEW]: { error_message: string; webview: WebviewKind };
  [EVENTS.ERROR.EXT_HOST]: { error_message: string };
};

export type EventProperties<N extends EventName> = EventPayloadMap[N];

export type TelemetryEvent = {
  [E in EventName]: { eventName: E; properties: EventProperties<E> };
}[EventName];

export function isEventName(x: string): x is EventName {
  return Object.values(EVENTS).some((group) => Object.values(group).includes(x as never));
}

export function isLifeCycleEvent(eventName: EventName): boolean {
  return (
    eventName === EVENTS.SESSION.STARTED ||
    eventName === EVENTS.SESSION.ENDED ||
    eventName === EVENTS.EXTENSION.ACTIVATED ||
    eventName === EVENTS.EXTENSION.DEACTIVATED
  );
}
