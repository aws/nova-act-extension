// Builder Mode webview communication types
import { type ChromeDevToolsTab } from './builder';
import { type CommonToExtensionMessage } from './commonMessages';

/* -------------------------------------------------------------------------- */
/*             Messages FROM builder mode webview TO extension                */
/* -------------------------------------------------------------------------- */
export interface RunPythonCommand {
  command: 'runPython';
  code: string;
  cellId: string;
}

export interface StopExecutionCommand {
  command: 'stopExecution';
}

export interface FetchDevToolsCommand {
  command: 'fetchChromeDevToolsUrl';
  url: string;
}

interface OpenPythonFileCommand {
  command: 'openPythonFile';
}

interface SetApiKeyCommand {
  command: 'setApiKey';
}

interface SavePythonFileCommand {
  command: 'savePythonFile';
  content: string;
  cellCount: number;
  lineCount: number;
  location?: string;
}

export type FileCommand = OpenPythonFileCommand | SavePythonFileCommand;

export interface ShowErrorCommand {
  command: 'showError';
  error: string;
}

export interface ShowInfoCommand {
  command: 'showInfo';
  info: string;
}

export interface RestartPanelCommand {
  command: 'restartPanel';
  content: string[];
}

export interface ReadyCommand {
  command: 'ready';
}

export interface OpenActionViewerCommand {
  command: 'openActionViewer';
  htmlFilePath?: string;
  actionViewerFilePath?: string;
  actionViewerFolderPath?: string;
}

export type BuilderModeToExtensionMessage =
  | CommonToExtensionMessage
  | RunPythonCommand
  | FetchDevToolsCommand
  | FileCommand
  | ShowErrorCommand
  | ShowInfoCommand
  | StopExecutionCommand
  | RestartPanelCommand
  | SetApiKeyCommand
  | ReadyCommand
  | OpenActionViewerCommand;

/* -------------------------------------------------------------------------- */
/*             Messages FROM extension TO builder mode webview                */
/* -------------------------------------------------------------------------- */
export interface AgentActivity {
  type: 'agentActivity';
  data: string;
  cellId: string;
}

export interface InitMessage {
  type: 'init';
  content: string[];
}

export interface CellExecutionMessage {
  type: 'stdout' | 'stderr';
  data: string;
  cellId: string;
  success?: boolean;
}

export type CellCompletionStatus = 'completed' | 'failed' | 'aborted';

export type NovaActStatus = 'started' | 'stopped';

export interface CellEndMessage {
  type: 'cell_end';
  cellId: string;
  success: boolean;
  completionStatus: CellCompletionStatus;
  novaActStatus: NovaActStatus;
}

export interface LoadFileMessage {
  type: 'loadFile';
  content: string;
  location: string;
}

export interface FileSavedMessage {
  type: 'fileSaved';
  location: string;
}

export interface ChromeDevToolsResponseMessage {
  type: 'chromeDevToolsResponse';
  success: boolean;
  data?: ChromeDevToolsTab[];
  error?: string;
}

export interface ThemeMessage {
  type: 'theme';
  theme: 'vs-dark' | 'vs-light' | 'hc-black';
}

export type ExtensionToBuilderModeMessage =
  | InitMessage
  | CellExecutionMessage
  | CellEndMessage
  | LoadFileMessage
  | FileSavedMessage
  | ChromeDevToolsResponseMessage
  | AgentActivity
  | ThemeMessage;
