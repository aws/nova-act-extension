import * as vscode from 'vscode';

import { Commands } from '../../constants';
import logger from '../utils/logger';

/**
 * CodeLens provider for Nova Act scripts
 */
export class NovaActCodeLensProvider implements vscode.CodeLensProvider {
  private codeLenses: vscode.CodeLens[] = [];
  private regex: RegExp;
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor() {
    this.regex = /NovaAct\(/g;
    logger.log('NovaActCodeLensProvider constructor called with regex: ' + this.regex);

    // Refresh code lenses when there are script changes
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === 'python') {
        this._onDidChangeCodeLenses.fire();
      }
    });
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    if (document.languageId !== 'python') {
      return [];
    }

    this.codeLenses = [];
    const text = document.getText();

    // Check if it is a Nova Act script based on import statements
    if (!text.includes('from nova_act import NovaAct') && !text.includes('import nova_act')) {
      return [];
    }

    let matches;
    while ((matches = this.regex.exec(text)) !== null) {
      const line = document.lineAt(document.positionAt(matches.index).line);
      const indexOf = line.text.indexOf(matches[0]);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));

      if (range) {
        // Integrated "View step details" using code lens
        this.codeLenses.push(
          new vscode.CodeLens(range, {
            title: '📝 View details',
            tooltip: 'View details about Nova Act',
            command: Commands.viewNovaActStepDetails,
            arguments: ['NovaAct'],
          })
        );

        // Integrated "Builder mode" using code lens
        this.codeLenses.push(
          new vscode.CodeLens(range, {
            title: '🏗️ Builder mode',
            tooltip: 'Open interactive script builder interface',
            command: Commands.showBuilderMode,
            arguments: [{ initialContent: text }],
          })
        );
      }
    }

    return this.codeLenses;
  }
}

/**
 * Register CodeLens provider
 */
export function registerNovaActCodeLensProvider(context: vscode.ExtensionContext): void {
  logger.log('Registering NovaAct CodeLens provider');
  const codeLensProvider = new NovaActCodeLensProvider();

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: 'python', scheme: 'file' },
      codeLensProvider
    )
  );

  // Register commands used by code lens
  context.subscriptions.push(
    vscode.commands.registerCommand(Commands.viewNovaActStepDetails, () => {
      logger.log('Opening NovaAct documentation panel');
      const panel = vscode.window.createWebviewPanel(
        'novaActDetails',
        'NovaAct Details',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );

      panel.webview.html = getStepDetailsHtml();
    })
  );
}

/**
 * Webview HTML to display NovaAct class details
 */
