import * as vscode from 'vscode';

import { Commands, EXTENSION_ID, GlobalStateCommands, VSCodeCommands } from '../constants';
import { registerCommands } from './commands';
import { registerNovaActCodeLensProvider } from './integration/codeLensProvider';
import { copilotChatIntegration } from './integration/copilotChatIntegration';
import { installExtensionIntegration } from './integration/installExtesionIntegration';
import { SidebarProvider } from './provider/sidebarProvider';
import { TelemetryClient } from './telemetry/client';
import { InstallSource } from './telemetry/events';
import { getWalkthroughIdForIDE } from './utils/ideDetection';
import logger from './utils/logger';
import { convertErrorToString } from './utils/utils';

const registerTelemetryClient = async (context: vscode.ExtensionContext) => {
  const telemetryClient = TelemetryClient.getInstance();
  await telemetryClient.initialize(context);
  telemetryClient.captureExtensionActivated();
};

function shouldShowStatusBar(): boolean {
  const config = vscode.workspace.getConfiguration('novaAct');
  return config.get('showStatusBar', true) as boolean;
}

const registerStatusBar = (context: vscode.ExtensionContext) => {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(rocket) Nova Act';
  statusBarItem.tooltip = 'Nova Act Tools';
  statusBarItem.command = Commands.showMenu;

  if (shouldShowStatusBar()) {
    statusBarItem.show();
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('novaAct.showStatusBar')) {
        shouldShowStatusBar() ? statusBarItem.show() : statusBarItem.hide();
      }
    }),
    statusBarItem
  );
  return statusBarItem;
};

const registerAllSubscriptions = (context: vscode.ExtensionContext) => {
  context.subscriptions.push(logger);
  const sidebarProvider = new SidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(Commands.sidebar, sidebarProvider)
  );
  context.subscriptions.push(registerStatusBar(context));
  registerNovaActCodeLensProvider(context);
  context.subscriptions.push(installExtensionIntegration(context));
};

const updateExtensionInstalled = (context: vscode.ExtensionContext) => {
  const config = context.globalState;
  const extensionInstalled = config.get(GlobalStateCommands.isExtensionInstalled);
  if (!extensionInstalled) {
    config.update(GlobalStateCommands.isExtensionInstalled, true);
    const telemetryClient = TelemetryClient.getInstance();
    telemetryClient.captureExtensionInstalled(InstallSource.UNKNOWN);
  }
};

const triggerWalkthroughIfNeeded = (context: vscode.ExtensionContext) => {
  const hasShownWalkthrough = context.globalState.get(GlobalStateCommands.hasShownWalkthrough);
  if (!hasShownWalkthrough) {
    logger.log('First time activation - opening walkthrough');

    // Get the appropriate walkthrough ID based on the current IDE
    const walkthroughId = getWalkthroughIdForIDE();

    setTimeout(() => {
      vscode.commands.executeCommand(
        VSCodeCommands.openWalkthrough,
        `${EXTENSION_ID}#${walkthroughId}`
      );
      context.globalState.update(GlobalStateCommands.hasShownWalkthrough, true);
    }, 1500);
  }

  logger.log('Nova Act extension is now active!');
};

export async function bootstrap(context: vscode.ExtensionContext) {
  try {
    await registerTelemetryClient(context);
    registerAllSubscriptions(context);
    updateExtensionInstalled(context);
    registerCommands(context);
    copilotChatIntegration();
    triggerWalkthroughIfNeeded(context);
  } catch (error) {
    const errorMessage = `Bootstrap failed: ${convertErrorToString(error)}`;
    logger.error(errorMessage);
    const telemetryClient = TelemetryClient.getInstance();
    telemetryClient.captureExtensionHostError(errorMessage);
    // Re-throw so VS Code can surface activation failure
    throw error;
  }
}
