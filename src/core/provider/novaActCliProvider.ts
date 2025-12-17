/* eslint-disable import/order */
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { getApiKey } from '../commands/setApiKeyCmd';
import logger from '../utils/logger';
import { VENV_DIR, showError } from '../utils/pythonUtils';

interface WorkflowInfo {
  name: string;
}

export class NovaActCliProvider {
  private novaActPath: string | undefined;
  private extensionContext: vscode.ExtensionContext;
  private activeProcesses: Set<cp.ChildProcess> = new Set();
  private isDisposed: boolean = false;
  private activeWorkflowName: string | null = null;
  private executionBuffers: Map<string, string> = new Map();
  private executingWorkflows: Set<string> = new Set();

  constructor(extensionContext: vscode.ExtensionContext, novaActPath?: string) {
    this.extensionContext = extensionContext;
    this.novaActPath = novaActPath;

    // Initialize CLI path automatically
    this.initializeCliPath();
  }

  private generateCliPaths(): string[] {
    const paths: string[] = [];
    const homeDir = os.homedir();

    // Add extension's own venv path first (highest priority)
    if (process.platform === 'win32') {
      paths.push(path.join(homeDir, '.nova-act-env', 'Scripts', 'act.exe'));
    } else {
      paths.push(path.join(homeDir, '.nova-act-env', 'bin', 'act'));
    }

    // Try to find Python versions in mise installations
    const miseDir = path.join(homeDir, '.local/share/mise/installs/python');
    if (fs.existsSync(miseDir)) {
      try {
        const pythonVersions = fs.readdirSync(miseDir);
        for (const version of pythonVersions) {
          paths.push(path.join(miseDir, version, 'bin/act'));
        }
      } catch (_error) {
        // Ignore errors reading mise directory
      }
    }

    // Add other common paths
    paths.push(path.join(homeDir, '.local/bin/act'), '/usr/local/bin/act');

    // Add platform-specific paths
    if (process.platform === 'darwin') {
      paths.push('/opt/homebrew/bin/act');
    } else if (process.platform === 'win32') {
      paths.push(path.join(homeDir, 'AppData/Local/Programs/Python/Scripts/act.exe'));
      paths.push('C:/Program Files/Python/Scripts/act.exe');
    }

    return paths;
  }

  private async initializeCliPath(): Promise<void> {
    try {
      // First check VS Code settings (highest priority)
      const configuredPath = this.getConfiguredCliPath();
      if (configuredPath && (await this.validateCliPath(configuredPath))) {
        return;
      }

      // Then check common paths
      const commonPaths = this.generateCliPaths();
      for (const novaActPath of commonPaths) {
        if (fs.existsSync(novaActPath) && (await this.validateCliPath(novaActPath))) {
          return;
        }
      }

      // Fallback to which command
      const whichPath = await this.getWhichPath();
      if (whichPath && (await this.validateCliPath(whichPath))) {
        return;
      }

      throw new Error('Nova Act CLI not found');
    } catch (_error) {
      showError(
        `Nova Act CLI not found. Please install it in ${VENV_DIR} via: pip install nova-act[cli]\n\nOr configure a custom path to the Nova Act CLI in VS Code settings: novaAct.cliPath`
      );
    }
  }

  private getConfiguredCliPath(): string | undefined {
    const config = vscode.workspace.getConfiguration('novaAct');
    const cliPath = config.get<string>('cliPath');
    return cliPath && cliPath.trim() ? cliPath.trim() : undefined;
  }

  private async validateCliPath(cliPath: string): Promise<boolean> {
    try {
      if (await this.validateCli(cliPath)) {
        this.novaActPath = cliPath;
        logger.debug(`Found and validated act at: ${this.novaActPath}`);
        this.showCliFoundNotification();
        return true;
      }
    } catch (validationError) {
      logger.debug(`Nova Act CLI at ${cliPath} failed validation: ${validationError}`);
    }
    return false;
  }

