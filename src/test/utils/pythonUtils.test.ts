import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  PLATFORM,
  VENV_DIR,
  checkPip,
  checkPython,
  getPythonExecutablePath,
} from '../../core/utils/pythonUtils';
import '../setup';

describe('PythonUtils Test Suite', () => {
  describe('getPythonExecutablePath', () => {
    it('should return path with correct structure', () => {
      const result = getPythonExecutablePath();
      assert.ok(result.includes('.nova-act-env'));
      assert.ok(result.includes('python'));
    });
  });

  describe('PLATFORM constant', () => {
    it('should export platform constant', () => {
      assert.strictEqual(typeof PLATFORM, 'string');
      assert.ok(PLATFORM.length > 0);
    });
  });

  describe('VENV_DIR constant', () => {
    it('should export venv directory constant', () => {
      assert.strictEqual(typeof VENV_DIR, 'string');
      assert.ok(VENV_DIR.includes('.nova-act-env'));
    });
  });

  // Regression test: OS command injection via python interpreter path (CWE-78).
  // The interpreter path is user-controllable via a workspace's `.vscode/settings.json`
  // (`python.defaultInterpreterPath`). A `$(...)` payload executes when the path is
  // interpolated into a shell command string; it is inert when passed as a literal argv.
  describe('command injection via interpreter path', () => {
    // Skip on Windows: the POSIX-shell `$(...)`/`touch` payload does not apply to cmd.exe.
    const maybe = process.platform === 'win32' ? it.skip : it;

    maybe(
      'checkPip must not execute a shell payload embedded in the interpreter path',
      async () => {
        const marker = path.join(os.tmpdir(), `nova-act-inject-${process.pid}-${Date.now()}`);
        if (fs.existsSync(marker)) {
          fs.unlinkSync(marker);
        }
        // Payload: command substitution runs inside double quotes under /bin/sh.
        const maliciousPath = `$(touch ${marker})`;
        try {
          await checkPip(maliciousPath);
        } catch {
          // checkPip surfaces an error for a bogus interpreter; irrelevant to the side effect.
        }
        const executed = fs.existsSync(marker);
        if (executed) {
          fs.unlinkSync(marker);
        }
        assert.strictEqual(
          executed,
          false,
          'interpreter path was passed to a shell — command substitution executed (RCE)'
        );
      }
    );

    // checkPython() returns python.defaultInterpreterPath (a workspace setting) as its
    // first candidate; that value feeds the venv/pip shell-outs in updateOrInstallWheelCmd
    // (the "NovaAct Setup" flow). Probing a candidate must never spawn a shell.
    maybe(
      'checkPython must not execute a shell payload from python.defaultInterpreterPath',
      async () => {
        const marker = path.join(os.tmpdir(), `nova-act-inject-py-${process.pid}-${Date.now()}`);
        if (fs.existsSync(marker)) {
          fs.unlinkSync(marker);
        }
        const g = global as unknown as { __mockConfig?: Record<string, unknown> };
        const prev = g.__mockConfig;
        g.__mockConfig = { 'python.defaultInterpreterPath': `$(touch ${marker})` };
        try {
          await checkPython();
        } catch {
          // checkPython throws when no usable interpreter is found; irrelevant to the side effect.
        } finally {
          g.__mockConfig = prev;
        }
        const executed = fs.existsSync(marker);
        if (executed) {
          fs.unlinkSync(marker);
        }
        assert.strictEqual(
          executed,
          false,
          'defaultInterpreterPath was passed to a shell during version probe (RCE)'
        );
      }
    );
  });
});
