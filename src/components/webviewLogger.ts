// Webview-safe logger that doesn't depend on VS Code API
/* eslint-disable no-console */
export class WebviewLogger {
  debug(str: string) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[nova-act-extension]', str);
    }
  }

  log(str: string) {
    console.log('[nova-act-extension]', str);
  }

  error(str: string | Error) {
    const errorMessage = str instanceof Error ? str.message : str;
    console.error('[nova-act-extension]', errorMessage);
  }

  trace(str: string, ...args: unknown[]) {
    const message = args.length > 0 ? `${str} ${args.join(' ')}` : str;
    console.trace('[nova-act-extension]', message);
  }
}

export default new WebviewLogger();
