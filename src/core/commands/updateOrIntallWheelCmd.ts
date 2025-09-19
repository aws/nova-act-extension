import { exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';
import * as vscode from 'vscode';

import logger from '../utils/logger';
import {
  PLATFORM,
  VENV_DIR,
  checkPip,
  checkPython,
  getNovaActVersion,
  getPythonExecutablePath,
  showError,
} from '../utils/pythonUtils';

const execAsync = promisify(exec);

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
            await execAsync(`"${pythonPath}" -m venv "${VENV_DIR}"`);
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

        // Step 4: Install nova-act
        progress.report({ message: '⬇️ Installing NovaAct...' });
        await execAsync(`"${venvPythonPath}" -m pip install nova_act --upgrade`);
        progress.report({ increment: 10, message: '📦 NovaAct installed' });

        // Step 5: Install Playwright
        progress.report({ message: '🌐 Installing Playwright...' });
        let installCmd = `"${venvPythonPath}" -m playwright install chromium`;

        // Only use --with-deps if Ubuntu/Debian
        if (fs.existsSync('/etc/debian_version')) {
          installCmd = `"${venvPythonPath}" -m playwright install --with-deps chromium`;
        }
        await execAsync(installCmd);

        progress.report({ increment: 10, message: '🎭 Playwright installed' });

        // Step 6: Finalize setup
        progress.report({ increment: 5, message: '⚙️ Finalizing setup...' });
        try {
          if (PLATFORM === 'darwin' || PLATFORM === 'linux') {
            await execAsync(`export NOVA_ACT_PLAYWRIGHT_INSTALL=1`);
          } else if (PLATFORM === 'win32') {
            process.env.NOVA_ACT_PLAYWRIGHT_INSTALL = '1';
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          showError(errorMessage);
        }

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
