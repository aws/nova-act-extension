import * as assert from 'assert';

import { getScriptContent, validateWorkflowNameInScript } from '../../core/utils/workflowUtils';
import '../setup';

describe('WorkflowUtils Test Suite', () => {
  describe('getScriptContent', () => {
    it('should return joined cell content when cells exist', () => {
      const cells = [{ code: 'print("first")' }, { code: 'print("second")' }];

      const result = getScriptContent(cells);
      assert.strictEqual(result, 'print("first")\n\nprint("second")');
    });

    it('should return file content when no cells', () => {
      const fileContent = 'print("from file")';
      const result = getScriptContent([], fileContent);
      assert.strictEqual(result, fileContent);
    });

    it('should return empty string when no cells and no file content', () => {
      const result = getScriptContent([]);
      assert.strictEqual(result, '');
    });
  });

  describe('validateWorkflowNameInScript', () => {
    it('should return empty string for empty agent name', () => {
      const result = validateWorkflowNameInScript('', 'some content');
      assert.strictEqual(result, '');
    });

    it('should return empty string for empty script content', () => {
      const result = validateWorkflowNameInScript('agent', '');
      assert.strictEqual(result, '');
    });

    it('should return empty string when workflow_definition_name found', () => {
      const script = 'workflow_definition_name = "test"';
      const result = validateWorkflowNameInScript('agent', script);
      assert.strictEqual(result, '');
    });

    it('should return empty string when @workflow decorator found', () => {
      const script = '@workflow\ndef my_workflow():';
      const result = validateWorkflowNameInScript('agent', script);
      assert.strictEqual(result, '');
    });

    it('should return empty string when agent name found in script', () => {
      const script = 'def my_agent_function():';
      const result = validateWorkflowNameInScript('agent', script);
      assert.strictEqual(result, '');
    });

    it('should return warning when no workflow references found', () => {
      const script = 'print("hello world")';
      const result = validateWorkflowNameInScript('agent', script);
      assert.ok(result.includes("Script content doesn't seem to reference workflow name"));
    });

    it('should be case insensitive', () => {
      const script = 'WORKFLOW_DEFINITION_NAME = "test"';
      const result = validateWorkflowNameInScript('AGENT', script);
      assert.strictEqual(result, '');
    });
  });
});
