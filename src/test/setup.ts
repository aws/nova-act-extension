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
      show: () => void;
      hide: () => void;
      dispose: () => void;
    };
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
      show: () => {},
      hide: () => {},
      dispose: () => {},
    }),
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
