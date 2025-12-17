import * as assert from 'assert';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

import { templates } from '../../core/templates/templates';
import '../setup';

const execAsync = promisify(exec);

interface ValidationResult {
  valid: boolean;
  error: string | null;
}

async function validatePythonCode(code: string): Promise<ValidationResult> {
  const tmpFile = path.join(os.tmpdir(), `template-${Date.now()}-${Math.random()}.py`);

  try {
    await fs.promises.writeFile(tmpFile, code);
    await execAsync(`python3 -m py_compile ${tmpFile}`);
    return { valid: true, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { valid: false, error: errorMessage };
  } finally {
    await fs.promises.unlink(tmpFile).catch(() => {});
  }
}

describe('Python Template Validation', () => {
  it('should validate all Python templates have valid syntax', async () => {
    const errors: string[] = [];

    for (const [_key, template] of Object.entries(templates)) {
      if (!template) continue;

      const fullScript = template.cells.join('\n\n');
      const result = await validatePythonCode(fullScript);

      if (!result.valid) {
        errors.push(`Template "${template.name}" has invalid Python:\n${result.error}`);
      }
    }

    assert.strictEqual(
      errors.length,
      0,
      `Found ${errors.length} template(s) with invalid Python:\n\n${errors.join('\n\n')}`
    );
  });
});
