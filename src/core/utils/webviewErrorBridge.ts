import { type WebviewKind } from '../telemetry/events';
import { type WebviewErrorMessage } from '../types/commonMessages';
import { concatMessage, convertErrorToString } from './utils';
import { commonWebviewVscodeApi } from './vscodeApi';

/** Known-noisy browser warnings to ignore */
function shouldIgnoreError(message: string): boolean {
  const ignoredPatterns = [
    // ResizeObserver
    /ResizeObserver loop.*undelivered notifications/i,
    /ResizeObserver loop limit exceeded/i,

    // Passive event listener perf hints
    /Non-passive event listener/i,

    // Aborted fetches (from AbortController on dispose/navigation)
    /\bAbortError\b/i,
    /The user aborted a request/i,
    /The operation was aborted/i,
  ];

  return ignoredPatterns.some((pattern) => pattern.test(message));
}

export function reportWebviewError({
  errorMessage,
  kind,
}: {
  errorMessage: string;
  kind: WebviewKind;
}) {
  const payload: WebviewErrorMessage = {
    command: 'captureWebviewError',
    errorMessage,
    kind,
  };
  commonWebviewVscodeApi.postMessage(payload);
}

/**
 * Install global error hooks to catch unhandled errors and promise rejections from the webview window
 */
export function installGlobalErrorHooks(kind: WebviewKind) {
  window.addEventListener('error', (e: Event) => {
    if (!(e instanceof ErrorEvent)) return;
    if (!e.error && !e.message) return;
    const message = convertErrorToString(e);

    if (shouldIgnoreError(message)) {
      return;
    }

    const messageConcatenated = concatMessage(message);

    const errorMessage = `window.error: ${messageConcatenated}`;
    reportWebviewError({ errorMessage, kind });
  });

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const message = convertErrorToString(e);
    if (shouldIgnoreError(message)) {
      return;
    }

    const messageConcatenated = concatMessage(message);

    const errorMessage = `unhandledrejection: ${messageConcatenated}`;
    reportWebviewError({ errorMessage, kind });
  });
}
