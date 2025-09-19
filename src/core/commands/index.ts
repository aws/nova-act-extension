import * as vscode from 'vscode';

import { Commands, VSCodeCommands } from '../../constants';
import { TelemetryClient } from '../telemetry/client';
import { type ImportSource } from '../telemetry/events';
import { concatMessage, convertErrorToString } from '../utils/utils';
import { getNovaActVersionCmd } from './getNovaActVersionCmd';
import { openActionViewer } from './openActionViewer';
import { openBuilderMode } from './openBuilderMode';
import { openWalkthroughsCmd } from './openWalkthroughCmd';
import { setApiKey } from './setApiKeyCmd';
import { updateOrInstallWheelCmd } from './updateOrIntallWheelCmd';

type VSCommandHandler = Parameters<typeof vscode.commands.registerCommand>[1];

interface NovaActMenuItem extends vscode.QuickPickItem {
  action: string;
}

async function showNovaActMenu() {
  const items: NovaActMenuItem[] = [
    {
      label: '$(sidebar-expand) Open Sidebar',
      description: 'Open Nova Act sidebar panel',
      action: 'openSidebar',
    },
    {
      label: '$(play) Builder Mode',
      description: 'Open Nova Act Builder Mode',
      action: 'builderMode',
    },
    {
      label: '$(key) Set API Key',
      description: 'Configure your Nova Act API key',
      action: 'setApiKey',
    },
    {
      label: '$(question) Walkthrough',
      description: 'Open Nova Act walkthrough guide',
      action: 'walkthrough',
    },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a Nova Act action',
    title: 'Nova Act Tools',
  });

  if (selected) {
    switch (selected.action) {
      case 'openSidebar':
        await vscode.commands.executeCommand(Commands.sidebar);
        break;
      case 'builderMode':
        await vscode.commands.executeCommand(Commands.showBuilderMode);
        break;
      case 'setApiKey':
        await vscode.commands.executeCommand(Commands.setApiKey);
        break;
      case 'walkthrough':
        await vscode.commands.executeCommand(Commands.openWalkthrough);
        break;
    }
  }
}

/**
 * Wraps the command handler to catch and log errors to telemetry.
 */
function registerCommandWrapped(
  context: vscode.ExtensionContext,
  command: string,
  handler: VSCommandHandler
) {
  const telemetryClient = TelemetryClient.getInstance();
  const wrapped: VSCommandHandler = async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (err) {
      const msg = convertErrorToString(err);
      const messageConcatenated = concatMessage(msg);
      const errorMessage = `Error executing command ${command}: ${messageConcatenated}`;
      telemetryClient.captureExtensionHostError(errorMessage);
      // Re-throw so VS Code surfaces it in the dev console/callers if needed
      throw err;
    }
  };

  const registeredCommandDisposable = vscode.commands.registerCommand(command, wrapped);
  context.subscriptions.push(registeredCommandDisposable);
}

export function registerCommands(context: vscode.ExtensionContext) {
  registerCommandWrapped(
    context,
    Commands.showBuilderMode,
    (arg: { initialContent?: string; initialContentSource?: ImportSource } | undefined) =>
      openBuilderMode(context, arg)
  );
  registerCommandWrapped(context, Commands.updateOrInstallWheel, async () => {
    await updateOrInstallWheelCmd();
  });

  registerCommandWrapped(context, Commands.setApiKey, async () => {
    await setApiKey(context);
  });

  registerCommandWrapped(context, Commands.openWalkthrough, async () => {
    await openWalkthroughsCmd();
  });

  // Command to show the Nova Act menu (triggered by status bar)
  registerCommandWrapped(context, Commands.showMenu, async () => {
    await showNovaActMenu();
  });

  // Command to directly open the sidebar
  registerCommandWrapped(context, Commands.sidebar, async () => {
    await vscode.commands.executeCommand(VSCodeCommands.activitybar);
  });

  registerCommandWrapped(
    context,
    Commands.openActionViewer,
    async (actionViewerFilePath?: string, actionViewerFolderPath?: string) => {
      await openActionViewer(context, actionViewerFilePath, actionViewerFolderPath);
    }
  );

  registerCommandWrapped(context, Commands.getNovaActVersion, async () => {
    await getNovaActVersionCmd(context);
  });
}

// Export API key functions for use in other modules
export { getApiKey, setApiKey } from './setApiKeyCmd';
