import * as vscode from 'vscode';

import { EXTENSION_ID, VSCodeCommands } from '../../constants';
import { IDE, detectIDE, getWalkthroughIdForIDE } from '../utils/ideDetection';

export const openWalkthroughsCmd = async () => {
  // Get the appropriate walkthrough ID based on the current IDE
  const walkthroughId = getWalkthroughIdForIDE();
  const currentIDE = detectIDE();

  // Handle Cursor which doesn't support walkthroughs
  if (currentIDE === IDE.CURSOR) {
    vscode.window
      .showInformationMessage(
        'Nova Act extension has been installed! To learn how to use it, check out our README.',
        'Take me to README',
        'Dismiss'
      )
      .then((selection) => {
        if (selection === 'Take me to README') {
          vscode.env.openExternal(
            vscode.Uri.parse('https://github.com/aws/nova-act-extension/blob/main/README.md')
          );
        }
      });
    return;
  }

  await vscode.commands.executeCommand(
    VSCodeCommands.openWalkthrough,
    `${EXTENSION_ID}#${walkthroughId}`
  );
};
