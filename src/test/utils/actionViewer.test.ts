import * as assert from 'assert';

import {
  getAllHtmlFilePaths,
  getHtmlFilePath,
  getSessionDirectoryFromHtmlPath,
  handleOpenActionViewer,
  openActionViewer,
  openSessionViewer,
} from '../../core/utils/actionViewer';
import '../setup';

describe('ActionViewer Test Suite', () => {
  beforeEach(() => {
    // Clear any previous messages
    (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage = null;
  });

  describe('getHtmlFilePath', () => {
    it('should extract HTML file path from output text', () => {
      const output = '** View your act run here: /path/to/report.html';
      const result = getHtmlFilePath(output);
      assert.strictEqual(result, '/path/to/report.html');
    });

    it('should handle output with extra whitespace', () => {
      const output = '**   View your act run here:   /path/to/report.html   ';
      const result = getHtmlFilePath(output);
      assert.strictEqual(result, '/path/to/report.html');
    });

    it('should return null for output without HTML file', () => {
      const output = 'Some other output text';
      const result = getHtmlFilePath(output);
      assert.strictEqual(result, null);
    });

    it('should return null for empty output', () => {
      const result = getHtmlFilePath('');
      assert.strictEqual(result, null);
    });

    it('should handle different file paths', () => {
      const output = '** View your act run here: C:\\Users\\test\\report.html';
      const result = getHtmlFilePath(output);
      assert.strictEqual(result, 'C:\\Users\\test\\report.html');
    });

    it('should handle relative paths', () => {
      const output = '** View your act run here: ./reports/test.html';
      const result = getHtmlFilePath(output);
      assert.strictEqual(result, './reports/test.html');
    });
  });

  describe('getAllHtmlFilePaths', () => {
    it('should find multiple HTML file paths', () => {
      const output = `
        First run completed.
        ** View your act run here: /path/to/first.html
        Second run completed.
        ** View your act run here: /path/to/second.html
        Done.
      `;
      const result = getAllHtmlFilePaths(output);

      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0]?.filePath, '/path/to/first.html');
      assert.strictEqual(result[1]?.filePath, '/path/to/second.html');
      assert.ok(typeof result[0]?.startIndex === 'number');
      assert.ok(typeof result[0]?.endIndex === 'number');
    });

    it('should return empty array for output without HTML files', () => {
      const output = 'No HTML files here';
      const result = getAllHtmlFilePaths(output);
      assert.deepStrictEqual(result, []);
    });

    it('should return empty array for empty output', () => {
      const result = getAllHtmlFilePaths('');
      assert.deepStrictEqual(result, []);
    });

    it('should handle single HTML file path', () => {
      const output = '** View your act run here: single.html';
      const result = getAllHtmlFilePaths(output);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]?.filePath, 'single.html');
    });

    it('should provide correct indices for replacement', () => {
      const output = 'Start ** View your act run here: test.html End';
      const result = getAllHtmlFilePaths(output);

      assert.strictEqual(result.length, 1);
      const match = result[0];
      assert.ok(match);

      const extractedText = output.substring(match.startIndex, match.endIndex);
      assert.strictEqual(extractedText, '** View your act run here: test.html');
    });
  });

  describe('openActionViewer', () => {
    it('should post message to VS Code API', () => {
      const htmlFilePath = '/path/to/test.html';
      openActionViewer(htmlFilePath);

      const lastMessage = (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage;
      assert.deepStrictEqual(lastMessage, {
        command: 'openActionViewer',
        htmlFilePath: '/path/to/test.html',
        actionViewerFilePath: undefined,
        actionViewerFolderPath: undefined,
      });
    });

    it('should handle empty file path gracefully', () => {
      openActionViewer('');

      // Should not post message for empty path
      const lastMessage = (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage;
      assert.strictEqual(lastMessage, null);
    });
  });

  describe('getSessionDirectoryFromHtmlPath', () => {
    it('should extract session directory from HTML file path', () => {
      const htmlFilePath = '/path/to/session123/act_abc123.html';
      const result = getSessionDirectoryFromHtmlPath(htmlFilePath);
      assert.strictEqual(result, '/path/to/session123');
    });

    it('should handle Windows paths', () => {
      const htmlFilePath = 'C:\\path\\to\\session456\\act_def456.html';
      const result = getSessionDirectoryFromHtmlPath(htmlFilePath);
      assert.strictEqual(result, 'C:\\path\\to\\session456');
    });

    it('should handle nested paths', () => {
      const htmlFilePath = '/deep/nested/path/session789/act_ghi789.html';
      const result = getSessionDirectoryFromHtmlPath(htmlFilePath);
      assert.strictEqual(result, '/deep/nested/path/session789');
    });

    it('should return null for empty path', () => {
      const result = getSessionDirectoryFromHtmlPath('');
      assert.strictEqual(result, null);
    });

    it('should return null for root file', () => {
      const result = getSessionDirectoryFromHtmlPath('act_test.html');
      assert.strictEqual(result, null);
    });
  });

  describe('openSessionViewer', () => {
    it('should post message to VS Code API with session directory', () => {
      const htmlFilePath = '/path/to/session123/act_abc123.html';
      openSessionViewer(htmlFilePath);

      const lastMessage = (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage;
      assert.deepStrictEqual(lastMessage, {
        command: 'openActionViewer',
        actionViewerFolderPath: '/path/to/session123',
      });
    });

    it('should handle Windows paths', () => {
      const htmlFilePath = 'C:\\sessions\\session456\\act_def456.html';
      openSessionViewer(htmlFilePath);

      const lastMessage = (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage;
      assert.deepStrictEqual(lastMessage, {
        command: 'openActionViewer',
        actionViewerFolderPath: 'C:\\sessions\\session456',
      });
    });

    it('should not post message for invalid path', () => {
      openSessionViewer('');

      const lastMessage = (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage;
      assert.strictEqual(lastMessage, null);
    });
  });

  describe('handleOpenActionViewer', () => {
    it('should extract and open HTML file from output', () => {
      const output = 'Process completed. ** View your act run here: /test/report.html';
      handleOpenActionViewer(output);

      const lastMessage = (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage;
      assert.deepStrictEqual(lastMessage, {
        command: 'openActionViewer',
        htmlFilePath: '/test/report.html',
        actionViewerFilePath: undefined,
        actionViewerFolderPath: undefined,
      });
    });

    it('should do nothing if no HTML file found', () => {
      const output = 'Process completed without HTML file.';
      handleOpenActionViewer(output);

      const lastMessage = (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage;
      assert.strictEqual(lastMessage, null);
    });

    it('should handle first HTML file if multiple exist', () => {
      const output = `
        ** View your act run here: /first.html
        ** View your act run here: /second.html
      `;
      handleOpenActionViewer(output);

      const lastMessage = (global as unknown as { lastVsCodeMessage?: unknown }).lastVsCodeMessage;
      assert.deepStrictEqual(lastMessage, {
        command: 'openActionViewer',
        htmlFilePath: '/first.html',
        actionViewerFilePath: undefined,
        actionViewerFolderPath: undefined,
      });
    });
  });
});
