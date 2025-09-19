import * as vscode from 'vscode';

import { Commands, GlobalStateCommands } from '../../constants';
import { openBuilderMode } from '../commands/openBuilderMode';
import logger from '../utils/logger';

export function installExtensionIntegration(context: vscode.ExtensionContext) {
  logger.debug('Installing extension integration...');
  return vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
    if (document.languageId === 'python') {
      const text = document.getText();
      if (text.includes('from nova_act import NovaAct')) {
        const isExtensionInstalled = context.globalState.get(
          GlobalStateCommands.isExtensionInstalled
        );
        const hasShownNotification = context.globalState.get(
          GlobalStateCommands.hasShownInstallNotification
        );

        if (!isExtensionInstalled && !hasShownNotification) {
          vscode.window
            .showInformationMessage(
              'NovaAct import detected! Would you like to build workflow with comprehensive experience?',
              'Learn More', // Button 1
              'Show Builder Mode', // Button 3
              "Don't Show Again" // Button 2
            )
            .then((selection) => {
              if (selection === 'Learn More') {
                vscode.commands.executeCommand(Commands.openWalkthrough);
              } else if (selection === 'Show Builder Mode') {
                // Execute the command to start debugging
                openBuilderMode(context, {});
                vscode.window.showInformationMessage('Starting Builder Mode...');
              } else if (selection === "Don't Show Again") {
                // Remember user's preference
                context.globalState.update(GlobalStateCommands.hasShownInstallNotification, true);
              }
            });
        }
      }
    }
  });
}
