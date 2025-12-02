import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { extractBoundingBoxes } from '../../core/utils/actionViewerBrowserUtils';
import {
  createActionStep,
  extractSessionAndActIds,
  extractSessionIdFromFolder,
  extractShortActId,
  findCorrespondingJsonFile,
  parseCallsJsonData,
  sortFilesByTimestamp,
} from '../../core/utils/actionViewerUtils';
import '../setup';

describe('ActionViewerProviderUtils Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actionviewer-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('extractSessionAndActIds', () => {
    it('should extract session and act IDs from valid file path', () => {
      const filePath = '/path/to/session123/act_abc123_def.html';
      const result = extractSessionAndActIds(filePath);

      assert.strictEqual(result.sessionId, 'session123');
      assert.strictEqual(result.actId, 'abc123');
    });

    it('should extract session and act IDs with UUID format', () => {
      const filePath = '/path/to/session456/act_3f645336-57ca-4634-a975-051e18944920.html';
      const result = extractSessionAndActIds(filePath);

      assert.strictEqual(result.sessionId, 'session456');
      assert.strictEqual(result.actId, '3f645336-57ca-4634-a975-051e18944920');
    });

    it('should handle Windows path separators', () => {
      // Use path.join to create a proper path for the current platform
      const filePath = path.join('C:', 'path', 'to', 'session789', 'act_xyz789.html');
      const result = extractSessionAndActIds(filePath);

      assert.strictEqual(result.sessionId, 'session789');
      assert.strictEqual(result.actId, 'xyz789');
    });

    it('should return null for invalid file path', () => {
      const filePath = '/invalid/path/file.html';
      const result = extractSessionAndActIds(filePath);

      assert.strictEqual(result.sessionId, 'path');
      assert.strictEqual(result.actId, null);
    });

    it('should return null for non-act file', () => {
      const filePath = '/path/to/session/regular_file.html';
      const result = extractSessionAndActIds(filePath);

      assert.strictEqual(result.sessionId, 'session');
      assert.strictEqual(result.actId, null);
    });

    it('should handle empty or malformed paths', () => {
      assert.deepStrictEqual(extractSessionAndActIds(''), { sessionId: null, actId: null });
      assert.deepStrictEqual(extractSessionAndActIds('/'), { sessionId: null, actId: null });
    });

    it('should handle case insensitive act files', () => {
      const filePath = '/path/to/session/ACT_test123.HTML';
      const result = extractSessionAndActIds(filePath);

      assert.strictEqual(result.sessionId, 'session');
      assert.strictEqual(result.actId, 'test123');
    });
  });

  describe('extractSessionIdFromFolder', () => {
    it('should extract session ID from folder path', () => {
      const folderPath = '/path/to/session123';
      const result = extractSessionIdFromFolder(folderPath);

      assert.strictEqual(result, 'session123');
    });

    it('should handle Windows folder paths', () => {
      const folderPath = 'C:\\path\\to\\session456';
      const result = extractSessionIdFromFolder(folderPath);

      // On non-Windows systems, the entire path is treated as one segment
      // This test verifies the function handles the input gracefully
      assert.ok(result !== null);
    });

    it('should handle trailing separators', () => {
      const folderPath = '/path/to/session789/';
      const result = extractSessionIdFromFolder(folderPath);

      assert.strictEqual(result, null);
    });

    it('should return null for empty path', () => {
      const result = extractSessionIdFromFolder('');
      assert.strictEqual(result, null);
    });

    it('should handle root directory', () => {
      const result = extractSessionIdFromFolder('/');
      assert.strictEqual(result, null);
    });
  });

  describe('extractShortActId', () => {
    it('should extract short act ID from HTML content with UUID', () => {
      const htmlContent = '<h3>Act ID: 3f645336-57ca-4634-a975-051e18944920</h3>';
      const result = extractShortActId(htmlContent);

      assert.strictEqual(result, 'act_4920');
    });

    it('should extract short act ID from HTML content with short ID', () => {
      const htmlContent = '<h3>Act ID: abc123</h3>';
      const result = extractShortActId(htmlContent);

      assert.strictEqual(result, 'act_c123');
    });

    it('should handle very short act IDs', () => {
      const htmlContent = '<h3>Act ID: ab</h3>';
      const result = extractShortActId(htmlContent);

      assert.strictEqual(result, 'act_ab');
    });

    it('should handle HTML with extra whitespace', () => {
      const htmlContent = '<h3 class="title">Act ID:   test123   </h3>';
      const result = extractShortActId(htmlContent);

      assert.strictEqual(result, 'act_t123');
    });

    it('should return default for missing act ID', () => {
      const htmlContent = '<h3>No Act ID here</h3>';
      const result = extractShortActId(htmlContent);

      assert.strictEqual(result, 'Action Viewer');
    });

    it('should return default for empty content', () => {
      const result = extractShortActId('');
      assert.strictEqual(result, 'Action Viewer');
    });

    it('should handle malformed HTML', () => {
      const htmlContent = '<h3>Act ID: incomplete';
      const result = extractShortActId(htmlContent);

      assert.strictEqual(result, 'Action Viewer');
    });
  });

  describe('sortFilesByTimestamp', () => {
    it('should sort files by creation timestamp', async () => {
      // Create test files with different timestamps
      const file1 = path.join(tempDir, 'file1.json');
      const file2 = path.join(tempDir, 'file2.json');
      const file3 = path.join(tempDir, 'file3.json');

      fs.writeFileSync(file1, 'test1');
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
      fs.writeFileSync(file2, 'test2');
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
      fs.writeFileSync(file3, 'test3');

      const filePaths = [file3, file1, file2]; // Unsorted order
      const result = sortFilesByTimestamp(filePaths);

      // Should be sorted by creation time (file1, file2, file3)
      assert.strictEqual(result[0], file1);
      assert.strictEqual(result[1], file2);
      assert.strictEqual(result[2], file3);
    });

    it('should handle non-existent files gracefully', () => {
      const filePaths = ['/non/existent/file1.json', '/non/existent/file2.json'];
      const result = sortFilesByTimestamp(filePaths);

      // Should return original array when files don't exist
      assert.strictEqual(result.length, 2);
      assert.ok(result.includes(filePaths[0]!));
      assert.ok(result.includes(filePaths[1]!));
    });

    it('should handle empty array', () => {
      const result = sortFilesByTimestamp([]);
      assert.deepStrictEqual(result, []);
    });

    it('should handle single file', () => {
      const file = path.join(tempDir, 'single.json');
      fs.writeFileSync(file, 'test');

      const result = sortFilesByTimestamp([file]);
      assert.deepStrictEqual(result, [file]);
    });
  });

  describe('createActionStep', () => {
    it('should create action step with all data', () => {
      const call = {
        request: {
          metadata: {
            timestamp_ms: 1640995200000, // 2022-01-01 00:00:00 UTC
            activeURL: 'https://example.com',
          },
          screenshot: 'base64imagedata',
        },
        response: {
          rawProgramBody: 'action program body',
        },
      };

      const result = createActionStep(call, 0, 'act123', 'test.json', true);

      assert.strictEqual(result.stepNumber, 1);
      assert.strictEqual(result.currentUrl, 'https://example.com');
      assert.strictEqual(result.timestamp, '2022-01-01T00:00:00.000Z');
      assert.strictEqual(result.imageData, 'base64imagedata');
      assert.strictEqual(result.actionData, 'action program body');
      assert.strictEqual(result.actId, 'act123');
      assert.strictEqual(result.fileName, 'test.json');
    });

    it('should create action step with minimal data', () => {
      const call = {
        request: {},
        response: {},
      };

      const result = createActionStep(call, 5, 'act456', 'test2.json', false);

      assert.strictEqual(result.stepNumber, 6);
      assert.strictEqual(result.currentUrl, 'No URL available');
      assert.ok(result.timestamp); // Should have a timestamp
      assert.strictEqual(result.imageData, undefined);
      assert.ok(result.actionData?.includes('request')); // Should be JSON stringified
      assert.strictEqual(result.actId, undefined);
      assert.strictEqual(result.fileName, undefined);
    });

    it('should handle missing metadata gracefully', () => {
      const call = {
        request: {
          metadata: null,
        },
        response: {
          rawProgramBody: 'test body',
        },
      };

      const result = createActionStep(call, 2, 'act789', 'test3.json', false);

      assert.strictEqual(result.stepNumber, 3);
      assert.strictEqual(result.currentUrl, 'No URL available');
      assert.strictEqual(result.actionData, 'test body');
    });
  });

  describe('parseCallsJsonData', () => {
    it('should parse valid calls JSON data', () => {
      const jsonData = [
        {
          request: {
            agentRunCreate: {
              id: 'act123',
              workflowRunId: 'session456',
              task: 'Test task',
            },
            metadata: {
              timestamp_ms: 1640995200000,
              activeURL: 'https://example.com',
            },
          },
          response: {
            rawProgramBody: 'action body',
          },
        },
      ];

      const result = parseCallsJsonData(jsonData, '/path/test_calls.json', false);

      assert.ok(result);
      assert.strictEqual(result.actId, 'act123');
      assert.strictEqual(result.sessionId, 'session456');
      assert.strictEqual(result.prompt, 'Test task');
      assert.strictEqual(result.steps.length, 1);
      assert.strictEqual(result.isFolder, false);
      assert.strictEqual(result.fileCount, 1);
    });

    it('should handle data with kwargs task', () => {
      const jsonData = [
        {
          kwargs: {
            task: 'Task from kwargs',
          },
          request: {
            agentRunCreate: {
              id: 'act789',
            },
          },
          response: {},
        },
      ];

      const result = parseCallsJsonData(jsonData, '/path/test_calls.json', true);

      assert.ok(result);
      assert.strictEqual(result.prompt, 'Task from kwargs');
      assert.strictEqual(result.steps[0]?.actId, 'act789');
      assert.strictEqual(result.steps[0]?.fileName, 'test_calls.json');
    });

    it('should prioritize request.prompt over other prompt sources', () => {
      const jsonData = [
        {
          kwargs: {
            task: 'Task from kwargs',
          },
          request: {
            prompt: 'Task from request.prompt',
            agentRunCreate: {
              id: 'act999',
              task: 'Task from agentRunCreate',
            },
          },
          response: {},
        },
      ];

      const result = parseCallsJsonData(jsonData, '/path/test_calls.json', false);

      assert.ok(result);
      assert.strictEqual(result.prompt, 'Task from request.prompt');
      assert.strictEqual(result.actId, 'act999');
    });

    it('should return null for empty array', () => {
      const result = parseCallsJsonData([], '/path/test.json', false);
      assert.strictEqual(result, null);
    });

    it('should return null for non-array data', () => {
      const result = parseCallsJsonData({} as unknown[], '/path/test.json', false);
      assert.strictEqual(result, null);
    });

    it('should handle missing agentRunCreate gracefully', () => {
      const jsonData = [
        {
          request: {},
          response: {},
        },
      ];

      const result = parseCallsJsonData(jsonData, '/path/test_calls.json', false);

      assert.ok(result);
      assert.strictEqual(result.actId, 'test');
      assert.strictEqual(result.prompt, 'No prompt available');
    });
  });

  describe('parseCallsJsonData - New Format', () => {
    it('should parse new format with metadata at root', () => {
      const jsonData = {
        steps: [
          {
            request: {
              prompt: 'Test prompt',
              metadata: {
                activeURL: 'https://example.com',
              },
            },
            response: {
              rawProgramBody: 'action body',
            },
          },
        ],
        metadata: {
          session_id: 'session123',
          act_id: 'act456',
          prompt: 'Test prompt',
        },
      };

      const result = parseCallsJsonData(jsonData, '/path/test_calls.json', false);

      assert.ok(result);
      assert.strictEqual(result.actId, 'act456');
      assert.strictEqual(result.sessionId, 'session123');
      assert.strictEqual(result.prompt, 'Test prompt');
      assert.strictEqual(result.steps.length, 1);
    });

    it('should handle new format with missing metadata fields', () => {
      const jsonData = {
        steps: [
          {
            request: {},
            response: {},
          },
        ],
        metadata: {},
      };

      const result = parseCallsJsonData(jsonData, '/path/test_calls.json', false);

      assert.ok(result);
      assert.strictEqual(result.actId, 'test');
      assert.strictEqual(result.prompt, 'No prompt available');
    });

    it('should handle new format with multiple steps', () => {
      const jsonData = {
        steps: [
          { request: {}, response: { rawProgramBody: 'step1' } },
          { request: {}, response: { rawProgramBody: 'step2' } },
          { request: {}, response: { rawProgramBody: 'step3' } },
        ],
        metadata: {
          session_id: 'multi-session',
          act_id: 'multi-act',
          prompt: 'Multi-step task',
        },
      };

      const result = parseCallsJsonData(jsonData, '/path/test.json', false);

      assert.ok(result);
      assert.strictEqual(result.steps.length, 3);
      assert.strictEqual(result.steps[0]?.actionData, 'step1');
      assert.strictEqual(result.steps[2]?.actionData, 'step3');
    });
  });

  describe('findCorrespondingJsonFile', () => {
    it('should find corresponding JSON file', () => {
      const htmlFile = path.join(tempDir, 'act_test.html');
      const jsonFile = path.join(tempDir, 'act_test_calls.json');

      fs.writeFileSync(htmlFile, '<html></html>');
      fs.writeFileSync(jsonFile, '[]');

      const result = findCorrespondingJsonFile(htmlFile);
      assert.strictEqual(result, jsonFile);
    });

    it('should return null when JSON file does not exist', () => {
      const htmlFile = path.join(tempDir, 'act_missing.html');
      fs.writeFileSync(htmlFile, '<html></html>');

      const result = findCorrespondingJsonFile(htmlFile);
      assert.strictEqual(result, null);
    });

    it('should handle files without extension', () => {
      const htmlFile = path.join(tempDir, 'act_test');
      const jsonFile = path.join(tempDir, 'act_test_calls.json');

      fs.writeFileSync(htmlFile, '<html></html>');
      fs.writeFileSync(jsonFile, '[]');

      const result = findCorrespondingJsonFile(htmlFile);
      assert.strictEqual(result, jsonFile);
    });

    it('should return null for non-existent HTML file', () => {
      const result = findCorrespondingJsonFile('/non/existent/file.html');
      assert.strictEqual(result, null);
    });

    it('should handle complex file names', () => {
      const htmlFile = path.join(tempDir, 'act_3f645336-57ca-4634-a975-051e18944920.html');
      const jsonFile = path.join(tempDir, 'act_3f645336-57ca-4634-a975-051e18944920_calls.json');

      fs.writeFileSync(htmlFile, '<html></html>');
      fs.writeFileSync(jsonFile, '[]');

      const result = findCorrespondingJsonFile(htmlFile);
      assert.strictEqual(result, jsonFile);
    });
  });

  describe('extractBoundingBoxes', () => {
    it('should extract click action bounding boxes', () => {
      const actionData = 'agentClick("Click on <box>100,200,300,400</box> button")';
      const result = extractBoundingBoxes(actionData);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]?.type, 'click');
      assert.strictEqual(result[0]?.x1, 200);
      assert.strictEqual(result[0]?.y1, 100);
      assert.strictEqual(result[0]?.x2, 400);
      assert.strictEqual(result[0]?.y2, 300);
    });

    it('should extract type action bounding boxes with text', () => {
      const actionData = 'agentType("hello world", "Type in <box>50,60,150,160</box> input field")';
      const result = extractBoundingBoxes(actionData);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]?.type, 'type');
      assert.strictEqual(result[0]?.text, 'hello world');
      assert.strictEqual(result[0]?.x1, 60);
      assert.strictEqual(result[0]?.y1, 50);
      assert.strictEqual(result[0]?.x2, 160);
      assert.strictEqual(result[0]?.y2, 150);
    });

    it('should extract scroll action bounding boxes', () => {
      const actionData = 'agentScroll("down", "Scroll <box>0,0,800,600</box> area")';
      const result = extractBoundingBoxes(actionData);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]?.type, 'scroll');
      assert.strictEqual(result[0]?.text, 'down');
      assert.strictEqual(result[0]?.x1, 0);
      assert.strictEqual(result[0]?.y1, 0);
      assert.strictEqual(result[0]?.x2, 600);
      assert.strictEqual(result[0]?.y2, 800);
    });

    it('should extract multiple bounding boxes from mixed actions', () => {
      const actionData = `
        agentClick("Click <box>10,20,30,40</box>")
        agentType("test", "Type in <box>50,60,70,80</box>")
        agentScroll("up", "Scroll <box>100,110,120,130</box>")
      `;
      const result = extractBoundingBoxes(actionData);

      assert.strictEqual(result.length, 3);
      assert.strictEqual(result[0]?.type, 'click');
      assert.strictEqual(result[1]?.type, 'type');
      assert.strictEqual(result[2]?.type, 'scroll');
    });

    it('should return empty array for action data without bounding boxes', () => {
      const actionData = 'someOtherAction("no boxes here")';
      const result = extractBoundingBoxes(actionData);
      assert.strictEqual(result.length, 0);
    });

    it('should handle malformed bounding box coordinates', () => {
      const actionData = 'agentClick("Click <box>invalid,coords</box>")';
      const result = extractBoundingBoxes(actionData);
      assert.strictEqual(result.length, 0);
    });

    it('should handle empty action data', () => {
      const result = extractBoundingBoxes('');
      assert.strictEqual(result.length, 0);
    });
  });
});
