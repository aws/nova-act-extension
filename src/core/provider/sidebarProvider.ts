import * as vscode from 'vscode';

import { VSCodeCommands } from '../../constants';
import { openBuilderMode } from '../commands/openBuilderMode';
import { getApiKey, setApiKey } from '../commands/setApiKeyCmd';
import { _getSidebarWebviewContent } from '../pages/sidebarPage';
import { TelemetryClient } from '../telemetry/client';
import {
  type ExtensionToSidebarMessage,
  type SidebarToExtensionMessage,
} from '../types/sidebarMessages';
import { IDE, detectIDE } from '../utils/ideDetection';
import logger from '../utils/logger';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private telemetryClient: TelemetryClient;
  private webviewView?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.telemetryClient = TelemetryClient.getInstance();
  }

  async resolveWebviewView(webviewView: vscode.WebviewView) {
    logger.debug('SidebarProvider.resolveWebviewView)()');
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = _getSidebarWebviewContent(
      webviewView.webview,
      vscode,
      this.context.extensionUri
    );

    await this.sendInitMessage();

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.sendInitMessage();
      }
    });

    // Message handler for messages from the sidebar webview
    webviewView.webview.onDidReceiveMessage(async (message: SidebarToExtensionMessage) => {
      logger.debug(`SidebarProvider: Received message from webview: ${message.command}`);

      try {
        switch (message.command) {
          case 'builderMode':
            try {
              // Hide the sidebar to give full screen to Builder Mode
              await vscode.commands.executeCommand(VSCodeCommands.closeSidebar);
              // Build Workflows
              openBuilderMode(this.context, {
                initialContent: message.template?.cells,
                initialTab: message.initialTab,
              });
            } catch (error) {
              logger.error(`Failed to execute builderMode commands: ${error}`);
            }
            break;
          case 'sendTelemetry': {
            this.telemetryClient.sendEvent(message);
            break;
          }
          case 'captureWebviewError':
            this.telemetryClient.captureWebviewError({
              errorMessage: message.errorMessage,
              webview: message.kind,
            });
            break;
          case 'openCopilotWithPrompt':
            try {
              if (!this.isCopilotAvailable()) {
                vscode.window.showWarningMessage(
                  'Make sure GitHub Copilot Chat extension is enabled to use script generation: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat'
                );
              }
              // Hide the sidebar to give full screen to Builder Mode
              await vscode.commands.executeCommand(VSCodeCommands.closeSidebar);
              // Open Copilot Chat with the prompt directly
              await vscode.commands.executeCommand('workbench.action.chat.open', {
                query: message.prompt,
              });
            } catch (error) {
              logger.error(`Failed to execute openCopilotWithPrompt commands: ${error}`);
              vscode.window.showErrorMessage(
                'Failed to open GitHub Copilot. Please ensure it is installed and enabled.'
              );
            }
            break;
          case 'setApiKey':
            await setApiKey(this.context);
            // Always refresh the sidebar to show current status (whether set or not)
            await this.sendInitMessage();
            break;
          case 'checkApiKeyStatus':
            await this.sendInitMessage();
            break;
          case 'openExternalUrl':
            try {
              await vscode.env.openExternal(vscode.Uri.parse(message.url));
            } catch (error) {
              logger.error(`Failed to open external URL: ${error}`);
            }
            break;

          default:
            // Exhaustiveness check - If you see a TypeScript error here, it means we are missing a case handler for a command type defined in SidebarToExtensionMessage
            const _exhaustiveCheck: never = message;
            logger.debug('Unhandled command type: ' + JSON.stringify(_exhaustiveCheck));
        }
      } catch (error) {
        logger.error(`Error handling sidebar message: ${error}`);
      }
    });
  }

  private isCopilotAvailable(): boolean {
    const legacyCopilot = vscode.extensions.getExtension('github.copilot');
    const unifiedCopilot = vscode.extensions.getExtension('github.copilot-chat');
    return !!(legacyCopilot?.isActive || unifiedCopilot?.isActive);
  }

  private async sendInitMessage() {
    if (!this.webviewView) {
      logger.debug('SidebarProvider: No webviewView available, skipping sendInitMessage');
      return;
    }

    try {
      const apiKey = await getApiKey(this.context);
      const currentIDE = detectIDE();

      const hasApiKey = !!apiKey && apiKey.trim().length > 0;
      const isVSCode = currentIDE === IDE.VSCODE;
      const initMessage: ExtensionToSidebarMessage = {
        type: 'init',
        hasApiKey,
        isVSCode,
      };

      this.webviewView.webview.postMessage(initMessage);
      logger.debug('SidebarProvider: Init message sent successfully');
    } catch (error) {
      logger.error(`SidebarProvider: Failed to check API key status: ${error}`);
      // Send false status on error
      const initMessage: ExtensionToSidebarMessage = {
        type: 'init',
        hasApiKey: false,
        isVSCode: false,
      };
      this.webviewView.webview.postMessage(initMessage);
    }
  }
}
