import { type ActionViewerToExtensionMessage } from '../types/actionViewerMessages';
import { type BuilderModeToExtensionMessage } from '../types/builderModeMessages';
import { type CommonToExtensionMessage } from '../types/commonMessages';
import { type SidebarToExtensionMessage } from '../types/sidebarMessages';

interface VsCodeApi {
  postMessage: (message: unknown) => void;
  setState: <T extends Record<string, unknown> | undefined>(newState: T) => T;
  getState: () => Record<string, unknown> | undefined;
}

/**
 * Acquire the VS Code API once.
 * In webview context, this will be the real VS Code API.
 * In test context, setup.ts provides a mock via global.acquireVsCodeApi.
 */
const vscodeApi: VsCodeApi = acquireVsCodeApi();

/**
 * Creates a typed wrapper around the VS Code API
 * @template T The message type this API can send
 */
function createTypedVscodeApi<T>() {
  return {
    ...vscodeApi,
    postMessage: (message: T) => vscodeApi.postMessage(message),
  };
}

// APIs specific to each webview/provider
export const actionViewerVscodeApi = createTypedVscodeApi<ActionViewerToExtensionMessage>();
export const sidebarVscodeApi = createTypedVscodeApi<SidebarToExtensionMessage>();
export const builderModeVscodeApi = createTypedVscodeApi<BuilderModeToExtensionMessage>();
export const commonWebviewVscodeApi = createTypedVscodeApi<CommonToExtensionMessage>();
