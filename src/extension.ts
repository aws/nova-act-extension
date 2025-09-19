// eslint-disable-next-line import/order
import type * as vscode from 'vscode';

import { bootstrap } from './core/bootstrap';
import { BuilderModeProvider } from './core/provider/builderModeProvider';
import { TelemetryClient } from './core/telemetry/client';
import { ExtensionDeactivateReason, SessionDeactivateReason } from './core/telemetry/events';
import logger from './core/utils/logger';

/**
 * The main activation function for the VS Code extension.
 * This function is called when your extension is activated.
 * @param context The extension context, which provides access to various VS Code APIs.
 */
export async function activate(context: vscode.ExtensionContext) {
  logger.setContext(context);
  logger.log('NovaAct VS Code Extension is now active!');
  await bootstrap(context);
}

/**
 * This function is called when your extension is deactivated.
 * Use it for any cleanup tasks if necessary (e.g., disposing of resources).
 */
export async function deactivate() {
  const telemetryClient = TelemetryClient.getInstance();
  await telemetryClient.endSession(SessionDeactivateReason.SHUTDOWN);
  await telemetryClient.captureExtensionDeactivated(ExtensionDeactivateReason.SHUTDOWN);
  await telemetryClient.dispose();

  BuilderModeProvider.dispose();
  logger.dispose();
  logger.debug('Nova Act extension deactivated - cleanup completed');
}
