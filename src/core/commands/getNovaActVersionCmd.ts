import * as vscode from 'vscode';

import logger from '../utils/logger';
import { getNovaActVersion } from '../utils/pythonUtils';

export async function getNovaActVersionCmd(context: vscode.ExtensionContext): Promise<void> {
  try {
    if (!context) {
      const error =
        'getNovaActVersion: Extension context not available for retrieving Nova Act version';
      logger.error(error);
      vscode.window.showErrorMessage(error);
    }

    getNovaActVersion().then((version) => {
      if (version) {
        vscode.window.showInformationMessage(`Nova Act version: ${version}`);
      } else {
        vscode.window.showWarningMessage('Nova Act is not installed in the current environment.');
      }
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Failed to get nova_act version: ${errorMessage}`);
  }
}
