import type * as vscodeTypes from '../utils/vscodeTypes';

export function _getSidebarWebviewContent(
  webview: vscodeTypes.Webview,
  vscode: vscodeTypes.VSCode,
  extensionUri: vscodeTypes.Uri
) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const reactUri = isDevelopment
    ? 'http://localhost:3000/Sidebar.bundle.js'
    : webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'Sidebar.bundle.js'));

  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body>
            <div id="root"></div>
            <script src="${reactUri}"></script>
        </body>
        </html>`;
}
