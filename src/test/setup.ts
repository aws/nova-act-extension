/**
 * Test setup file to mock VS Code API and other global dependencies
 */

interface MockVsCodeApi {
  postMessage: (message: unknown) => void;
  setState: <T extends Record<string, unknown> | undefined>(newState: T) => T;
  getState: () => Record<string, unknown> | undefined;
}

interface MockCrypto {
  randomUUID: () => string;
}

interface MockVsCode {
  ViewColumn: {
    One: number;
  };
  env: {
    appName: string;
    isTelemetryEnabled: boolean;
    onDidChangeTelemetryEnabled: () => { dispose: () => void };
  };
  window: {
    createOutputChannel: (name: string) => {
      write: (value: string) => void;
      writeln: (value: string) => void;
      appendLine: (value: string) => void;
      show: () => void;
      hide: () => void;
      dispose: () => void;
    };
    showErrorMessage: (message: string) => Promise<string | undefined>;
    showInformationMessage: (message: string) => Promise<string | undefined>;
    showWarningMessage: (message: string) => Promise<string | undefined>;
  };
  workspace: {
    getConfiguration: (section?: string) => { get: (key: string) => unknown };
    workspaceFolders: undefined;
  };
  ExtensionMode: { Production: number; Development: number; Test: number };
  commands: {
    registerCommand: () => { dispose: () => void };
    executeCommand: () => Promise<unknown>;
  };
}

interface GlobalWithMocks {
  acquireVsCodeApi?: () => MockVsCodeApi;
  lastVsCodeMessage?: unknown;
  crypto?: MockCrypto;
  mockVscode?: MockVsCode;
}

// Mock vscode module for ideDetection tests
const mockVscode: MockVsCode = {
  ViewColumn: { One: 1 },
  env: {
    appName: 'Visual Studio Code',
    isTelemetryEnabled: true,
    onDidChangeTelemetryEnabled: () => ({ dispose: () => {} }),
  },
  window: {
    createOutputChannel: (_name: string) => ({
      write: (_value: string) => {
        // Mock implementation - no output in tests
      },
      writeln: (_value: string) => {
        // Mock implementation - no output in tests
      },
      appendLine: (_value: string) => {
        // Mock implementation - no output in tests
      },
      show: () => {},
      hide: () => {},
      dispose: () => {},
    }),
    showErrorMessage: (_message: string) => Promise.resolve(undefined),
    showInformationMessage: (_message: string) => Promise.resolve(undefined),
    showWarningMessage: (_message: string) => Promise.resolve(undefined),
  },
  // Enough of the workspace API for provider tests to construct/run without throwing.
  // Values come from a global override map so tests can inject settings, e.g.
  // (global as any).__mockConfig = { 'python.defaultInterpreterPath': '...' };
  workspace: {
    getConfiguration: (section?: string) => ({
      get: (key: string) => {
        const overrides =
          (global as unknown as { __mockConfig?: Record<string, unknown> }).__mockConfig || {};
        const scoped = section ? `${section}.${key}` : key;
        return overrides[scoped];
      },
    }),
    workspaceFolders: undefined,
  },
  // logger.debug gates on this; without it `vscode.ExtensionMode.Development` throws.
  ExtensionMode: { Production: 1, Development: 2, Test: 3 },
  commands: {
    registerCommand: () => ({ dispose: () => {} }),
    executeCommand: () => Promise.resolve(undefined),
  },
};

// Store mock globally so tests can access it
(global as unknown as GlobalWithMocks).mockVscode = mockVscode;

// Mock acquireVsCodeApi globally for all tests - must be set before any imports
(global as unknown as GlobalWithMocks).acquireVsCodeApi = (): MockVsCodeApi => ({
  postMessage: (message: unknown) => {
    // Store the last message for testing
    (global as unknown as GlobalWithMocks).lastVsCodeMessage = message;
  },
  setState: <T extends Record<string, unknown> | undefined>(newState: T): T => newState,
  getState: () => ({}),
});

// Mock crypto.randomUUID for Node.js environments that might not have it
if (!global.crypto) {
  (global as unknown as GlobalWithMocks).crypto = {
    randomUUID: (): string => {
      // Simple UUID v4 mock for testing
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  };
}

// Mock vscode module using Module._load

const Module = require('module');
const originalLoad = Module._load;

Module._load = function (request: string, _parent: NodeJS.Module) {
  if (request === 'vscode') {
    return mockVscode;
  }

  return originalLoad.apply(this, arguments);
};
