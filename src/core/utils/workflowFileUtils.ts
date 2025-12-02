// Node.js-only workflow file utilities (backend only)
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

export const readFileContent = (filePath: string): string => {
  if (!filePath.endsWith('.py')) {
    throw new Error('File must be a Python file (.py extension).');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf8');
};

export const createWorkflowFiles = async (
  name: string,
  content: string,
  workspaceDir?: string
): Promise<string> => {
  const baseDir =
    workspaceDir || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
  const workflowDir = path.join(baseDir, 'workflows', name);

  fs.mkdirSync(workflowDir, { recursive: true });

  const scriptPath = path.join(workflowDir, 'main.py');
  fs.writeFileSync(scriptPath, content, 'utf8');

  return workflowDir;
};
