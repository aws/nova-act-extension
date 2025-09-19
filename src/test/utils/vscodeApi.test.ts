import * as assert from 'assert';

import {
  actionViewerVscodeApi,
  builderModeVscodeApi,
  commonWebviewVscodeApi,
  sidebarVscodeApi,
} from '../../core/utils/vscodeApi';
import '../setup';

describe('VscodeApi Test Suite', () => {
  beforeEach(() => {
    // Clear any previous messages
    (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage = null;
  });

  describe('Typed VS Code API instances', () => {
    it('should have all required API methods', () => {
      const apis = [
        actionViewerVscodeApi,
        sidebarVscodeApi,
        builderModeVscodeApi,
        commonWebviewVscodeApi,
      ];

      apis.forEach((api) => {
        assert.strictEqual(typeof api.postMessage, 'function');
        assert.strictEqual(typeof api.setState, 'function');
        assert.strictEqual(typeof api.getState, 'function');
      });
    });

    it('should send messages through postMessage', () => {
      const testMessage = { command: 'test', data: 'example' };
      sidebarVscodeApi.postMessage(testMessage as never);

      assert.deepStrictEqual(
        (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage,
        testMessage
      );
    });

    it('should handle setState calls', () => {
      const testState = { key: 'value', count: 42 };
      const result = sidebarVscodeApi.setState(testState);
      assert.deepStrictEqual(result, testState);
    });

    it('should handle getState calls', () => {
      const result = sidebarVscodeApi.getState();
      assert.deepStrictEqual(result, {});
    });
  });

  describe('Different API instances', () => {
    it('should have separate instances for different webviews', () => {
      // Each API should be a separate instance but with same structure
      assert.notStrictEqual(sidebarVscodeApi, builderModeVscodeApi);
      assert.notStrictEqual(builderModeVscodeApi, actionViewerVscodeApi);
      assert.notStrictEqual(actionViewerVscodeApi, commonWebviewVscodeApi);
    });

    it('should all use the same underlying VS Code API', () => {
      // All APIs should have the same method signatures
      const apis = [
        actionViewerVscodeApi,
        sidebarVscodeApi,
        builderModeVscodeApi,
        commonWebviewVscodeApi,
      ];

      apis.forEach((api) => {
        assert.strictEqual(typeof api.postMessage, 'function');
        assert.strictEqual(typeof api.setState, 'function');
        assert.strictEqual(typeof api.getState, 'function');
      });
    });
  });
});