function getStepDetailsHtml(): string {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NovaAct Details</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-editor-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
                line-height: 1.6;
            }
            .header {
                font-size: 1.8em;
                font-weight: bold;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid var(--vscode-textLink-foreground);
                color: var(--vscode-textLink-foreground);
            }
            .class-description {
                background-color: var(--vscode-textCodeBlock-background);
                padding: 20px;
                border-radius: 6px;
                margin-bottom: 25px;
                border-left: 4px solid var(--vscode-textLink-foreground);
            }
            .section {
                margin-bottom: 25px;
            }
            .section-title {
                font-weight: bold;
                font-size: 1.3em;
                margin-bottom: 15px;
                color: var(--vscode-textLink-foreground);
            }
            .code-block {
                background-color: var(--vscode-textCodeBlock-background);
                padding: 15px;
                border-radius: 4px;
                font-family: var(--vscode-editor-font-family);
                margin: 10px 0;
                border-left: 3px solid var(--vscode-textLink-foreground);
                overflow-x: auto;
            }
            .code-block pre {
                margin: 0;
                padding: 0;
                background: none;
                border: none;
                font-family: var(--vscode-editor-font-family);
                font-size: 0.9em;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            .code-block code {
                font-family: var(--vscode-editor-font-family);
                font-size: 0.9em;
                background: none;
                padding: 0;
                border: none;
            }
            .attribute-item, .method-item {
                margin-bottom: 12px;
                padding: 10px;
                background-color: var(--vscode-editor-lineHighlightBackground);
                border-radius: 4px;
            }
            .attribute-name, .method-name {
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
            }
            .parameter-section {
                margin-bottom: 20px;
            }
            .parameter-item {
                margin-bottom: 15px;
                padding: 12px;
                background-color: var(--vscode-inputValidation-infoBackground);
                border-radius: 4px;
                border-left: 3px solid var(--vscode-inputValidation-infoBorder);
            }
            .parameter-name {
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
            }
            .parameter-type {
                font-style: italic;
                color: var(--vscode-descriptionForeground);
            }
        </style>
    </head>
    <body>
        <div class="header">NovaAct Class Documentation</div>
        
        <div class="class-description">
            <p><strong>NovaAct</strong> is a client for interacting with the Nova Act Agent that enables web browser automation through natural language commands.</p>
        </div>

        <div class="section">
            <div class="section-title">Basic Usage Example</div>
            <div class="code-block">
                <pre><code>from nova_act import NovaAct
n = NovaAct(starting_page="https://nova.amazon.com/act")
n.start()
n.act("Get information about today's featured article")</code></pre>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Key Attributes</div>
            <div class="attribute-item">
                <span class="attribute-name">started:</span> <span class="parameter-type">bool</span><br>
                Whether the browser has been launched
            </div>
            <div class="attribute-item">
                <span class="attribute-name">page:</span> <span class="parameter-type">playwright.Page</span><br>
                The playwright Page object for actuation
            </div>
            <div class="attribute-item">
                <span class="attribute-name">pages:</span> <span class="parameter-type">list[playwright.Page]</span><br>
                All playwright Pages available in Browser
            </div>
            <div class="attribute-item">
                <span class="attribute-name">dispatcher:</span> <span class="parameter-type">Dispatcher</span><br>
                Component for sending act prompts to the Browser
            </div>
        </div>

        <div class="section">
            <div class="section-title">Main Methods</div>
            <div class="method-item">
                <span class="method-name">start():</span> Starts the client
            </div>
            <div class="method-item">
                <span class="method-name">act(command):</span> Actuates a natural language command in the web browser
            </div>
            <div class="method-item">
                <span class="method-name">stop():</span> Stops the client
            </div>
            <div class="method-item">
                <span class="method-name">get_page(i):</span> Gets a specific playwright page by its index in the browser context
            </div>
        </div>

        <div class="section">
            <div class="section-title">Key Parameters</div>
            <div class="parameter-section">
                <div class="parameter-item">
                    <span class="parameter-name">starting_page:</span> <span class="parameter-type">str</span><br>
                    Starting web page for the browser window
                </div>
                <div class="parameter-item">
                    <span class="parameter-name">headless:</span> <span class="parameter-type">bool</span> (default: False)<br>
                    Whether to launch the Playwright browser in headless mode
                </div>
                <div class="parameter-item">
                    <span class="parameter-name">screen_width/screen_height:</span> <span class="parameter-type">int</span><br>
                    Screen dimensions (width: 1536-2304, height: 864-1296)
                </div>
                <div class="parameter-item">
                    <span class="parameter-name">nova_act_api_key:</span> <span class="parameter-type">str</span><br>
                    API key for interacting with NovaAct
                </div>
                <div class="parameter-item">
                    <span class="parameter-name">user_data_dir:</span> <span class="parameter-type">str, optional</span><br>
                    Path to Chrome data storage (cookies, cache, etc.)
                </div>
                <div class="parameter-item">
                    <span class="parameter-name">clone_user_data_dir:</span> <span class="parameter-type">bool</span> (default: True)<br>
                    Make a copy of user_data_dir into a temp dir for each instance
                </div>
                <div class="parameter-item">
                    <span class="parameter-name">record_video:</span> <span class="parameter-type">bool</span> (default: False)<br>
                    Whether to record video of browser actions
                </div>
                <div class="parameter-item">
                    <span class="parameter-name">chrome_channel:</span> <span class="parameter-type">str, optional</span><br>
                    Browser channel to use (e.g., "chromium", "chrome-beta", "msedge")
                </div>
                <div class="parameter-item">
                    <span class="parameter-name">proxy:</span> <span class="parameter-type">dict[str, str], optional</span><br>
                    Proxy configuration with 'server', 'username', and 'password' keys
                </div>
                <div class="parameter-item">
                    <span class="parameter-name">boto_session:</span> <span class="parameter-type">Session, optional</span><br>
                    A boto3 session for AWS IAM-based authentication
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Usage Examples</div>
            <div class="code-block">
                <pre><code># Basic usage
with NovaAct(starting_page="https://example.com") as nova:
    nova.act("click the login button")
    nova.act("enter username 'user@example.com'")
    nova.act("click submit")</code></pre>
            </div>
            <div class="code-block">
                <pre><code># With configuration
nova = NovaAct(
    starting_page="https://shop.com",
    headless=False,
    record_video=True,
    screen_width=1920,
    screen_height=1080
)
nova.start()
nova.act("search for 'wireless headphones'")
nova.stop()</code></pre>
            </div>
        </div>
    </body>
    </html>`;
}
