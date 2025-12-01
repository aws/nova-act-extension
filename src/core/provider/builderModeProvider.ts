import * as cp from 'child_process';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import * as vscode from 'vscode';

import { Commands, DEFAULT_BACKEND_WS_PORT } from '../../constants';
import { openActionViewer } from '../commands/openActionViewer';
import { getApiKey } from '../commands/setApiKeyCmd';
import { setApiKey } from '../commands/setApiKeyCmd';
import { updateOrInstallWheelCmd } from '../commands/updateOrIntallWheelCmd';
import { _getBuilderModeWebviewContent } from '../pages/builderModePage';
import { TelemetryClient } from '../telemetry/client';
import { FeatureName, ImportSource } from '../telemetry/events';
import { starterPackTemplate } from '../templates/templates';
import { type ChromeDevToolsTab, isChromeDevToolsTabsArray } from '../types/builder';
import {
  type BuilderModeToExtensionMessage,
  type ExtensionToBuilderModeMessage,
  type FileCommand,
  type InitMessage,
} from '../types/builderModeMessages';
import { isPortInUse } from '../utils/extensionHostUtils';
import logger from '../utils/logger';
import { splitPythonCode } from '../utils/splitPythonCode';
import { createWorkflowFiles, readFileContent } from '../utils/workflowFileUtils';
import {
  validateDeploymentFormat,
  validateHeadlessParameter,
  validateWorkflowNameInScript,
} from '../utils/workflowUtils';
import { NovaActCliProvider } from './novaActCliProvider';

let WS: typeof WebSocket;
if (typeof WebSocket === 'undefined') {
  WS = require('ws');
} else {
  WS = WebSocket;
}

export class BuilderModeProvider {
  private static currentPanel: BuilderModeProvider | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionContext: vscode.ExtensionContext;
  private pythonProcess: cp.ChildProcess | undefined;
  private pythonWs: InstanceType<typeof WS> | undefined;
  private cdtWs: InstanceType<typeof WS> | undefined;
  private novaActPath: string | undefined;
  private initialTab?: string;
  private novaActCliProvider: NovaActCliProvider;

