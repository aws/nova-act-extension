import assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { GENERIC_WALKTHROUGH_ID, KIRO_WALKTHROUGH_ID, WALKTHROUGH_ID } from '../../constants';
import { IDE, detectIDE, getWalkthroughIdForIDE } from '../../core/utils/ideDetection';
import '../setup';

describe('IDEDetection Test Suite', () => {
  let sandbox: sinon.SinonSandbox;
  let loggerErrorStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    loggerErrorStub = sandbox.stub();

    // Mock logger
    const loggerModule = require('../../core/utils/logger');
    sandbox.stub(loggerModule.default, 'error').callsFake(loggerErrorStub);
  });

  afterEach(() => {
    sandbox.restore();
  });

  const mockVscodeEnv = (appName: string | null | undefined) => {
    sandbox.stub(vscode.env, 'appName').value(appName);
  };

  describe('Constants', () => {
    it('should have correct walkthrough ID constants', () => {
      assert.strictEqual(WALKTHROUGH_ID, 'novaAgentWalkthrough');
      assert.strictEqual(KIRO_WALKTHROUGH_ID, 'novaAgentKiroWalkthrough');
      assert.strictEqual(GENERIC_WALKTHROUGH_ID, 'novaAgentGenericWalkthrough');
    });
  });

  describe('IDE enum', () => {
    it('should have correct enum values', () => {
      assert.strictEqual(IDE.VSCODE, 'vscode');
      assert.strictEqual(IDE.KIRO, 'kiro');
      assert.strictEqual(IDE.UNKNOWN, 'unknown');
    });
  });

  describe('detectIDE function', () => {
    it('should detect Kiro IDE from app name', () => {
      mockVscodeEnv('Kiro IDE');

      const result = detectIDE();

      assert.strictEqual(result, IDE.KIRO);
      assert.strictEqual(
        loggerErrorStub.callCount,
        0,
        'Should not call logger.error for successful detection'
      );
    });

    it('should detect VS Code from app name', () => {
      mockVscodeEnv('Visual Studio Code');

      const result = detectIDE();

      assert.strictEqual(result, IDE.VSCODE);
      assert.strictEqual(
        loggerErrorStub.callCount,
        0,
        'Should not call logger.error for successful detection'
      );
    });

    it('should detect VS Code from vscode app name', () => {
      mockVscodeEnv('vscode');

      const result = detectIDE();

      assert.strictEqual(result, IDE.VSCODE);
      assert.strictEqual(
        loggerErrorStub.callCount,
        0,
        'Should not call logger.error for successful detection'
      );
    });

    it('should prioritize Kiro over VS Code when both are present', () => {
      mockVscodeEnv('Kiro based on Visual Studio Code');

      const result = detectIDE();

      assert.strictEqual(result, IDE.KIRO);
      assert.strictEqual(
        loggerErrorStub.callCount,
        0,
        'Should not call logger.error for successful detection'
      );
    });

    it('should be case insensitive', () => {
      const testCases = [
        { appName: 'KIRO IDE', expected: IDE.KIRO },
        { appName: 'VISUAL STUDIO CODE', expected: IDE.VSCODE },
        { appName: 'kiro editor', expected: IDE.KIRO },
        { appName: 'vscode', expected: IDE.VSCODE },
      ];

      testCases.forEach(({ appName, expected }) => {
        // Restore and re-stub for each test case
        sandbox.restore();
        sandbox = sinon.createSandbox();
        loggerErrorStub = sandbox.stub();
        const loggerModule = require('../../core/utils/logger');
        sandbox.stub(loggerModule.default, 'error').callsFake(loggerErrorStub);

        mockVscodeEnv(appName);

        const result = detectIDE();

        assert.strictEqual(result, expected, `Failed for: ${appName}`);
        assert.strictEqual(
          loggerErrorStub.callCount,
          0,
          `Should not call logger.error for: ${appName}`
        );
      });
    });

    it('should fallback to VS Code for unknown app names', () => {
      const unknownApps = ['Unknown Editor', 'Sublime Text', 'Atom', 'IntelliJ IDEA'];

      unknownApps.forEach((appName) => {
        // Restore and re-stub for each test case
        sandbox.restore();
        sandbox = sinon.createSandbox();
        loggerErrorStub = sandbox.stub();
        const loggerModule = require('../../core/utils/logger');
        sandbox.stub(loggerModule.default, 'error').callsFake(loggerErrorStub);

        mockVscodeEnv(appName);

        const result = detectIDE();

        assert.strictEqual(result, IDE.VSCODE, `Failed for: ${appName}`);
        assert.strictEqual(
          loggerErrorStub.callCount,
          0,
          `Should not call logger.error for: ${appName}`
        );
      });
    });

    it('should fallback to VS Code when appName is null', () => {
      mockVscodeEnv(null);

      const result = detectIDE();

      assert.strictEqual(result, IDE.VSCODE);
      assert.strictEqual(
        loggerErrorStub.callCount,
        0,
        'Should not call logger.error for null appName'
      );
    });

    it('should fallback to VS Code when appName is undefined', () => {
      mockVscodeEnv(undefined);

      const result = detectIDE();

      assert.strictEqual(result, IDE.VSCODE);
      assert.strictEqual(
        loggerErrorStub.callCount,
        0,
        'Should not call logger.error for undefined appName'
      );
    });

    it('should handle errors gracefully and call logger.error', () => {
      // Create a getter that throws an error
      sandbox.stub(vscode.env, 'appName').get(() => {
        throw new Error('Test error accessing vscode.env.appName');
      });

      const result = detectIDE();

      // Should fallback to VS Code
      assert.strictEqual(result, IDE.VSCODE);

      // Should have called logger.error exactly once
      assert.strictEqual(loggerErrorStub.callCount, 1);

      // Should have called with error message
      const logCall = loggerErrorStub.getCall(0);
      assert(logCall.args[0].includes('Error detecting IDE from app name'));
    });

    it('should handle empty string appName gracefully', () => {
      mockVscodeEnv('');

      const result = detectIDE();

      assert.strictEqual(result, IDE.VSCODE);
      assert.strictEqual(
        loggerErrorStub.callCount,
        0,
        'Should not call logger.error for empty appName'
      );
    });

    it('should handle whitespace-only appName gracefully', () => {
      mockVscodeEnv('   ');

      const result = detectIDE();

      assert.strictEqual(result, IDE.VSCODE);
      assert.strictEqual(
        loggerErrorStub.callCount,
        0,
        'Should not call logger.error for whitespace appName'
      );
    });
  });

  describe('getWalkthroughIdForIDE function', () => {
    it('should return Kiro walkthrough ID for Kiro IDE', () => {
      mockVscodeEnv('Kiro IDE');

      const result = getWalkthroughIdForIDE();

      assert.strictEqual(result, KIRO_WALKTHROUGH_ID);
      assert.strictEqual(loggerErrorStub.callCount, 0, 'Should not call logger.error');
    });

    it('should return VS Code walkthrough ID for VS Code', () => {
      mockVscodeEnv('Visual Studio Code');

      const result = getWalkthroughIdForIDE();

      assert.strictEqual(result, WALKTHROUGH_ID);
      assert.strictEqual(loggerErrorStub.callCount, 0, 'Should not call logger.error');
    });

    it('should return VS Code walkthrough ID for unknown IDE (fallback)', () => {
      mockVscodeEnv('Unknown Editor');

      const result = getWalkthroughIdForIDE();

      assert.strictEqual(result, WALKTHROUGH_ID);
      assert.strictEqual(loggerErrorStub.callCount, 0, 'Should not call logger.error');
    });

    it('should call detectIDE internally and verify behavior', () => {
      mockVscodeEnv('Kiro IDE');

      // Test the behavior instead of spying on the function
      const result = getWalkthroughIdForIDE();

      // Should return correct walkthrough ID (proving detectIDE was called internally)
      assert.strictEqual(result, KIRO_WALKTHROUGH_ID);

      // Should not have called logger.error
      assert.strictEqual(loggerErrorStub.callCount, 0, 'Should not call logger.error');
    });

    it('should handle errors in detectIDE and still return walkthrough ID', () => {
      // Create a getter that throws an error
      sandbox.stub(vscode.env, 'appName').get(() => {
        throw new Error('Test error in getWalkthroughIdForIDE');
      });

      const result = getWalkthroughIdForIDE();

      // Should fallback to VS Code walkthrough ID
      assert.strictEqual(result, WALKTHROUGH_ID);

      // Should have called logger.error exactly once (from detectIDE)
      assert.strictEqual(loggerErrorStub.callCount, 1);
    });
  });

  describe('IDE Integration Tests', () => {
    it('should work end-to-end for Kiro detection and walkthrough ID', () => {
      mockVscodeEnv('Kiro IDE');

      const detectedIDE = detectIDE();
      const walkthroughId = getWalkthroughIdForIDE();

      assert.strictEqual(detectedIDE, IDE.KIRO);
      assert.strictEqual(walkthroughId, KIRO_WALKTHROUGH_ID);
      assert.strictEqual(loggerErrorStub.callCount, 0, 'Should not call logger.error');
    });

    it('should work end-to-end for VS Code detection and walkthrough ID', () => {
      mockVscodeEnv('Visual Studio Code');

      const detectedIDE = detectIDE();
      const walkthroughId = getWalkthroughIdForIDE();

      assert.strictEqual(detectedIDE, IDE.VSCODE);
      assert.strictEqual(walkthroughId, WALKTHROUGH_ID);
      assert.strictEqual(loggerErrorStub.callCount, 0, 'Should not call logger.error');
    });

    it('should handle complex scenarios with proper function calls', () => {
      const complexCases = [
        {
          appName: 'Kiro IDE - Development Build',
          expectedIDE: IDE.KIRO,
          expectedWalkthrough: KIRO_WALKTHROUGH_ID,
        },
        {
          appName: 'Microsoft Visual Studio Code - Insiders',
          expectedIDE: IDE.VSCODE,
          expectedWalkthrough: WALKTHROUGH_ID,
        },
        {
          appName: 'Kiro based on Visual Studio Code',
          expectedIDE: IDE.KIRO,
          expectedWalkthrough: KIRO_WALKTHROUGH_ID,
        },
        {
          appName: 'VSCode Community Edition',
          expectedIDE: IDE.VSCODE,
          expectedWalkthrough: WALKTHROUGH_ID,
        },
      ];

      complexCases.forEach(({ appName, expectedIDE, expectedWalkthrough }) => {
        // Restore and re-stub for each test case
        sandbox.restore();
        sandbox = sinon.createSandbox();
        loggerErrorStub = sandbox.stub();
        const loggerModule = require('../../core/utils/logger');
        sandbox.stub(loggerModule.default, 'error').callsFake(loggerErrorStub);

        mockVscodeEnv(appName);

        const detectedIDE = detectIDE();
        const walkthroughId = getWalkthroughIdForIDE();

        assert.strictEqual(detectedIDE, expectedIDE, `IDE detection failed for: ${appName}`);
        assert.strictEqual(
          walkthroughId,
          expectedWalkthrough,
          `Walkthrough ID failed for: ${appName}`
        );
        assert.strictEqual(
          loggerErrorStub.callCount,
          0,
          `Should not call logger.error for: ${appName}`
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle vscode.env access errors and log them properly', () => {
      // Create a getter that throws an error
      sandbox.stub(vscode.env, 'appName').get(() => {
        throw new Error('Cannot access vscode.env.appName');
      });

      const detectedIDE = detectIDE();
      const walkthroughId = getWalkthroughIdForIDE();

      // Should fallback to VS Code
      assert.strictEqual(detectedIDE, IDE.VSCODE);
      assert.strictEqual(walkthroughId, WALKTHROUGH_ID);

      // Should have logged the error twice (once for detectIDE, once for getWalkthroughIdForIDE calling detectIDE)
      assert.strictEqual(loggerErrorStub.callCount, 2);

      // Verify error message content
      const firstLogCall = loggerErrorStub.getCall(0);
      assert(firstLogCall.args[0].includes('Error detecting IDE from app name'));

      const secondLogCall = loggerErrorStub.getCall(1);
      assert(secondLogCall.args[0].includes('Error detecting IDE from app name'));
    });

    it('should handle edge cases with proper fallback behavior', () => {
      const edgeCases = [
        { appName: '', description: 'empty string' },
        { appName: '   ', description: 'whitespace only' },
        { appName: null, description: 'null value' },
        { appName: undefined, description: 'undefined value' },
      ];

      edgeCases.forEach(({ appName, description }) => {
        // Restore and re-stub for each test case
        sandbox.restore();
        sandbox = sinon.createSandbox();
        loggerErrorStub = sandbox.stub();
        const loggerModule = require('../../core/utils/logger');
        sandbox.stub(loggerModule.default, 'error').callsFake(loggerErrorStub);

        mockVscodeEnv(appName);

        const detectedIDE = detectIDE();
        const walkthroughId = getWalkthroughIdForIDE();

        assert.strictEqual(detectedIDE, IDE.VSCODE, `Failed for ${description}`);
        assert.strictEqual(walkthroughId, WALKTHROUGH_ID, `Failed for ${description}`);
        assert.strictEqual(loggerErrorStub.callCount, 0, `Should not log error for ${description}`);
      });
    });

    it('should handle special characters in app names', () => {
      const specialCases = [
        { appName: 'Kiro-IDE@2024', expectedIDE: IDE.KIRO },
        { appName: 'Visual Studio Code (Beta)', expectedIDE: IDE.VSCODE },
        { appName: 'vscode.exe', expectedIDE: IDE.VSCODE },
        { appName: 'KIRO_DEVELOPMENT_BUILD', expectedIDE: IDE.KIRO },
      ];

      specialCases.forEach(({ appName, expectedIDE }) => {
        // Restore and re-stub for each test case
        sandbox.restore();
        sandbox = sinon.createSandbox();
        loggerErrorStub = sandbox.stub();
        const loggerModule = require('../../core/utils/logger');
        sandbox.stub(loggerModule.default, 'error').callsFake(loggerErrorStub);

        mockVscodeEnv(appName);

        const result = detectIDE();
        assert.strictEqual(result, expectedIDE, `Failed for special case: ${appName}`);
        assert.strictEqual(loggerErrorStub.callCount, 0, `Should not log error for: ${appName}`);
      });
    });
  });
});
