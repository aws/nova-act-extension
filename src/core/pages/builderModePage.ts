import * as vscode from 'vscode';

export function _getBuilderModeWebviewContent(
  webview: vscode.Webview,
  context: vscode.ExtensionContext
): string {
  const isDev = context.extensionMode === vscode.ExtensionMode.Development;
  const extensionUri = context.extensionUri;

  // If it's dev mode, we link to the localhost bundle so we get HMR
  const reactScriptUri = isDev
    ? 'http://localhost:3000/BuilderMode.bundle.js'
    : webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'BuilderMode.bundle.js'));

  // Build CSP directives
  const csp = {
    'default-src': ["'none'"],

    'script-src': [
      'https://chrome-devtools-frontend.appspot.com',
      webview.cspSource,
      'https://unpkg.com', // Monaco Editor CDN
      "'unsafe-eval'", // Required for Monaco and React dev mode
      "'unsafe-inline'", // Required for inline scripts
      isDev && 'http://localhost:3000', // Dev server bundle
    ],

    'style-src': [
      'https://chrome-devtools-frontend.appspot.com',
      webview.cspSource,
      'https://unpkg.com', // Monaco Editor styles
      "'unsafe-inline'", // Required for inline styles and Monaco
    ],

    'img-src': ['https://chrome-devtools-frontend.appspot.com'],

    'font-src': [
      webview.cspSource,
      'https://unpkg.com', // Monaco Editor fonts
    ],

    'connect-src': [
      'https://chrome-devtools-frontend.appspot.com',
      'https://unpkg.com', // Monaco assets
      isDev && 'http://localhost:3000', // Dev server HTTP
      isDev && 'ws://localhost:3000', // HMR WebSocket
    ],

    'worker-src': ['blob:', 'https://unpkg.com'], // Web workers for Monaco to allow language services (e.g. syntax highlighting)

    'frame-src': [
      'https://chrome-devtools-frontend.appspot.com', // To frame browser from Chrome DevTools
    ],
  };

  // Build CSP string
  const cspString = Object.entries(csp)
    .map(([directive, sources]) => {
      const validSources = sources.filter(Boolean);
      return validSources.length > 0 ? `${directive} ${validSources.join(' ')}` : null;
    })
    .filter(Boolean)
    .join('; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="${cspString}" />
    <title>Nova Act Workflow Builder</title>
</head>
<body>
    <div id="root"></div>
    <script src="${reactScriptUri}"></script>
</body>
</html>`;
}
