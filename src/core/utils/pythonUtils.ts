import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import * as vscode from 'vscode';
import which from 'which';

import logger from './logger';

const execAsync = promisify(exec);

// Directory for Nova Act virtual environment
export const VENV_DIR = path.join(os.homedir(), '.nova-act-env');
// OS platform identifier (e.g., 'win32', 'darwin', 'linux')
export const PLATFORM = os.platform();

/**
 * Check if a given Python path points to a usable version (>= 3.10).
 * @param pythonPath Path to the Python executable
 * @returns true if usable, false otherwise
 */
export async function isPythonVersionUsable(pythonPath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`"${pythonPath}" --version`);
    if (!stdout) {
      return false;
    }

    const versionMatch = stdout.match(/(\d+)\.(\d+)\.(\d+)/);

    if (versionMatch === null) {
      return false;
    }

    // Ensure major and minor parts exist
    if (!versionMatch[1] || !versionMatch[2]) {
      return false;
    }

    const major = parseInt(versionMatch[1], 10);
    const minor = parseInt(versionMatch[2], 10);

    return major > 3 || (major === 3 && minor >= 10);
  } catch {
    return false;
  }
}

/**
 * Locate a usable Python interpreter by:
 * 1. Checking VS Code Python config
 * 2. Looking for `python3` in PATH
 * 3. Looking for `python` in PATH
 * Falls back to error if none found.
 * @returns Path to a usable Python executable
 */
export async function checkPython(): Promise<string> {
  const candidates: (string | undefined)[] = [
    vscode.workspace.getConfiguration('python').get<string>('defaultInterpreterPath'),
    (() => {
      try {
        return which.sync('python3');
      } catch {
        return undefined;
      }
    })(),
    (() => {
      try {
        return which.sync('python');
      } catch {
        return undefined;
      }
    })(),
  ];

  for (const pythonPath of candidates) {
    if (!pythonPath) continue;

    if (await isPythonVersionUsable(pythonPath)) {
      return pythonPath;
    }
  }
  const errMsg =
    '❌ Could not find a usable Python interpreter (>= 3.10). Please install Python or set default Python Interpreter in the IDE';
  showError(errMsg);
}

/**
 * Verify pip is available for the given Python executable.
 * @param pythonPath Path to Python executable
 */
export async function checkPip(pythonPath: string) {
  try {
    const { stdout } = await execAsync(`"${pythonPath}" -m pip --version`);
    if (!stdout.toLowerCase().includes('pip')) {
      const error = 'pip module not found in Python.';
      showError(error);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    showError(errorMessage);
  }
}

/**
 * Get installed Nova Act SDK version inside the venv.
 * @returns Version string if found, undefined otherwise
 */
export async function getNovaActVersion(): Promise<string | undefined> {
  const venvPythonPath = getPythonExecutablePath();
  if (!venvPythonPath) {
    return undefined;
  }

  try {
    const { stdout } = await execAsync(`"${venvPythonPath}" -m pip show nova_act`);
    const versionLine = stdout.split('\n').find((line) => line.trim().startsWith('Version:'));

    return versionLine ? versionLine.replace('Version:', '').trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get the Python executable path from the virtual environment.
 * Handles OS-specific paths (bin vs Scripts).
 * @returns Path to Python executable
 */
export function getPythonExecutablePath(): string {
  const platform = os.platform();
  if (platform === 'darwin' || platform === 'linux') {
    // macOS / Linux
    return path.join(VENV_DIR, 'bin', 'python');
  } else if (platform === 'win32') {
    // Windows
    return path.join(VENV_DIR, 'Scripts', 'python.exe');
  } else {
    const error = `Unsupported OS platform: ${platform}`;
    showError(error);
  }
}

/**
 * Show an error message in VS Code UI and log it.
 * Always throws to stop execution.
 * @param errorMsg Error message
 */
export function showError(errorMsg: string): never {
  vscode.window.showErrorMessage(errorMsg, { modal: true });
  logger.error(errorMsg);
  throw new Error(errorMsg);
}
