// eslint-disable-next-line import/order
import type * as vscode from 'vscode';

import { BuilderModeProvider } from '../provider/builderModeProvider';
import { type ImportSource } from '../telemetry/events';
import logger from '../utils/logger';

export async function openBuilderMode(
  context: vscode.ExtensionContext,
  arg:
    | {
        initialContent?: string | string[];
        initialContentSource?: ImportSource;
        initialTab?: string;
      }
    | undefined
) {
  logger.log('Starting BuilderMode - preparing environment...');

  BuilderModeProvider.show(
    context,
    arg?.initialContent,
    arg?.initialContentSource,
    arg?.initialTab
  );
}
