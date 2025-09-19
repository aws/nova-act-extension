import * as assert from 'assert';

import { countActCalls, countLines, createRunId } from '../../core/utils/builderModeUtils';
import '../setup';

describe('BuilderModeUtils Test Suite', () => {
  describe('createRunId', () => {
    it('should generate a valid UUID', () => {
      const runId = createRunId();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      assert.match(runId, uuidRegex);
    });

    it('should generate unique IDs', () => {
      const id1 = createRunId();
      const id2 = createRunId();
      assert.notStrictEqual(id1, id2);
    });

    it('should return string type', () => {
      const runId = createRunId();
      assert.strictEqual(typeof runId, 'string');
    });
  });

  describe('countLines', () => {
    it('should count single line', () => {
      const code = 'print("hello")';
      const result = countLines(code);
      assert.strictEqual(result, 1);
    });

    it('should count multiple lines', () => {
      const code = 'line1\nline2\nline3';
      const result = countLines(code);
      assert.strictEqual(result, 3);
    });

    it('should handle empty string', () => {
      const code = '';
      const result = countLines(code);
      assert.strictEqual(result, 1); // Empty string still counts as 1 line
    });

    it('should handle string with only newlines', () => {
      const code = '\n\n\n';
      const result = countLines(code);
      assert.strictEqual(result, 4); // 3 newlines create 4 lines
    });

    it('should handle trailing newline', () => {
      const code = 'line1\nline2\n';
      const result = countLines(code);
      assert.strictEqual(result, 3); // Trailing newline creates empty third line
    });

    it('should handle Windows line endings', () => {
      const code = 'line1\r\nline2\r\nline3';
      const result = countLines(code);
      assert.strictEqual(result, 3);
    });
  });

  describe('countActCalls', () => {
    it('should count single .act() call', () => {
      const code = 'browser.act("click button")';
      const result = countActCalls(code);
      assert.strictEqual(result, 1);
    });

    it('should count multiple .act() calls', () => {
      const code = `
        browser.act("click button")
        browser.act("type text")
        browser.act("submit form")
      `;
      const result = countActCalls(code);
      assert.strictEqual(result, 3);
    });

    it('should ignore .act() calls in comments', () => {
      const code = `
        browser.act("click button")
        # This is a comment with browser.act("ignored")
        # Another comment browser.act("also ignored")
        browser.act("type text")
      `;
      const result = countActCalls(code);
      assert.strictEqual(result, 2);
    });

    it('should handle no .act() calls', () => {
      const code = `
        print("hello")
        x = 5
        browser.click("button")
      `;
      const result = countActCalls(code);
      assert.strictEqual(result, 0);
    });

    it('should handle empty string', () => {
      const code = '';
      const result = countActCalls(code);
      assert.strictEqual(result, 0);
    });

    it('should handle .act() with different spacing', () => {
      const code = `
        browser.act( "click button" )
        browser.act("type text")
        obj.act(param)
      `;
      const result = countActCalls(code);
      assert.strictEqual(result, 3);
    });

    it('should handle .act() calls on same line', () => {
      const code = 'browser.act("first"); browser.act("second")';
      const result = countActCalls(code);
      assert.strictEqual(result, 2);
    });

    it('should ignore commented lines with # at start', () => {
      const code = `
        browser.act("valid call")
        #browser.act("commented out")
        # browser.act("also commented")
           # browser.act("indented comment")
        browser.act("another valid call")
      `;
      const result = countActCalls(code);
      assert.strictEqual(result, 2);
    });

    it('should handle mixed content with comments', () => {
      const code = `
        # Setup code
        browser = Browser()
        
        # First action
        browser.act("navigate to page")
        
        # This is commented: browser.act("ignored")
        browser.act("click login")
        
        # Final action
        browser.act("submit form")
      `;
      const result = countActCalls(code);
      assert.strictEqual(result, 3);
    });
  });

  describe('fetchChromeDevToolsUrl', () => {
    it('should send fetchChromeDevToolsUrl message', () => {
      // Import the function that uses builderModeVscodeApi

      const { fetchChromeDevToolsUrl } = require('../../core/utils/builderModeUtils');

      // Clear any previous messages
      (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage = null;

      fetchChromeDevToolsUrl();

      const expectedMessage = {
        command: 'fetchChromeDevToolsUrl',
        url: 'http://localhost:9222/json',
      };

      assert.deepStrictEqual(
        (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage,
        expectedMessage
      );
    });
  });

  describe('sendTelemetry', () => {
    it('should send telemetry message', () => {
      // Import the function that uses builderModeVscodeApi

      const { sendTelemetry } = require('../../core/utils/builderModeUtils');

      // Clear any previous messages
      (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage = null;

      const testEvent = {
        eventName: 'test.event',
        properties: { test: 'value' },
      };

      sendTelemetry(testEvent);

      const expectedMessage = {
        command: 'sendTelemetry',
        eventName: 'test.event',
        properties: { test: 'value' },
      };

      assert.deepStrictEqual(
        (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage,
        expectedMessage
      );
    });
  });
});