  private async getWhichPath(): Promise<string | undefined> {
    try {
      return await new Promise<string>((resolve, reject) => {
        cp.exec('which act', { env: process.env }, (error, stdout, _stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout.trim());
          }
        });
      });
    } catch {
      return undefined;
    }
  }

  private showCliFoundNotification(): void {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: '🎯 Act CLI Found',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: `Using Act CLI at: ${this.novaActPath}` });
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    );
  }

  async createEnhancedEnvironment(): Promise<Record<string, string>> {
    // Filter out undefined values from process.env
    const enhancedEnv: Record<string, string> = {};
    Object.entries(process.env).forEach(([key, value]) => {
      if (value !== undefined) {
        enhancedEnv[key] = value;
      }
    });

    const apiKey = await getApiKey(this.extensionContext);

    if (apiKey) {
      enhancedEnv.NOVA_ACT_API_KEY = apiKey;
    }

    return enhancedEnv;
  }

  setNovaActPath(path: string): void {
    this.novaActPath = path;
  }

  getNovaActPath(): string | undefined {
    return this.novaActPath;
  }

  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    logger.debug(
      `Disposing NovaActCliProvider, killing ${this.activeProcesses.size} active processes`
    );
    this.isDisposed = true;

    const processesToKill = Array.from(this.activeProcesses);
    this.activeProcesses.clear();

    for (const process of processesToKill) {
      try {
        process.kill('SIGTERM');

        setTimeout(() => {
          try {
            process.kill('SIGKILL');
          } catch (_error) {
            // Process already dead, ignore
          }
        }, 5000);
      } catch (error) {
        logger.error(`Failed to kill process: ${error}`);
      }
    }
  }

  async validateDocker(): Promise<boolean> {
    return await this.validateCommand('docker --version');
  }

  async validateCli(cliPath?: string): Promise<boolean> {
    const pathToValidate = cliPath || this.novaActPath;
    if (!pathToValidate) return false;
    return await this.validateCommand(`"${pathToValidate}" --version`);
  }

  private async validateCommand(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      cp.exec(command, { timeout: 10000 }, (error, _stdout, _stderr) => {
        resolve(!error);
      });
    });
  }

  async executeNovaActCommand(args: string, webview?: vscode.Webview): Promise<string> {
    if (this.isDisposed) {
      throw new Error('NovaActCliProvider has been disposed');
    }

    if (!this.novaActPath) {
      showError(
        `Nova Act CLI not found. Please install it in ${VENV_DIR} via: pip install nova-act[cli]\n\nOr configure a custom path to the Nova Act CLI in VS Code settings: novaAct.cliPath`
      );
    }

    return new Promise(async (resolve, reject) => {
      const OPERATION_TIMEOUT_MS = 86400000; // 24 hours
      const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB

      const command = `${this.novaActPath} ${args}`;

      const enhancedEnv = { ...process.env };
      const dockerPaths = ['/usr/local/bin', '/opt/homebrew/bin', '/usr/bin'];
      const currentPath = enhancedEnv.PATH || '';
      const pathSeparator = process.platform === 'win32' ? ';' : ':';
      enhancedEnv.PATH = currentPath + pathSeparator + dockerPaths.join(pathSeparator);

      const novaActEnv = await this.createEnhancedEnvironment();
      Object.assign(enhancedEnv, novaActEnv);

      logger.debug(`Executing command: ${command}`);

      let stdout = '';
      let stderr = '';

      const child = cp.spawn(command, [], {
        shell: true,
        stdio: 'pipe',
        env: enhancedEnv,
      });

      this.activeProcesses.add(child);

      const cleanup = () => {
        this.activeProcesses.delete(child);
        clearTimeout(timeout);
        child.stdout?.removeListener('data', stdoutHandler);
        child.stderr?.removeListener('data', stderrHandler);
        child.removeListener('close', closeHandler);
        child.removeListener('error', errorHandler);
      };

      const timeout = setTimeout(() => {
        cleanup();
        child.kill('SIGTERM');
        reject(new Error('Operation timed out after 24 hours'));
      }, OPERATION_TIMEOUT_MS);

      const stdoutHandler = (data: Buffer) => {
        const output = data.toString();
        if (stdout.length < MAX_BUFFER_SIZE) {
          stdout += output;
        } else {
          logger.log('stdout buffer limit reached, truncating output');
        }
        logger.debug(`Nova Act stdout: ${output}`);
        if (webview && !this.isDisposed) {
          try {
            this.sendProgressMessage(webview, 'deployProgress', output);
          } catch (_error) {
            // Webview may be disposed, ignore
          }
        }
      };

      const stderrHandler = (data: Buffer) => {
        const output = data.toString();
        if (stderr.length < MAX_BUFFER_SIZE) {
          stderr += output;
        } else {
          logger.log('stderr buffer limit reached, truncating output');
        }
        logger.debug(`Nova Act stderr: ${output}`);
        if (webview && !this.isDisposed) {
          try {
            this.sendProgressMessage(webview, 'deployProgress', output);
          } catch (_error) {
            // Webview may be disposed, ignore
          }
        }
      };

      const closeHandler = (code: number | null) => {
        cleanup();
        logger.debug(`Command exited with code: ${code}`);
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      };

      const errorHandler = (error: Error) => {
        cleanup();
        logger.error(`Command execution error: ${error.message}`);
        reject(error);
      };

      child.stdout?.on('data', stdoutHandler);
      child.stderr?.on('data', stderrHandler);
      child.on('close', closeHandler);
      child.on('error', errorHandler);
    });
  }

  private sendProgressMessage(
    webview: vscode.Webview,
    type: 'deployProgress' | 'invokeRuntimeProgress',
    output: string
  ): void {
    webview.postMessage({
      type,
      output,
    });
  }

  async deployWorkflow(
    name: string,
    region: string,
    workflowDir: string,
    webview: vscode.Webview,
    executionRoleArn?: string
  ): Promise<string> {
    try {
      let command = `workflow deploy --name "${name}" --source-dir "${workflowDir}" --region "${region}"`;

      if (executionRoleArn) {
        command += ` --execution-role-arn "${executionRoleArn}"`;
      }

      return await this.executeNovaActCommand(command, webview);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showError(`Failed to deploy workflow "${name}" to region ${region}: ${errorMessage}`);
    }
  }

  async createWorkflow(name: string, webview: vscode.Webview): Promise<void> {
    try {
      await this.executeNovaActCommand(`workflow create --name "${name}"`, webview);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showError(`Failed to create workflow "${name}": ${errorMessage}`);
    }
  }

  async handleDeployScript(
    message: { name: string; region: string; filePath: string; executionRoleArn?: string },
    webview: vscode.Webview,
    readFileContentFn: (filePath: string) => string,
    createWorkflowFilesFn: (name: string, content: string) => Promise<string>
  ): Promise<void> {
    try {
      logger.debug(`Deploying script: ${message.name} to region: ${message.region}`);

      if (message.executionRoleArn) {
        logger.debug(`Using execution role ARN: ${message.executionRoleArn}`);
      }

      if (!this.novaActPath) {
        throw new Error('Nova Act CLI not found');
      }

      const content = readFileContentFn(message.filePath);
      const workflowDir = await createWorkflowFilesFn(message.name, content);
      await this.createWorkflow(message.name, webview);
      const output = await this.deployWorkflow(
        message.name,
        message.region,
        workflowDir,
        webview,
        message.executionRoleArn
      );

      webview.postMessage({
        command: 'deployResult',
        success: true,
        output,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Deploy script error: ${errorMessage}`);
      webview.postMessage({
        command: 'deployResult',
        success: false,
        error: errorMessage,
      });
    }
  }

  async handleInvokeRuntime(
    message: { name: string; payload: string },
    webview: vscode.Webview
  ): Promise<void> {
    try {
      if (this.isDisposed) {
        throw new Error('NovaActCliProvider has been disposed');
      }

      logger.debug(`Invoking runtime: ${message.name} with payload: ${message.payload}`);

      if (!this.novaActPath) {
        throw new Error(
          'nova-act command not found. Please ensure Nova Act CLI is installed and in PATH.'
        );
      }

      const workflowName = message.name;
      if (!workflowName) {
        throw new Error('No workflow name provided');
      }

      // Initialize buffer and tracking
      this.executionBuffers.set(workflowName, '');
      this.executingWorkflows.add(workflowName);

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const workingDirectory = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();

      const command = `${this.novaActPath} workflow run --name "${workflowName}" --payload '${message.payload}' --tail-logs`;
      logger.debug(`Executing command: ${command} in directory: ${workingDirectory}`);

      await new Promise<void>((resolve, reject) => {
        const OPERATION_TIMEOUT_MS = 86400000; // 24 hours

        // Temporary fix: Set AWS max attempts to 1 to prevent retry-based duplicate workflow invocations
        // TODO: Remove once underlying retry issue is resolved in the Nova Act CLI
        const runEnv = {
          ...process.env,
          AWS_MAX_ATTEMPTS: '1',
        };

        const child = cp.spawn(command, [], {
          shell: true,
          stdio: 'pipe',
          env: runEnv,
          cwd: workingDirectory,
        });

        this.activeProcesses.add(child);

        const cleanup = () => {
          this.activeProcesses.delete(child);
          clearTimeout(timeout);
          child.stdout?.removeListener('data', stdoutHandler);
          child.stderr?.removeListener('data', stderrHandler);
          child.removeListener('close', closeHandler);
          child.removeListener('error', errorHandler);
        };

        const timeout = setTimeout(() => {
          cleanup();
          child.kill('SIGTERM');
          reject(new Error('Runtime invocation timed out after 24 hours'));
        }, OPERATION_TIMEOUT_MS);

        const stdoutHandler = (data: Buffer) => {
          const output = data.toString();
          logger.debug(`Nova Act stdout: ${output}`);

          // Always buffer output
          const currentBuffer = this.executionBuffers.get(workflowName) || '';
          const newBuffer = currentBuffer + output;

          // Apply buffer size limit
          const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB
          if (newBuffer.length > MAX_BUFFER_SIZE) {
            const truncated = newBuffer.slice(-MAX_BUFFER_SIZE);
            this.executionBuffers.set(workflowName, truncated);
          } else {
            this.executionBuffers.set(workflowName, newBuffer);
          }

          // Only stream if this is the active workflow
          if (!this.isDisposed) {
            try {
              if (this.activeWorkflowName === workflowName) {
                webview.postMessage({
                  type: 'invokeRuntimeProgress',
                  workflowName,
                  output,
                });
              }
            } catch (_error) {
              // Webview may be disposed, ignore
            }
          }
        };

        const stderrHandler = (data: Buffer) => {
          const output = data.toString();
          logger.debug(`Nova Act stderr: ${output}`);

          // Always buffer output
          const currentBuffer = this.executionBuffers.get(workflowName) || '';
          const newBuffer = currentBuffer + output;

          // Apply buffer size limit
          const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB
          if (newBuffer.length > MAX_BUFFER_SIZE) {
            const truncated = newBuffer.slice(-MAX_BUFFER_SIZE);
            this.executionBuffers.set(workflowName, truncated);
          } else {
            this.executionBuffers.set(workflowName, newBuffer);
          }

          // Only stream if this is the active workflow
          if (!this.isDisposed) {
            try {
              if (this.activeWorkflowName === workflowName) {
                webview.postMessage({
                  type: 'invokeRuntimeProgress',
                  workflowName,
                  output,
                });
              }
            } catch (_error) {
              // Webview may be disposed, ignore
            }
          }
        };

        const closeHandler = (code: number | null) => {
          cleanup();
          logger.debug(`Command exited with code: ${code}`);
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Command failed with code ${code}`));
          }
        };

        const errorHandler = (error: Error) => {
          cleanup();
          logger.error(`Command execution error: ${error.message}`);
          reject(error);
        };

        child.stdout?.on('data', stdoutHandler);
        child.stderr?.on('data', stderrHandler);
        child.on('close', closeHandler);
        child.on('error', errorHandler);
      });

      const finalBuffer = this.executionBuffers.get(workflowName) || '';
      webview.postMessage({
        type: 'invokeRuntimeResult',
        workflowName,
        success: true,
        output: finalBuffer,
      });

      // Cleanup executing state
      this.executingWorkflows.delete(workflowName);
      // Note: Keep buffer for history - don't delete executionBuffers entry
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Runtime invocation failed: ${errorMessage}`);

      // Cleanup executing state on error
      const workflowName = message.name;
      if (workflowName) {
        this.executingWorkflows.delete(workflowName);
      }

      const finalBuffer = this.executionBuffers.get(workflowName) || '';
      webview.postMessage({
        type: 'invokeRuntimeResult',
        workflowName,
        success: false,
        error: errorMessage,
        output: finalBuffer,
      });
    }
  }

  async handleValidateAwsCredentials(webview: vscode.Webview, isRefresh?: boolean): Promise<void> {
    try {
      const client = new STSClient({
        credentials: fromNodeProviderChain({
          ignoreCache: true,
        }),
      });
      const identity = await client.send(new GetCallerIdentityCommand({}));

      webview.postMessage({
        type: 'awsCredentialsValidationResult',
        success: true,
        identity,
        isRefresh,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`AWS credentials validation error: ${errorMessage}`);
      webview.postMessage({
        type: 'awsCredentialsValidationResult',
        success: false,
        error: errorMessage,
        isRefresh,
      });
    }
  }

  async listWorkflows(region: string): Promise<WorkflowInfo[]> {
    if (!this.novaActPath) {
      throw new Error('Nova Act CLI not found');
    }

    const command = `workflow list --region ${region}`;
    const output = await this.executeNovaActCommand(command);

    // Parse CLI output - format is typically:
    // Workflows:
    //   workflow-name-1
    //   workflow-name-2
    // Use 'act workflow run' to execute
    const lines = output.split('\n');
    const workflows: WorkflowInfo[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip header lines and empty lines
      if (trimmed && !trimmed.startsWith('Workflows') && !trimmed.startsWith('Use')) {
        const name = trimmed.split(' ')[0];
        if (name) {
          workflows.push({ name });
        }
      }
    }

    if (workflows.length === 0) {
      throw new Error(`No workflows found in region ${region}. CLI output:\n${output}`);
    }

    return workflows;
  }

  async handleSetActiveWorkflow(
    message: { workflowName: string },
    webview: vscode.Webview
  ): Promise<void> {
    this.activeWorkflowName = message.workflowName;

    // Send buffered output if it exists
    const buffer = this.executionBuffers.get(message.workflowName);
    if (buffer) {
      webview.postMessage({
        type: 'workflowOutputBuffer',
        workflowName: message.workflowName,
        output: buffer,
      });
    }
  }
}
