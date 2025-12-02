import * as vscode from 'vscode';

import { Commands } from '../../constants';

export const viewWorkflowDocumentationCmd = async () => {
  await vscode.commands.executeCommand(Commands.viewWorkflowDetails);
};
