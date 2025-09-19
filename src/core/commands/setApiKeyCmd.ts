import * as vscode from 'vscode';

import { NOVA_ACT_API_KEY } from '../../constants';
import { BuilderModeProvider } from '../provider/builderModeProvider';
import logger from '../utils/logger';

/**
 * Sets the API key in VS Code's secret storage
 * @returns Promise<boolean> - true if API key was successfully set, false otherwise
 */
export async function setApiKey(context?: vscode.ExtensionContext): Promise<boolean> {
  logger.debug('setApiKey: Function called');

  const apiKey = await vscode.window.showInputBox({
    prompt: 'Enter your Nova Act API key',
    password: true,
    placeHolder: 'Your Nova Act API key will be stored securely',
    validateInput: (value: string) => {
      const trimmed = value.trim();
      if (!value || trimmed.length === 0) {
        return 'API key cannot be empty';
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (trimmed.length !== 36 || !uuidRegex.test(trimmed)) {
        return 'API key must be 36 characters long and a valid UUID';
      }

      return null;
    },
  });

  logger.debug(
    `setApiKey: User input received - hasValue: ${!!apiKey}, length: ${apiKey?.length || 0}`
  );

  if (apiKey && context) {
    logger.debug('setApiKey: Attempting to store API key in secret storage');
    try {
      await context.secrets.store(NOVA_ACT_API_KEY, apiKey);
      const apiSetKey = await context.secrets.get(NOVA_ACT_API_KEY);

      logger.debug(
        `setApiKey: API key stored successfully - verification length: ${apiSetKey?.length || 0}`
      );
      vscode.window.showInformationMessage('API key has been set successfully');

      // If BuilderModeProvider is active, update it with the new API key. Otherwise we will set it when initializing.
      const provider = BuilderModeProvider.instance;
      if (provider) {
        provider.updateApiKey(apiKey);
      } else {
        logger.log('BuilderModeProvider not active; We will set the API key when we initialize.');
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`setApiKey: Failed to set API key: ${errorMessage}`);
      vscode.window.showErrorMessage(`Failed to set API key: ${errorMessage}`);
      return false;
    }
  } else if (apiKey && !context) {
    logger.debug('setApiKey: API key provided but no context available');
    vscode.window.showErrorMessage('Extension context not available for storing API key');
    return false;
  }

  // User cancelled or no API key provided
  logger.debug('setApiKey: User cancelled or no API key provided');
  return false;
}

/**
 * Gets the API key from VS Code's secret storage
 */
export async function getApiKey(context?: vscode.ExtensionContext): Promise<string | undefined> {
  logger.debug('getApiKey: Function called');

  if (!context) {
    logger.error('getApiKey: Extension context not available for retrieving API key');
    return undefined;
  }

  try {
    logger.debug('getApiKey: Attempting to retrieve API key from secret storage');
    const apiKey = await context.secrets.get(NOVA_ACT_API_KEY);
    logger.debug(
      `getApiKey: Retrieved API key - hasValue: ${!!apiKey}, length: ${apiKey?.length || 0}`
    );
    return apiKey;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`getApiKey: Failed to get API key: ${errorMessage}`);
    return undefined;
  }
}
