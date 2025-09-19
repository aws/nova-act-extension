import * as assert from 'assert';

import { parseActionHtml } from '../../core/utils/actionDataParser';
import '../setup';

describe('ActionDataParser Test Suite', () => {
  describe('parseActionHtml', () => {
    it('should parse valid HTML with all components', () => {
      const htmlContent = `
        <html>
          <body>
            <h3>Act ID: test-act-123</h3>
            <h3>Prompt: Navigate to example.com</h3>
            <div style="border: 1px solid #ddd; margin: 10px;">
              <h4>Step 1</h4>
              <a href="https://example.com">https://example.com</a>
              <strong>Timestamp:</strong> 2024-01-01 12:00:00
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGAWA0ddgAAAABJRU5ErkJggg==" />
              <pre>click("button")</pre>
            </div>
            <div style="border: 1px solid #ddd; margin: 10px;">
              <h4>Step 2</h4>
              <a href="https://example.com/page2">https://example.com/page2</a>
              <strong>Timestamp:</strong> 2024-01-01 12:01:00
              <pre>type("input", "test")</pre>
            </div>
          </body>
        </html>
      `;

      const result = parseActionHtml(htmlContent);

      assert.ok(result);
      assert.strictEqual(result.actId, 'test-act-123');
      assert.strictEqual(result.prompt, 'Navigate to example.com');
      assert.strictEqual(result.steps.length, 2);

      // Check first step
      const step1 = result.steps[0];
      assert.strictEqual(step1?.stepNumber, 1);
      assert.strictEqual(step1?.currentUrl, 'https://example.com');
      assert.strictEqual(step1?.timestamp, '2024-01-01 12:00:00');
      assert.ok(step1?.imageData?.startsWith('data:image/png;base64,'));
      assert.strictEqual(step1?.actionData, 'click("button")');

      // Check second step
      const step2 = result.steps[1];
      assert.strictEqual(step2?.stepNumber, 2);
      assert.strictEqual(step2?.currentUrl, 'https://example.com/page2');
      assert.strictEqual(step2?.timestamp, '2024-01-01 12:01:00');
      assert.strictEqual(step2?.imageData, undefined);
      assert.strictEqual(step2?.actionData, 'type("input", "test")');
    });

    it('should handle minimal HTML with missing components', () => {
      const htmlContent = `
        <html>
          <body>
            <h3>Act ID: minimal-act</h3>
            <div style="border: 1px solid #ddd;">
              <h4>Step 1</h4>
            </div>
          </body>
        </html>
      `;

      const result = parseActionHtml(htmlContent);

      assert.ok(result);
      assert.strictEqual(result.actId, 'minimal-act');
      assert.strictEqual(result.prompt, '');
      assert.strictEqual(result.steps.length, 1);

      const step = result.steps[0];
      assert.strictEqual(step?.stepNumber, 1);
      assert.strictEqual(step?.currentUrl, '');
      assert.strictEqual(step?.timestamp, '');
      assert.strictEqual(step?.imageData, undefined);
      assert.strictEqual(step?.actionData, undefined);
    });

    it('should return empty result for invalid HTML', () => {
      const invalidHtml = 'not valid html';
      const result = parseActionHtml(invalidHtml);
      assert.ok(result);
      assert.strictEqual(result.actId, '');
      assert.strictEqual(result.prompt, '');
      assert.strictEqual(result.steps.length, 0);
    });

    it('should return empty result for empty input', () => {
      const result = parseActionHtml('');
      assert.ok(result);
      assert.strictEqual(result.actId, '');
      assert.strictEqual(result.prompt, '');
      assert.strictEqual(result.steps.length, 0);
    });

    it('should handle HTML with no steps', () => {
      const htmlContent = `
        <html>
          <body>
            <h3>Act ID: no-steps</h3>
            <h3>Prompt: Test prompt</h3>
          </body>
        </html>
      `;

      const result = parseActionHtml(htmlContent);

      assert.ok(result);
      assert.strictEqual(result.actId, 'no-steps');
      assert.strictEqual(result.prompt, 'Test prompt');
      assert.strictEqual(result.steps.length, 0);
    });

    it('should handle steps with HTML tags in action data', () => {
      const htmlContent = `
        <html>
          <body>
            <h3>Act ID: html-tags</h3>
            <div style="border: 1px solid #ddd;">
              <h4>Step 1</h4>
              <pre>click("<strong>button</strong>")</pre>
            </div>
          </body>
        </html>
      `;

      const result = parseActionHtml(htmlContent);

      assert.ok(result);
      assert.strictEqual(result.steps.length, 1);
      assert.strictEqual(result.steps[0]?.actionData, 'click("button")');
    });

    it('should handle multiple steps with different formats', () => {
      const htmlContent = `
        <html>
          <body>
            <h3>Act ID: multi-format</h3>
            <div style="border: 1px solid #ddd;">
              <h4>Step 10</h4>
              <a href="https://test.com">https://test.com</a>
              <strong>Timestamp:</strong> 2024-01-01 10:00:00
            </div>
            <div style="border: 1px solid #ddd;">
              <h4>Step 5</h4>
              <strong>Timestamp:</strong> 2024-01-01 05:00:00
              <pre>navigate("https://example.com")</pre>
            </div>
          </body>
        </html>
      `;

      const result = parseActionHtml(htmlContent);

      assert.ok(result);
      assert.strictEqual(result.steps.length, 2);

      // Steps should maintain order from HTML
      assert.strictEqual(result.steps[0]?.stepNumber, 10);
      assert.strictEqual(result.steps[1]?.stepNumber, 5);
    });
  });
});
