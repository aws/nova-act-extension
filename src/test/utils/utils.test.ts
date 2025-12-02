import * as assert from 'assert';

import { concatMessage, convertErrorToString, validateJsonPayload } from '../../core/utils/utils';
import '../setup';

describe('Utils Test Suite', () => {
  describe('convertErrorToString', () => {
    it('should return "{}" for undefined', () => {
      const result = convertErrorToString(undefined);
      assert.strictEqual(result, '{}');
    });

    it('should return "{}" for null', () => {
      const result = convertErrorToString(null);
      assert.strictEqual(result, '{}');
    });

    it('should return error message for Error object', () => {
      const error = new Error('Test error message');
      const result = convertErrorToString(error);
      assert.strictEqual(result, 'Test error message');
    });

    it('should return string as-is for string input', () => {
      const errorString = 'String error message';
      const result = convertErrorToString(errorString);
      assert.strictEqual(result, errorString);
    });

    it('should return JSON string for object when forcePropertyNames is true', () => {
      const error = new Error('Test error');
      error.name = 'CustomError';
      const result = convertErrorToString(error, true);
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.message, 'Test error');
      assert.strictEqual(parsed.name, 'CustomError');
      // Stack should be excluded due to BLOCKLISTED_KEYS
      assert.strictEqual(parsed.stack, undefined);
    });

    it('should handle custom error objects', () => {
      const customError = { message: 'Custom error', code: 500 };
      const result = convertErrorToString(customError);
      // For objects with message property, it returns the message directly
      assert.strictEqual(result, 'Custom error');
    });

    it('should handle objects without message property', () => {
      const obj = { data: 'test', value: 42 };
      const result = convertErrorToString(obj);
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.data, 'test');
      assert.strictEqual(parsed.value, 42);
    });

    it('should handle custom error objects with forcePropertyNames', () => {
      const customError = { message: 'Custom error', code: 500 };
      const result = convertErrorToString(customError, true);
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.message, 'Custom error');
      assert.strictEqual(parsed.code, 500);
    });
  });

  describe('concatMessage', () => {
    it('should return message as-is when under MAX_LENGTH', () => {
      const shortMessage = 'This is a short message';
      const result = concatMessage(shortMessage);
      assert.strictEqual(result, shortMessage);
    });

    it('should truncate message when over MAX_LENGTH (500 chars)', () => {
      const longMessage = 'a'.repeat(600); // 600 characters
      const result = concatMessage(longMessage);
      assert.strictEqual(result.length, 503); // 500 + '...'
      assert.strictEqual(result.slice(-3), '...');
      assert.strictEqual(result.slice(0, 500), 'a'.repeat(500));
    });

    it('should handle exactly MAX_LENGTH message', () => {
      const exactMessage = 'a'.repeat(500); // Exactly 500 characters
      const result = concatMessage(exactMessage);
      assert.strictEqual(result, exactMessage);
      assert.strictEqual(result.length, 500);
    });

    it('should handle empty string', () => {
      const result = concatMessage('');
      assert.strictEqual(result, '');
    });

    it('should handle message with exactly MAX_LENGTH + 1', () => {
      const message = 'a'.repeat(501); // 501 characters
      const result = concatMessage(message);
      assert.strictEqual(result.length, 503); // 500 + '...'
      assert.strictEqual(result.slice(-3), '...');
    });
  });

  describe('validateJsonPayload', () => {
    it('should return true for valid JSON string', () => {
      const validJson = '{"key": "value", "number": 42}';
      const result = validateJsonPayload(validJson);
      assert.strictEqual(result, true);
    });

    it('should return true for valid JSON array', () => {
      const validJsonArray = '[1, 2, 3, "test"]';
      const result = validateJsonPayload(validJsonArray);
      assert.strictEqual(result, true);
    });

    it('should return true for simple JSON values', () => {
      assert.strictEqual(validateJsonPayload('true'), true);
      assert.strictEqual(validateJsonPayload('false'), true);
      assert.strictEqual(validateJsonPayload('null'), true);
      assert.strictEqual(validateJsonPayload('42'), true);
      assert.strictEqual(validateJsonPayload('"string"'), true);
    });

    it('should return false for invalid JSON', () => {
      const invalidJson = '{"key": value}'; // missing quotes around value
      const result = validateJsonPayload(invalidJson);
      assert.strictEqual(result, false);
    });

    it('should return false for malformed JSON', () => {
      const malformedJson = '{"key": "value",}'; // trailing comma
      const result = validateJsonPayload(malformedJson);
      assert.strictEqual(result, false);
    });

    it('should return false for empty string', () => {
      const result = validateJsonPayload('');
      assert.strictEqual(result, false);
    });

    it('should return false for plain text', () => {
      const plainText = 'This is not JSON';
      const result = validateJsonPayload(plainText);
      assert.strictEqual(result, false);
    });

    it('should return false for unclosed braces', () => {
      const unclosedJson = '{"key": "value"';
      const result = validateJsonPayload(unclosedJson);
      assert.strictEqual(result, false);
    });
  });
});
