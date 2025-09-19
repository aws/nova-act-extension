import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { _getActionViewerWebviewContent } from '../pages/actionViewerPage';
import {
  type ActionData,
  type ActionGroup,
  type ActionViewerToExtensionMessage,
  type ExtensionToActionViewerMessage,
} from '../types/actionViewerMessages';
import { parseActionHtml } from '../utils/actionDataParser';
import {
  extractSessionAndActIds,
  extractSessionIdFromFolder,
  extractShortActId,
  findCorrespondingJsonFile,
  parseCallsJsonData,
  sortFilesByTimestamp,
} from '../utils/actionViewerUtils';

export type ActionViewerShowOptions = {
  context: vscode.ExtensionContext;
  type: 'file' | 'folder';
  path: string;
};

export class ActionViewerProvider {
  private static activePanels: Map<string, ActionViewerProvider> = new Map();
  private static panelCounter: number = 0;
  private readonly panel: vscode.WebviewPanel;

  private postMessageToWebview(message: ExtensionToActionViewerMessage): void {
    this.panel.webview.postMessage(message);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionContext: vscode.ExtensionContext,
    actionViewerFilePath?: string,
    actionViewerFolderPath?: string,
    panelId?: string
  ) {
    const extensionUri = extensionContext.extensionUri;
    this.panel = panel;

    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri],
    };
    this.panel.webview.html = _getActionViewerWebviewContent(this.panel.webview, extensionContext);

    // Listen for messages from the webview
    this.panel.webview.onDidReceiveMessage((message: ActionViewerToExtensionMessage): void => {
      if (message.type === 'ready') {
        if (actionViewerFilePath) {
          this.loadAndParseFile(actionViewerFilePath);
        } else if (actionViewerFolderPath) {
          this.loadAndParseFolderFiles(actionViewerFolderPath);
        }
      }
    });

    this.panel.onDidDispose(() => {
      if (panelId) {
        ActionViewerProvider.activePanels.delete(panelId);
      }
    });
  }

  private loadAndParseFile(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) {
        const errorMsg = `File does not exist: ${filePath}`;
        this.postMessageToWebview({
          type: 'actionData',
          filePath,
          data: null,
          error: errorMsg,
        });
        return;
      }

      const fileExtension = path.extname(filePath).toLowerCase();

      if (fileExtension === '.html' || fileExtension === '.htm') {
        this.loadAndParseHtmlFileWithJsonFallback(filePath);
      } else {
        const errorMsg = `Only HTML files are supported for single file viewing. File: ${filePath}`;
        this.postMessageToWebview({
          type: 'actionData',
          filePath,
          data: null,
          error: errorMsg,
        });
      }
    } catch (error) {
      const errorMsg = `Error loading file: ${String(error)}`;
      this.postMessageToWebview({
        type: 'actionData',
        filePath,
        data: null,
        error: errorMsg,
      });
      vscode.window.showErrorMessage(`Failed to load Action file: ${String(error)}`);
    }
  }

  private loadAndParseFolderFiles(folderPath: string): void {
    try {
      if (!fs.existsSync(folderPath)) {
        const errorMsg = `Folder does not exist: ${folderPath}`;
        this.postMessageToWebview({
          type: 'actionData',
          filePath: folderPath,
          data: null,
          error: errorMsg,
        });
        return;
      }

      const files: string[] = fs.readdirSync(folderPath);
      const callsJsonFiles: string[] = files
        .filter((file: string) => file.endsWith('_calls.json'))
        .map((file: string) => path.join(folderPath, file));

      if (callsJsonFiles.length === 0) {
        const errorMsg = `No valid Act Html/Json files found in folder: ${folderPath}`;
        this.postMessageToWebview({
          type: 'actionData',
          filePath: folderPath,
          data: null,
          error: errorMsg,
        });
        return;
      }

      const sortedFiles: string[] = sortFilesByTimestamp(callsJsonFiles);
      const combinedData: ActionData | null = this.combineCallsJsonFiles(sortedFiles, folderPath);
      this.setSessionPanelTitle(sortedFiles.length, combinedData);

      this.postMessageToWebview({
        type: 'actionData',
        filePath: folderPath,
        data: combinedData,
        error: combinedData ? undefined : 'Failed to parse combined JSON files',
      });
    } catch (error) {
      const errorMsg = `Error loading folder: ${String(error)}`;
      this.postMessageToWebview({
        type: 'actionData',
        filePath: folderPath,
        data: null,
        error: errorMsg,
      });
      vscode.window.showErrorMessage(`Failed to load Action folder: ${String(error)}`);
    }
  }

  private setSessionPanelTitle(actionCount: number, combinedData: ActionData | null): void {
    const totalSteps: number = combinedData?.actions
      ? combinedData.actions.reduce(
          (sum: number, action: ActionGroup) => sum + action.steps.length,
          0
        )
      : 0;
    this.panel.title = `Session: ${actionCount} actions, ${totalSteps} steps`;
  }

  private combineCallsJsonFiles(filePaths: string[], folderPath?: string): ActionData | null {
    try {
      const actions: ActionGroup[] = [];

      let _totalSteps: number = 0;
      let sessionCreatedTime: string | null = null;

      for (const filePath of filePaths) {
        const content = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(content);
        const parsedData: ActionData | null = parseCallsJsonData(jsonData, filePath, false);

        if (parsedData) {
          // Get timestamp from first step
          const firstStepTimestamp: string =
            parsedData.steps.length > 0 && parsedData.steps[0]
              ? parsedData.steps[0].timestamp
              : new Date().toISOString();

          // Track the earliest timestamp as session creation time
          if (!sessionCreatedTime || firstStepTimestamp < sessionCreatedTime) {
            sessionCreatedTime = firstStepTimestamp;
          }

          const actionGroup: ActionGroup = {
            actId: parsedData.actId,
            prompt: parsedData.prompt,
            fileName: path.basename(filePath),
            timestamp: firstStepTimestamp,
            steps: parsedData.steps,
          };

          actions.push(actionGroup);
          _totalSteps += parsedData.steps.length;
        }
      }

      // If no session creation time found from actions, use folder creation time
      if (!sessionCreatedTime && folderPath) {
        try {
          const folderStats = fs.statSync(folderPath);
          sessionCreatedTime = folderStats.birthtime.toISOString();
        } catch (_error) {
          // Fallback to current time if folder stats fail
          sessionCreatedTime = new Date().toISOString();
        }
      }

      // Extract session ID from folder path
      const sessionId: string | null = folderPath ? extractSessionIdFromFolder(folderPath) : null;

      const combinedActionData: ActionData = {
        actId: 'Session Viewer',
        prompt: 'Multiple actions in session',
        steps: [], // Empty for grouped view
        actions,
        isFolder: true,
        fileCount: filePaths.length,
        sessionCreatedTime,
        sessionId,
      };

      return combinedActionData;
    } catch (_error) {
      vscode.window.showErrorMessage(`Error combining JSON files: ${String(_error)}`);
      return null;
    }
  }

  private loadAndParseHtmlFileWithJsonFallback(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) {
        const errorMsg = `HTML file does not exist: ${filePath}`;
        this.postMessageToWebview({
          type: 'actionData',
          filePath,
          data: null,
          error: errorMsg,
        });
        return;
      }

      // First, try to find and parse corresponding JSON file
      const jsonFilePath: string | null = findCorrespondingJsonFile(filePath);

      if (jsonFilePath) {
        try {
          const content: string = fs.readFileSync(jsonFilePath, 'utf8');
          const jsonData: unknown[] = JSON.parse(content);
          const parsedData: ActionData | null = parseCallsJsonData(jsonData, jsonFilePath, false);

          if (parsedData) {
            // Extract session and act IDs from HTML file path for consistency
            const { sessionId, actId }: { sessionId: string | null; actId: string | null } =
              extractSessionAndActIds(filePath);

            const finalData: ActionData = {
              ...parsedData,
              sessionId: sessionId || parsedData.sessionId,
              actId: actId || parsedData.actId,
            };

            // Set panel title using JSON data
            const shortTitle: string = `act_${finalData.actId.slice(-4)}`;
            this.panel.title = shortTitle;

            this.postMessageToWebview({
              type: 'actionData',
              filePath,
              data: finalData,
              error: undefined,
            });
            return;
          }
        } catch (_jsonError) {
          // JSON parsing failed, fall back to HTML parsing
        }
      }

      // Fallback to HTML parsing if JSON file not found or parsing failed
      this.loadAndParseHtmlFile(filePath);
    } catch (error) {
      const errorMsg = `Error loading HTML file: ${String(error)}`;
      this.postMessageToWebview({
        type: 'actionData',
        filePath,
        data: null,
        error: errorMsg,
      });
      vscode.window.showErrorMessage(`Failed to load Action file: ${String(error)}`);
    }
  }

  private loadAndParseHtmlFile(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) {
        const errorMsg = `HTML file does not exist: ${filePath}`;
        this.postMessageToWebview({
          type: 'actionData',
          filePath,
          data: null,
          error: errorMsg,
        });
        return;
      }

      const content: string = fs.readFileSync(filePath, 'utf8');
      const shortTitle: string = extractShortActId(content);
      this.panel.title = shortTitle;
      const parsedData: ActionData | null = parseActionHtml(content);

      // Extract session and act IDs from file path
      const { sessionId, actId }: { sessionId: string | null; actId: string | null } =
        extractSessionAndActIds(filePath);

      // Create updated data with extracted IDs
      let finalData: ActionData | null = parsedData;
      if (parsedData) {
        finalData = {
          ...parsedData,
          sessionId,
          actId: actId || parsedData.actId,
        };
      }

      this.postMessageToWebview({
        type: 'actionData',
        filePath,
        data: finalData,
        error: finalData ? undefined : 'Failed to parse HTML content',
      });
    } catch (error) {
      const errorMsg = `Error loading HTML file: ${String(error)}`;
      this.postMessageToWebview({
        type: 'actionData',
        filePath,
        data: null,
        error: errorMsg,
      });
      vscode.window.showErrorMessage(`Failed to load Action file: ${String(error)}`);
    }
  }

  public static show(options: ActionViewerShowOptions): void {
    const { context }: { context: vscode.ExtensionContext } = options;

    ActionViewerProvider.panelCounter++;
    const panelId: string = `actionViewer_${ActionViewerProvider.panelCounter}`;
    const panelTitle: string = 'Loading...';

    // Create new panel in column 2
    const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
      'novaActionViewer',
      panelTitle,
      {
        viewColumn: vscode.ViewColumn.Two,
        preserveFocus: true,
      },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
      }
    );

    const filePath: string | undefined = options.type === 'file' ? options.path : undefined;
    const folderPath: string | undefined = options.type === 'folder' ? options.path : undefined;

    const provider: ActionViewerProvider = new ActionViewerProvider(
      panel,
      context,
      filePath,
      folderPath,
      panelId
    );
    ActionViewerProvider.activePanels.set(panelId, provider);
  }
}
