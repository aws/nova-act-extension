import * as assert from 'assert';

import { readFileContent } from '../../core/utils/workflowFileUtils';
import '../setup';

describe('WorkflowFileUtils Test Suite', () => {
  describe('readFileContent', () => {
    it('should throw error for non-Python files', () => {
      assert.throws(() => {
        readFileContent('test.txt');
      }, /File must be a Python file/);
    });

    it('should throw error for non-existent files', () => {
      assert.throws(() => {
        readFileContent('nonexistent.py');
      }, /File not found/);
    });
  });
});
