import * as assert from 'assert';

import { splitPythonCode } from '../../core/utils/splitPythonCode';
import { SAMPLE_PYTHON_CODE } from '../fixtures/samplePythonCode';
import '../setup';

describe('Open Python File Integration Test Suite', () => {
  describe('Python file processing for Open Python File button', () => {
    it('should use splitPythonCode for processing Python files', () => {
      // Test that the splitPythonCode function properly handles a realistic Python file
      const samplePythonCode = `import os
import sys

def main():
    print("Hello, World!")
    return 0

if __name__ == "__main__":
    main()`;

      const result = splitPythonCode(samplePythonCode);

      // Verify that the function returns an array
      assert.ok(Array.isArray(result), 'splitPythonCode should return an array');

      // Verify that all content is preserved
      const allContent = result.join('\n\n');
      assert.ok(allContent.includes('import os'), 'Should preserve imports');
      assert.ok(allContent.includes('def main()'), 'Should preserve function definitions');
      assert.ok(allContent.includes('if __name__ == "__main__"'), 'Should preserve main block');

      // Verify that the result is not empty
      assert.ok(result.length > 0, 'Should return at least one cell');
      assert.ok(
        result.every((cell) => cell.trim().length > 0),
        'All cells should have content'
      );
    });

    it('should handle empty Python files gracefully', () => {
      const emptyCode = '';
      const result = splitPythonCode(emptyCode);

      assert.deepStrictEqual(result, [], 'Empty code should return empty array');
    });

    it('should handle Python files with only whitespace', () => {
      const whitespaceCode = '   \n\n\t  \n  ';
      const result = splitPythonCode(whitespaceCode);

      assert.deepStrictEqual(result, [], 'Whitespace-only code should return empty array');
    });

    it('should preserve Python code structure when joining cells', () => {
      const complexPythonCode = `#!/usr/bin/env python3
"""Module docstring"""

import os
from typing import List

class TestClass:
    def __init__(self):
        self.value = 42
    
    def method(self):
        return self.value

def standalone_function():
    return "test"

if __name__ == "__main__":
    obj = TestClass()
    print(obj.method())
    print(standalone_function())`;

      const cells = splitPythonCode(complexPythonCode);
      const reconstructed = cells.join('\n\n');

      // Verify all major components are preserved
      assert.ok(reconstructed.includes('#!/usr/bin/env python3'), 'Should preserve shebang');
      assert.ok(reconstructed.includes('"""Module docstring"""'), 'Should preserve docstring');
      assert.ok(reconstructed.includes('import os'), 'Should preserve imports');
      assert.ok(reconstructed.includes('class TestClass'), 'Should preserve class definition');
      assert.ok(
        reconstructed.includes('def standalone_function'),
        'Should preserve function definition'
      );
      assert.ok(reconstructed.includes('if __name__ == "__main__"'), 'Should preserve main block');

      // Verify that the reconstructed code maintains logical structure
      assert.ok(cells.length >= 1, 'Should create at least one cell');
    });

    it('should split sample Python code into expected 14 cells', () => {
      // Use the TypeScript constant instead of reading from file
      const cells = splitPythonCode(SAMPLE_PYTHON_CODE);

      // Log the cells for debugging

      cells.forEach((cell, _index) => {
        const firstLine = cell.split('\n')[0];
        const _preview = firstLine ? firstLine.substring(0, 50) : '';
      });

      // Verify we get exactly 14 cells as expected
      assert.strictEqual(cells.length, 14, `Expected 14 cells, got ${cells.length}`);

      // Verify specific expected cells based on the breakdown:
      // 1. The initial docstring
      assert.ok(
        cells[0] && cells[0].includes('"""Example of using DataProcessor'),
        'Cell 1 should contain the docstring'
      );

      // 2. The block of import and from statements
      assert.ok(
        cells[1] &&
          cells[1].includes('import argparse') &&
          cells[1].includes('from collections import defaultdict'),
        'Cell 2 should contain imports'
      );

      // 3. The line os.environ[...]
      assert.ok(
        cells[2] && cells[2].includes('os.environ["PROCESSOR_CONFIG"]'),
        'Cell 3 should contain os.environ assignment'
      );

      // 4. The class ActionRequest(...) definition
      assert.ok(
        cells[3] && cells[3].includes('class ActionRequest(dataclass)'),
        'Cell 4 should contain ActionRequest class'
      );

      // 5. The class ProcessResult(...) definition
      assert.ok(
        cells[4] && cells[4].includes('class ProcessResult(dataclass)'),
        'Cell 5 should contain ProcessResult class'
      );

      // 6. The def get_schema_config(): function
      assert.ok(
        cells[5] && cells[5].includes('def get_schema_config()'),
        'Cell 6 should contain get_schema_config function'
      );

      // 7. The def get_source_location(...) function
      assert.ok(
        cells[6] && cells[6].includes('def get_source_location()'),
        'Cell 7 should contain get_source_location function'
      );

      // 8. The def get_target_location(...) function
      assert.ok(
        cells[7] && cells[7].includes('def get_target_location()'),
        'Cell 8 should contain get_target_location function'
      );

      // 9. The def get_process_date(...) function
      assert.ok(
        cells[8] && cells[8].includes('def get_process_date()'),
        'Cell 9 should contain get_process_date function'
      );

      // 10. The def get_batch_date(...) function
      assert.ok(
        cells[9] && cells[9].includes('def get_batch_date()'),
        'Cell 10 should contain get_batch_date function'
      );

      // 11. The def get_record_count(...) function
      assert.ok(
        cells[10] && cells[10].includes('def get_record_count()'),
        'Cell 11 should contain get_record_count function'
      );

      // 12. The def get_priority_level(...) function
      assert.ok(
        cells[11] && cells[11].includes('def get_priority_level()'),
        'Cell 12 should contain get_priority_level function'
      );

      // 13. The def main(...) function
      assert.ok(
        cells[12] && cells[12].includes('def main(debug_mode: bool = False)'),
        'Cell 13 should contain main function'
      );

      // 14. The if __name__ == "__main__": block
      assert.ok(
        cells[13] && cells[13].includes('if __name__ == "__main__"'),
        'Cell 14 should contain main block'
      );

      // Verify that all content is preserved
      const allContent = cells.join('\n\n');
      assert.ok(allContent.includes('DataProcessor'), 'Should preserve all content');
      assert.ok(allContent.includes('main(debug_mode=debug)'), 'Should preserve the final line');
    });
  });
});
