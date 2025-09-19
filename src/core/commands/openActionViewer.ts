import * as vscode from 'vscode';

import { ActionViewerProvider } from '../provider/actionViewerProvider';
import logger from '../utils/logger';

export async function openActionViewer(
  context: vscode.ExtensionContext,
  actionViewerFilePath?: string,
  actionViewerFolderPath?: string
): Promise<void> {
  try {
    let filePath: string | undefined = actionViewerFilePath;
    let folderPath: string | undefined = actionViewerFolderPath;

    // If no file or folder path provided, show picker
    if (!filePath && !folderPath) {
      const choice: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(
        [
          { label: 'Select File', description: 'Open a single act file' },
          { label: 'Select Folder', description: 'Open all act files in a session folder' },
        ],
        { title: 'Action Viewer - Choose input type' }
      );

      if (!choice) {
        logger.log('[openActionViewer] No choice selected, cancelling');
        return;
      }

      if (choice.label === 'Select File') {
        const fileUri: vscode.Uri[] | undefined = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: {
            'Action Files': ['html', 'htm'],
            'HTML Files': ['html', 'htm'],
          },
          title: 'Select Action File',
        });

        if (!fileUri || fileUri.length === 0) {
          logger.log('[openActionViewer] No file selected, cancelling');
          return;
        }

        filePath = fileUri[0]?.fsPath;
        if (!filePath) {
          logger.log('[openActionViewer] Invalid file selection, cancelling');
          return;
        }
      } else {
        const folderUri: vscode.Uri[] | undefined = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          title: 'Select Folder with Action Files',
        });

        if (!folderUri || folderUri.length === 0) {
          logger.log('[openActionViewer] No folder selected, cancelling');
          return;
        }

        folderPath = folderUri[0]?.fsPath;
        if (!folderPath) {
          logger.log('[openActionViewer] Invalid folder selection, cancelling');
          return;
        }
      }
    }

    if (filePath) {
      logger.log(`[openActionViewer] Opening Action Viewer for file: ${filePath}`);
      ActionViewerProvider.show({
        context,
        type: 'file',
        path: filePath,
      });
    } else if (folderPath) {
      logger.log(`[openActionViewer] Opening Action Viewer for folder: ${folderPath}`);
      ActionViewerProvider.show({
        context,
        type: 'folder',
        path: folderPath,
      });
    }
  } catch (error: unknown) {
    const errorMessage: string = String(error);
    logger.error(`[openActionViewer] Error: ${errorMessage}`);
    vscode.window.showErrorMessage(`Failed to open Action Viewer: ${errorMessage}`);
  }
}
