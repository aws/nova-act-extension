import { execFile } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';
import * as vscode from 'vscode';

import logger from '../utils/logger';
import {
  VENV_DIR,
  checkPip,
  checkPython,
  getNovaActVersion,
  getPythonExecutablePath,
  showError,
} from '../utils/pythonUtils';

// execFile (no shell): the interpreter path (user-controllable via the
// python.defaultInterpreterPath setting, returned by checkPython) and every
// argument are a literal argv vector, never parsed by a shell (CWE-78).
const execFileAsync = promisify(execFile);

export async function updateOrInstallWheelCmd(): Promise<void> {
  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'NovaAct Setup',
      cancellable: false,
    },
    async (progress) => {
      try {
        logger.log('Checking NovaAct environment setup...');
        progress.report({ increment: 0, message: '🚀 Initializing...' });

        // Step 1: Python checks
        progress.report({ increment: 10, message: '🔍 Checking Python...' });
        const pythonPath = await checkPython();
        progress.report({ increment: 10, message: `✅ Python found: ${pythonPath}` });

        // Step 2: pip check
        progress.report({ increment: 10, message: '🔍 Checking pip...' });
        await checkPip(pythonPath);
        progress.report({ increment: 10, message: '✅ pip found' });

        // Step 3: Create venv if missing
        try {
          if (!fs.existsSync(VENV_DIR)) {
            progress.report({ message: '🏗️ Creating virtual environment...' });
            await execFileAsync(pythonPath, ['-m', 'venv', VENV_DIR]);
            progress.report({ increment: 10, message: '✅ Virtual environment created' });
          } else {
            progress.report({ increment: 10, message: '✅ Virtual environment exists' });
          }
        } catch (err) {
          const errorMsg = `❌ Failed to create virtual environment: ${err}`;
          showError(errorMsg);
        }

        progress.report({ message: '💻 Checking operating system...' });
        const venvPythonPath = getPythonExecutablePath();
        progress.report({ increment: 10, message: '💻 Got compatible operating system...' });

        // Verify the Python executable exists
        if (!fs.existsSync(venvPythonPath)) {
          const errorMsg = `Virtual environment Python not found at ${venvPythonPath}. Environment may be corrupted.`;
          showError(errorMsg);
        }

        // Step 4: Install nova-act from PyPI
        progress.report({ message: '⬇️ Installing NovaAct...' });
        await installNovaActFromPyPI(venvPythonPath, progress);
        progress.report({ increment: 10, message: '📦 NovaAct installed' });

        // Step 5: Install websockets
        progress.report({ message: '🔌 Installing websockets...' });
        await execFileAsync(venvPythonPath, ['-m', 'pip', 'install', 'websockets', '--upgrade']);
        progress.report({ increment: 5, message: '🔌 Websockets installed' });

        // Step 5.5: Install botocore[crt] for AWS login support
        progress.report({ message: '🔐 Installing AWS CRT for login support...' });
        await execFileAsync(venvPythonPath, ['-m', 'pip', 'install', 'botocore[crt]', '--upgrade']);
        progress.report({ increment: 5, message: '🔐 AWS CRT installed' });

        // Step 6: Install Playwright
        progress.report({ message: '🌐 Installing Playwright...' });
        const playwrightArgs = ['-m', 'playwright', 'install', 'chromium'];

        // Only use --with-deps if Ubuntu/Debian
        if (fs.existsSync('/etc/debian_version')) {
          playwrightArgs.splice(3, 0, '--with-deps');
        }
        await execFileAsync(venvPythonPath, playwrightArgs);

        progress.report({ increment: 10, message: '🎭 Playwright installed' });

        // Step 7: Finalize setup
        progress.report({ increment: 5, message: '⚙️ Finalizing setup...' });
        // Set the env var on this process. The previous darwin/linux branch shelled
        // out `export NOVA_ACT_PLAYWRIGHT_INSTALL=1`, which is a no-op (the variable
        // dies with the child shell) as well as the last remaining shell call here.
        process.env.NOVA_ACT_PLAYWRIGHT_INSTALL = '1';

        progress.report({ increment: 100, message: '🎉 Setup complete!' });

        const version = await getNovaActVersion();
        if (version) {
          progress.report({ increment: 100, message: `Installed nova_act version: ${version}` });
        }

        // Brief delay to show completion message before progress bar disappears
        await new Promise((resolve) => setTimeout(resolve, 1000));

        logger.log('NovaAct environment setup completed successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showError(`NovaAct setup failed: ${errorMessage}`);
      }
    }
  );
}

async function installNovaActFromPyPI(
  venvPythonPath: string,
  progress: vscode.Progress<{ message?: string; increment?: number }>
): Promise<void> {
  logger.log('Attempting to install nova_act[cli] from PyPI');

  try {
    await execFileAsync(venvPythonPath, [
      '-m',
      'pip',
      'install',
      'nova_act[cli]>=3.0.5.0',
      'boto3>=1.42.1',
      'botocore>=1.42.1',
      '--upgrade',
    ]);
    logger.log('Successfully installed nova_act[cli]');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.log(`[cli] installation failed: ${errorMessage}`);
    logger.log('Falling back to nova_act without [cli] extra');
    progress.report({ message: '⚠️ Retrying without CLI extras...' });

    await execFileAsync(venvPythonPath, [
      '-m',
      'pip',
      'install',
      'nova_act>=3.0.5.0',
      'boto3>=1.42.1',
      'botocore>=1.42.1',
      '--upgrade',
    ]);
    logger.log('Successfully installed nova_act (base package)');
  }
}
