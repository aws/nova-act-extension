import * as assert from 'assert';

import { PLATFORM, VENV_DIR, getPythonExecutablePath } from '../../core/utils/pythonUtils';
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
});