  private telemetryClient: TelemetryClient;
  private themeChangeDisposable: vscode.Disposable | undefined;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionContext: vscode.ExtensionContext,
    init?: string | string[],
    initialTab?: string
  ) {
    logger.log('BuilderModeProvider.init()');
    this.extensionContext = extensionContext;
    this.initialTab = initialTab;
    this.novaActCliProvider = new NovaActCliProvider(extensionContext);
    const extensionUri = extensionContext.extensionUri;
    this.panel = panel;
    this.telemetryClient = TelemetryClient.getInstance();

    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri],
    };
    this.panel.webview.html = _getBuilderModeWebviewContent(this.panel.webview, extensionContext);

    // Cleanup any existing python process before starting a new one
    this.cleanPythonProcess();
    this.initializePythonProcess();

    const scriptToLoad = Array.isArray(init)
      ? init
      : typeof init === 'string'
        ? splitPythonCode(init)
        : this.getDefaultStarterScript();
    const initMessage: InitMessage = {
      type: 'init',
      content: scriptToLoad,
      initialTab: this.initialTab,
    };

    this.themeChangeDisposable = vscode.window.onDidChangeActiveColorTheme(() =>
      this.sendThemeToWebview()
    );

    this.panel.webview.onDidReceiveMessage(async (message: BuilderModeToExtensionMessage) => {
      switch (message.command) {
        case 'ready':
          this.postMessageToWebview(initMessage);
          this.sendThemeToWebview();
          break;
        case 'restartPythonProcess':
          this.cleanPythonProcess();
          this.initializePythonProcess(message.restart);
          break;
        case 'runPython':
          this.sendPythonCode(message);
          break;
        case 'fetchChromeDevToolsUrl':
          await this.handleFetchChromeDevToolsUrl(message);
          break;
        case 'openPythonFile':
          await this.openPythonFileDialog();
          break;
        case 'savePythonFile':
          await this.savePythonFileDialog(message);
          break;
        case 'stopExecution':
          this.pythonWs?.send(JSON.stringify({ cmd: 'STOP_EXECUTION' }));
          break;
        case 'sendTelemetry':
          this.telemetryClient.sendEvent(message);
          break;
        case 'restartPanel':
          BuilderModeProvider.dispose();
          setTimeout(() => BuilderModeProvider.show(extensionContext, message.content), 300);
          break;
        case 'showError':
          vscode.window.showErrorMessage(message.error);
          break;
        case 'showInfo':
          vscode.window.showInformationMessage(message.info);
          break;
        case 'captureWebviewError':
          this.telemetryClient.captureWebviewError({
            errorMessage: message.errorMessage,
            webview: message.kind,
          });
          break;
        case 'openActionViewer': {
          // Execute the openActionViewer command
          const filePath = message.htmlFilePath || message.actionViewerFilePath;
          const folderPath = message.actionViewerFolderPath;
          await openActionViewer(extensionContext, filePath, folderPath);
          break;
        }
        case 'setApiKey': {
          await setApiKey(extensionContext);
          break;
        }
        case 'getPreference': {
          if (!message.key || message.key.trim() === '') {
            logger.error('getPreference called without a key or value');
            break;
          }
          const storedValue = this.extensionContext.globalState.get<boolean>(message.key, false);
          this.postMessageToWebview({
            type: 'getPreferenceValue',
            key: message.key,
            value: storedValue,
          });
          break;
        }
        case 'setPreference': {
          if (!message.key || message.key.trim() === '' || !message.value) {
            logger.error('getPreference called without a key or value');
            break;
          }
          this.extensionContext.globalState.update(message.key, message.value);
          break;
        }

        case 'deployScript': {
          this.novaActCliProvider.handleDeployScript(
            message,
            this.panel.webview,
            readFileContent,
            createWorkflowFiles
          );
          break;
        }

        case 'validateDependencies': {
          this.novaActCliProvider.handleValidateDependencies(this.panel.webview);
          break;
        }

        case 'invokeRuntime': {
          this.novaActCliProvider.handleInvokeRuntime(message, this.panel.webview);
          break;
        }

        case 'listWorkflows': {
          const maxRetries = 3;
          let lastError: Error | null = null;

          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              const workflows = await this.novaActCliProvider.listWorkflows(message.region);
              this.postMessageToWebview({
                type: 'workflowListResult',
                workflows,
                error: null,
              });
              return;
            } catch (error) {
              lastError = error as Error;

              if (
                lastError.message.includes('Nova Act CLI not found') &&
                attempt < maxRetries - 1
              ) {
                const delay = 1000 * (attempt + 1);
                logger.debug(
                  `CLI not ready, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
              }

              break;
            }
          }

          logger.error(`Failed to list workflows after ${maxRetries} attempts: ${lastError}`);
          this.postMessageToWebview({
            type: 'workflowListResult',
            workflows: [],
            error: lastError?.message || 'Failed to load workflows',
          });
          break;
        }

        case 'setActiveWorkflow': {
          await this.novaActCliProvider.handleSetActiveWorkflow(message, this.panel.webview);
          break;
        }

        case 'validateAwsCredentials': {
          this.novaActCliProvider.handleValidateAwsCredentials(
            this.panel.webview,
            message.isRefresh
          );
          break;
        }

        case 'validateWorkflowScript': {
          await this.handleValidateWorkflowScript(message);
          break;
        }

        case 'applyConversion': {
          await this.handleApplyConversion(message);
          break;
        }

        case 'builderMode': {
          // Handle navigation to build-run tab with template loading
          if (message.template) {
            // Load template content
            const templateCells = message.template.cells || [];
            this.postMessageToWebview({
              type: 'init',
              content: templateCells,
              initialTab: message.initialTab,
            });
          } else if (message.initialTab) {
            // Just switch tabs without loading content
            this.postMessageToWebview({
              type: 'init',
              content: this.getDefaultStarterScript(),
              initialTab: message.initialTab,
            });
          }
          break;
        }

        case 'viewWorkflowDetails':
          await vscode.commands.executeCommand(Commands.viewWorkflowDetails);
          break;

        case 'viewIamPermissions':
          await vscode.commands.executeCommand(Commands.viewIamPermissions);
          break;

        case 'viewDeploymentDocumentation':
          await vscode.commands.executeCommand(Commands.viewDeploymentDocumentation);
          break;

        case 'viewRunDocumentation':
          await vscode.commands.executeCommand(Commands.viewRunDocumentation);
          break;

        case 'viewNovaActStepDetails':
          await vscode.commands.executeCommand(Commands.viewNovaActStepDetails);
          break;

        case 'checkApiKeyStatus': {
          const apiKey = await getApiKey(this.extensionContext);
          const hasApiKey = !!apiKey && apiKey.trim().length > 0;
          this.postMessageToWebview({
            type: 'apiKeyStatusResult',
            hasApiKey,
          });
          break;
        }

        case 'getApiKey': {
          const apiKey = await getApiKey(this.extensionContext);
          this.postMessageToWebview({
            type: 'apiKeyResult',
            apiKey: apiKey || null,
          });
          break;
        }

        case 'openExternalUrl':
          try {
            await vscode.env.openExternal(vscode.Uri.parse(message.url));
          } catch (error) {
            logger.error(`Failed to open external URL: ${error}`);
          }
          break;

        default:
          // Exhaustiveness check - If you see a TypeScript error here,
          // it means we are missing a case handler for a command type
          // defined in BuilderModeToExtensionMessage
          const _exhaustiveCheck: never = message;
          logger.error('Unhandled command type: ' + JSON.stringify(_exhaustiveCheck));
      }
    });

    this.panel.onDidDispose(() => {
      this.cleanup();
      BuilderModeProvider.currentPanel = undefined;
    });
  }

  private static async loadExistingPanel({
    currentPanel,
    initialContent,
    initialContentSource,
    initialTab,
  }: {
    currentPanel: BuilderModeProvider;
    initialContent?: string | string[];
    initialContentSource?: ImportSource;
    initialTab?: string;
  }) {
    currentPanel.panel.reveal(vscode.ViewColumn.One);

    if (initialContent === undefined && initialTab === undefined) {
      return;
    }

    const scriptToLoad = Array.isArray(initialContent)
      ? initialContent
      : typeof initialContent === 'string'
        ? splitPythonCode(initialContent)
        : currentPanel.getDefaultStarterScript();
    const initMessage: InitMessage = {
      type: 'init',
      content: scriptToLoad,
      initialTab,
    };
    currentPanel.postMessageToWebview(initMessage);

    if (initialContentSource !== undefined) {
      TelemetryClient.getInstance().captureScriptImported(initialContentSource);
    }
  }

  public static async show(
    extensionContext: vscode.ExtensionContext,
    initialContent?: string | string[],
    initialContentSource?: ImportSource,
    initialTab?: string
  ) {
    // If we already have builder mode initialized in the current panel, jump to it
    if (BuilderModeProvider.currentPanel) {
      this.loadExistingPanel({
        currentPanel: BuilderModeProvider.currentPanel,
        initialContent,
        initialContentSource,
        initialTab,
      });
      return;
    }

    // Get the configured WebSocket port
    const config = vscode.workspace.getConfiguration('novaAct');
    const wsPort = config.get<number>('websocketPort', DEFAULT_BACKEND_WS_PORT);

    // Before initializing builder mode, check if we already have a websocket backend running on the port
    if (await isPortInUse(wsPort)) {
      const action = await vscode.window.showWarningMessage(
        `Port ${wsPort} is already in use. This may be caused by another Builder Mode session. Please re-use or close the existing session. If there are no other active sessions, please follow the troubleshooting steps.`,
        'View Troubleshooting Steps'
      );
      if (action === 'View Troubleshooting Steps') {
        vscode.env.openExternal(
          vscode.Uri.parse(
            'https://github.com/aws/nova-act-extension/blob/main/README.md#troubleshooting'
          )
        );
      }
      return;
    }

    // Prepare the venv to update/install Nova Act
    await updateOrInstallWheelCmd();

    const panel = vscode.window.createWebviewPanel(
      'novaBuilderMode',
      'Nova Act Builder Mode',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    panel.iconPath = {
      light: vscode.Uri.joinPath(extensionContext.extensionUri, 'resources', 'logo', 'logo.svg'),
      dark: vscode.Uri.joinPath(extensionContext.extensionUri, 'resources', 'logo', 'logo.svg'),
    };
    BuilderModeProvider.currentPanel = new BuilderModeProvider(
      panel,
      extensionContext,
      initialContent,
      initialTab
    );

    const telemetryClient = TelemetryClient.getInstance();
    telemetryClient.captureFeatureActivated(FeatureName.BUILDER_MODE);
    if (initialContentSource !== undefined) {
      telemetryClient.captureScriptImported(initialContentSource);
    }
  }

  public static dispose() {
    if (BuilderModeProvider.currentPanel) {
      BuilderModeProvider.currentPanel.cleanup();
      BuilderModeProvider.currentPanel.panel.dispose();
      BuilderModeProvider.currentPanel = undefined;
    }
  }

  private getWebSocketPort(): number {
    const config = vscode.workspace.getConfiguration('novaAct');
    return config.get<number>('websocketPort', DEFAULT_BACKEND_WS_PORT);
  }

  public async cleanup() {
    this.themeChangeDisposable?.dispose();
    this.cleanPythonProcess();
    this.novaActCliProvider.dispose();
    if (
      this.cdtWs &&
      (this.cdtWs.readyState === WS.OPEN || this.cdtWs.readyState === WS.CONNECTING)
    )
      this.cdtWs.close();
    this.cdtWs = undefined;
  }

  private sendPythonCode(
    message: BuilderModeToExtensionMessage & { code: string; cellId: string }
  ) {
    if (!this.pythonWs || this.pythonWs.readyState !== WS.OPEN) {
      vscode.window.showErrorMessage('Python WebSocket is not connected');
      return;
    }

    this.pythonWs.send(JSON.stringify({ cmd: 'CELL_ID', cellId: message.cellId }));
    this.pythonWs.send(JSON.stringify({ cmd: 'CELL_CODE_START' }));
    for (const line of message.code.split('\n')) {
      this.pythonWs.send(JSON.stringify({ cmd: 'CELL_CODE_LINE', line }));
    }
    this.pythonWs.send(JSON.stringify({ cmd: 'CELL_CODE_END' }));
  }

  public postMessageToWebview(message: ExtensionToBuilderModeMessage) {
    this.panel.webview.postMessage(message);
  }

  private sendChromeDevToolsResponse(success: boolean, data?: ChromeDevToolsTab[], error?: string) {
    this.postMessageToWebview({ type: 'chromeDevToolsResponse', success, data, error });
  }

  private sendThemeToWebview() {
    this.postMessageToWebview({ type: 'theme', theme: this.getMonacoTheme() });
  }

  private async fetchChromeTabs(url: string): Promise<ChromeDevToolsTab[]> {
    const resp = await fetch(url);
    const data = await resp.json();
    if (!isChromeDevToolsTabsArray(data)) throw new Error('Invalid Chrome DevTools tabs response');
    return data;
  }

  private async fetchBrowserWebSocketUrl(url: string): Promise<string> {
    const resp = await fetch(url.replace('/json', '/json/version'));
    const data = await resp.json();
    if (!data.webSocketDebuggerUrl) throw new Error('Cannot get browser WebSocket debugger URL');
    return data.webSocketDebuggerUrl;
  }

  private connectToChromeWebSocket(browserWsUrl: string, devToolsJsonUrl: string) {
    this.waitForPortReady({ url: browserWsUrl })
      .then(() => {
        const ws = new WS(browserWsUrl);
        let msgId = 1;

        ws.onopen = () => {
          logger.debug('Connected to Chrome browser WebSocket');
          ws.send(
            JSON.stringify({
              id: msgId++,
              method: 'Target.setDiscoverTargets',
              params: { discover: true },
            })
          );
        };

        ws.onmessage = async (rawData) => {
          try {
            const msg = JSON.parse(rawData.data);
            if (msg.method !== 'Target.targetCreated') {
              return;
            }

            const targetInfo = msg.params.targetInfo;
            if (targetInfo.type !== 'page') {
              return;
            }

            if (
              targetInfo.url.startsWith('chrome://') ||
              targetInfo.url.startsWith('devtools://')
            ) {
              // Close the Chrome system tab by sending Target.closeTarget message
              ws.send(
                JSON.stringify({
                  id: msgId++,
                  method: 'Target.closeTarget',
                  params: { targetId: targetInfo.targetId },
                })
              );
              return;
            }

            logger.debug(
              `New page target created: ${targetInfo.url} with targetId: ${targetInfo.targetId}`
            );

            const tabs = await this.fetchChromeTabs(devToolsJsonUrl);
            const newTab = tabs.find((t) => t.id === targetInfo.targetId);
            // Jump to new tab
            if (newTab) {
              logger.debug(`Switching to new tab: ${newTab.title} (${newTab.url})`);
              this.sendChromeDevToolsResponse(true, [newTab]);
            }
          } catch (err) {
            logger.error('Error parsing Chrome WS message: ' + err);
          }
        };

        ws.onerror = (err) => {
          logger.error('Chrome WebSocket error: ' + err);
          this.sendChromeDevToolsResponse(false, undefined, 'Chrome WebSocket connection failed');
        };

        ws.onclose = () => logger.debug('Chrome WebSocket connection closed');

        this.cdtWs = ws;
      })
      .catch((err) =>
        vscode.window.showErrorMessage(`Failed to connect to backend: ${err.message}`)
      );
  }

  private async handleFetchChromeDevToolsUrl(
    message: BuilderModeToExtensionMessage & { url: string }
  ) {
    try {
      const parsedUrl = new URL(message.url);
      if (parsedUrl.protocol === 'http:' && parsedUrl.hostname !== 'localhost') {
        return this.sendChromeDevToolsResponse(false, undefined, 'Insecure transport not allowed');
      }

      const browserWsUrl = await this.fetchBrowserWebSocketUrl(message.url);
      this.connectToChromeWebSocket(browserWsUrl, message.url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Error fetching Chrome DevTools URL: ' + errorMessage);
      this.sendChromeDevToolsResponse(false, undefined, errorMessage);
    }
  }

  async setupNovaActEnvironment(wsPort: number): Promise<Record<string, string>> {
    const apiKey = await getApiKey(this.extensionContext);

    const envVars = {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      NOVA_ACT_WEBSOCKET_PORT: wsPort.toString(),
    } as Record<string, string>;

    if (apiKey) {
      envVars.NOVA_ACT_API_KEY = apiKey;
      logger.log('API key set in environment variables');
    } else {
      logger.log('No API key found in settings');
    }

    return envVars;
  }

  private async initializePythonProcess(restart: boolean = false): Promise<void> {
    logger.debug('initializePythonProcess start');

    const homeDir = os.homedir();
    let pythonPath: string;

    if (process.platform === 'win32') {
      pythonPath = path.join(homeDir, '.nova-act-env', 'Scripts', 'python.exe');
    } else {
      pythonPath = path.join(homeDir, '.nova-act-env', 'bin', 'python');
    }

    if (!fs.existsSync(pythonPath)) {
      vscode.window.showErrorMessage(`Python not found at ${pythonPath}`);
      return;
    }

    const backendScript = vscode.Uri.joinPath(
      this.extensionContext.extensionUri,
      'src',
      'scripts',
      'websocket_backend.py'
    );

    const wsPort = this.getWebSocketPort();
    const envVars = await this.setupNovaActEnvironment(wsPort);

    logger.log(`Starting Python WebSocket server on port ${wsPort}`);

    const py = cp.spawn(pythonPath, [backendScript.fsPath], {
      env: envVars,
    });

    // Store reference for cleanup
    this.pythonProcess = py;
    this.waitForPortReady({ port: wsPort })
      .then(() => {
        const ws = new WS(`ws://localhost:${wsPort}`);
        ws.onopen = () => {
          this.pythonWs = ws;
          if (restart) {
            this.postMessageToWebview({ type: 'pythonProcessReloaded' });
          }
        };
        ws.onmessage = (rawData) => {
          try {
            const message = JSON.parse(rawData.data);
            this.postMessageToWebview(message);
            if (message.data) {
              const hasThink = /think\s*\(/i.test(message.data);
              const hasAgent = /(?:>>?\s*)?agent[A-Za-z]+\s*\(/i.test(message.data);
              if (hasThink || hasAgent) {
                this.postMessageToWebview({
                  type: 'agentActivity',
                  data: message.data,
                  cellId: message.cellId,
                });
              }
            }
          } catch (error) {
            vscode.window.showErrorMessage(
              error instanceof Error ? error.message : 'Unknown error parsing WebSocket message'
            );
          }
        };
        ws.onerror = (error) =>
          vscode.window.showErrorMessage(
            error instanceof Error ? error.message : 'Unknown WebSocket error'
          );
      })
      .catch((err) =>
        vscode.window.showErrorMessage(`Failed to connect to backend: ${err.message}`)
      );
  }

  private async openPythonFileDialog() {
    const fileUris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: { 'Python files': ['py'] },
      title: 'Open Python File',
    });
    if (!fileUris?.[0]) return;

    try {
      const content = fs.readFileSync(fileUris[0].fsPath, 'utf8');
      const cells = splitPythonCode(content);
      // Join cells back with double newlines to preserve the splitting information
      const processedContent = cells.join('\n\n');
      this.postMessageToWebview({
        type: 'loadFile',
        content: processedContent,
        location: fileUris[0].fsPath,
      });
      this.telemetryClient.captureScriptImported(ImportSource.FILE);
    } catch (err) {
      vscode.window.showErrorMessage(`Error reading file: ${err}`);
    }
  }

  private async savePythonFileDialog(message: FileCommand) {
    if (message.command !== 'savePythonFile') {
      vscode.window.showErrorMessage('Cannot save: Not a save command');
      return;
    }

    const fileUri = await vscode.window.showSaveDialog({
      filters: { 'Python files': ['py'] },
      title: 'Save as Python File',
      defaultUri: vscode.Uri.parse(message.location ?? ''),
    });
    if (!fileUri) return;

    try {
      fs.writeFileSync(fileUri.fsPath, message.content, 'utf8');
      vscode.window.showInformationMessage(`File saved: ${fileUri.fsPath}`);
      this.telemetryClient.captureScriptExported({
        cellCount: message.cellCount,
        lineCount: message.lineCount,
      });
      this.postMessageToWebview({
        type: 'fileSaved',
        location: fileUri.fsPath,
      });
    } catch (err) {
      vscode.window.showErrorMessage(`Error saving file: ${err}`);
    }
  }

  private getMonacoTheme(): 'vs-dark' | 'vs-light' | 'hc-black' {
    const theme = vscode.window.activeColorTheme;
    switch (theme.kind) {
      case vscode.ColorThemeKind.Light:
        return 'vs-light';
      case vscode.ColorThemeKind.HighContrast:
        return 'hc-black';
      default:
        return 'vs-dark';
    }
  }

  public getDefaultStarterScript(): string[] {
    return starterPackTemplate.cells;
  }

  private async waitForPortReady({
    url,
    port,
    retries = 20,
    delay = 250,
  }: {
    url?: string;
    port?: number;
    retries?: number;
    delay?: number;
  } = {}): Promise<void> {
    const wsUrl = url ?? `ws://localhost:${port}`;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const testWs = new WS(wsUrl);
          testWs.onopen = () => {
            testWs.close();
            resolve();
          };
          testWs.onerror = reject;
        });
        return;
      } catch {
        await new Promise((res) => setTimeout(res, delay));
      }
    }
    throw new Error(`Backend at ${wsUrl} not ready after ${retries} attempts`);
  }

  public static get instance(): BuilderModeProvider | undefined {
    return BuilderModeProvider.currentPanel;
  }

  /**
   * Send API Key it to the Python backend if connected.
   * @param apiKey The new API key to use.
   */
  public updateApiKey(apiKey: string) {
    if (this.pythonWs?.readyState === WS.OPEN) {
      try {
        this.pythonWs.send(
          JSON.stringify({
            cmd: 'UPDATE_API_KEY',
            data: apiKey,
          })
        );
        logger.log('API key sent to Python backend via WebSocket');
      } catch (err) {
        logger.error(
          `Failed to send API key over WebSocket: ${err instanceof Error ? err.message : err}`
        );
      }
    } else {
      logger.log('Python WebSocket not connected; API key will be set when backend connects.');
    }
  }

  private async handleValidateDependencies(webview: vscode.Webview) {
    try {
      const docker = await this.novaActCliProvider.validateDocker();
      const novaActCLI = await this.novaActCliProvider.validateCli(this.novaActPath);
      const awsCredentials = await this.novaActCliProvider.validateAwsCredentials();

      const errors: string[] = [];
      if (!docker) errors.push('Docker not found or not running');
      if (!novaActCLI) errors.push('Nova Act CLI not found or invalid');
      if (!awsCredentials) errors.push('AWS credentials not configured');

      webview.postMessage({
        type: 'dependencyValidationResult',
        valid: errors.length === 0,
        errors,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Dependency validation failed: ${errorMessage}`);
      webview.postMessage({
        type: 'dependencyValidationResult',
        valid: false,
        errors: [`Validation error: ${errorMessage}`],
      });
    }
  }

  private async handleValidateAwsCredentials(
    webview: vscode.Webview,
    _isRefresh?: boolean
  ): Promise<void> {
    // Delegate to NovaActCliProvider
    await this.novaActCliProvider.handleValidateAwsCredentials(webview);
  }

  private async handleValidateWorkflowScript(
    message: BuilderModeToExtensionMessage & { filePath: string; agentName: string }
  ): Promise<void> {
    try {
      let scriptContent: string;
      try {
        scriptContent = fs.readFileSync(message.filePath, 'utf-8');
      } catch (readError) {
        this.postMessageToWebview({
          type: 'workflowScriptValidationResult',
          success: false,
          workflowNameWarning: '',
          headlessWarning: '',
          deploymentFormatWarning: '',
          error: `Could not read file: ${readError instanceof Error ? readError.message : String(readError)}`,
        });
        return;
      }

      const workflowNameWarning = validateWorkflowNameInScript(message.agentName, scriptContent);
      const headlessWarning = validateHeadlessParameter(scriptContent);
      const deploymentFormatWarning = validateDeploymentFormat(scriptContent);

      this.postMessageToWebview({
        type: 'workflowScriptValidationResult',
        success: true,
        workflowNameWarning,
        headlessWarning,
        deploymentFormatWarning,
      });
    } catch (error) {
      logger.error(
        `Workflow script validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      this.postMessageToWebview({
        type: 'workflowScriptValidationResult',
        success: false,
        workflowNameWarning: '',
        headlessWarning: '',
        deploymentFormatWarning: '',
        error: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  private async handleApplyConversion(
    message: BuilderModeToExtensionMessage & {
      filePath: string;
      convertedCode: string;
      agentName: string;
    }
  ): Promise<void> {
    try {
      const backupPath = `${message.filePath}.backup`;
      const originalContent = fs.readFileSync(message.filePath, 'utf-8');

      fs.writeFileSync(backupPath, originalContent, 'utf-8');
      fs.writeFileSync(message.filePath, message.convertedCode, 'utf-8');

      this.postMessageToWebview({
        type: 'conversionApplied',
        success: true,
        backupPath,
      });

      vscode.window.showInformationMessage(
        `Conversion applied successfully to ${message.filePath}. Backup saved to ${path.basename(backupPath)}`
      );

      // Retrigger validation to clear warnings if conversion fixed issues
      await this.handleValidateWorkflowScript({
        command: 'validateWorkflowScript',
        filePath: message.filePath,
        agentName: message.agentName,
      });
    } catch (error) {
      logger.error(
        `Failed to apply conversion: ${error instanceof Error ? error.message : String(error)}`
      );
      this.postMessageToWebview({
        type: 'conversionApplied',
        success: false,
        error: `Failed to apply conversion: ${error instanceof Error ? error.message : String(error)}`,
      });
      vscode.window.showErrorMessage('Failed to apply conversion');
    }
  }

  private async validateDocker(): Promise<boolean> {
    return await this.novaActCliProvider.validateDocker();
  }

  public cleanPythonProcess() {
    if (
      this.pythonWs &&
      (this.pythonWs.readyState === WS.OPEN || this.pythonWs.readyState === WS.CONNECTING)
    ) {
      this.pythonWs.close();
    }
    this.pythonWs = undefined;

    if (this.pythonProcess) this.pythonProcess.kill('SIGTERM');
    this.pythonProcess = undefined;
  }
}
