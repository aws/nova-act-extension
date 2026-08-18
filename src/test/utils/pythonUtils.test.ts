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

  describe('interpreter path is not shell-interpreted', () => {
    const maybe = process.platform === 'win32' ? it.skip : it;

    maybe('checkPip does not evaluate shell syntax in the interpreter path', async () => {
      const marker = path.join(os.tmpdir(), `nova-act-argv-${process.pid}-${Date.now()}`);
      if (fs.existsSync(marker)) {
        fs.unlinkSync(marker);
      }
      const shellMetaPath = `$(touch ${marker})`;
      try {
        await checkPip(shellMetaPath);
      } catch {}
      const executed = fs.existsSync(marker);
      if (executed) {
        fs.unlinkSync(marker);
      }
      assert.strictEqual(
        executed,
        false,
        'interpreter path reached a shell: command substitution was evaluated'
      );
    });

    maybe(
      'checkPython does not evaluate shell syntax from python.defaultInterpreterPath',
      async () => {
        const marker = path.join(os.tmpdir(), `nova-act-argv-py-${process.pid}-${Date.now()}`);
        if (fs.existsSync(marker)) {
          fs.unlinkSync(marker);
        }
        const g = global as unknown as { __mockConfig?: Record<string, unknown> };
        const prev = g.__mockConfig;
        g.__mockConfig = { 'python.defaultInterpreterPath': `$(touch ${marker})` };
        try {
          await checkPython();
        } catch {
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
          'defaultInterpreterPath reached a shell during the version probe'
        );
      }
    );
  });
});
