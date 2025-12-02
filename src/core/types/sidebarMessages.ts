// Sidebar webview communication types
import { type Template } from './builder';
import { type CommonToExtensionMessage } from './commonMessages';

/* -------------------------------------------------------------------------- */
/*                Messages FROM sidebar webview TO extension               */
/* -------------------------------------------------------------------------- */
export const TAB_NAMES = {
  AUTHENTICATE: 'authenticate',
  BUILD: 'build',
  DEPLOY: 'deploy',
  RUN_WORKFLOWS: 'runWorkflows',
} as const;

export type TabName = (typeof TAB_NAMES)[keyof typeof TAB_NAMES];

export interface BuilderModeCommand {
  command: 'builderMode';
  template?: Template;
  initialTab?: TabName;
}

export interface OpenCopilotCommand {
  command: 'openCopilotWithPrompt';
  prompt: string;
}

export interface SetApiKeyCommand {
  command: 'setApiKey';
}

export interface CheckApiKeyStatusCommand {
  command: 'checkApiKeyStatus';
}

export interface OpenExternalUrlCommand {
  command: 'openExternalUrl';
  url: string;
}

// Add more message types as needed
export type SidebarToExtensionMessage =
  | CommonToExtensionMessage
  | BuilderModeCommand
  | OpenCopilotCommand
  | SetApiKeyCommand
  | CheckApiKeyStatusCommand
  | OpenExternalUrlCommand;

/* -------------------------------------------------------------------------- */
/*                Messages FROM extension TO sidebar webview               */
/* -------------------------------------------------------------------------- */
export interface SidebarInitMessage {
  type: 'init';
  hasApiKey: boolean;
  isVSCode: boolean;
}

// Add more message types as needed
export type ExtensionToSidebarMessage = SidebarInitMessage;
