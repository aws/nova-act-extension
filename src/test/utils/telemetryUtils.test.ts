import * as assert from 'assert';

import { type RawProperties, wrapProperties } from '../../core/utils/telemetryUtils';
import '../setup';

describe('TelemetryUtils Test Suite', () => {
  describe('wrapProperties', () => {
    it('should wrap string values', () => {
      const input: RawProperties = {
        message: 'test message',
        status: 'success',
      };
      const result = wrapProperties(input);

      assert.deepStrictEqual(result.message, { stringValue: 'test message' });
      assert.deepStrictEqual(result.status, { stringValue: 'success' });
    });

    it('should wrap number values', () => {
      const input: RawProperties = {
        count: 42,
        duration: 1.5,
        negative: -10,
      };
      const result = wrapProperties(input);

      assert.deepStrictEqual(result.count, { numberValue: 42 });
      assert.deepStrictEqual(result.duration, { numberValue: 1.5 });
      assert.deepStrictEqual(result.negative, { numberValue: -10 });
    });

    it('should wrap boolean values', () => {
      const input: RawProperties = {
        success: true,
        failed: false,
      };
      const result = wrapProperties(input);

      assert.deepStrictEqual(result.success, { booleanValue: true });
      assert.deepStrictEqual(result.failed, { booleanValue: false });
    });

    it('should wrap string array values', () => {
      const input: RawProperties = {
        tags: ['tag1', 'tag2', 'tag3'],
        empty_array: [],
      };
      const result = wrapProperties(input);

      assert.deepStrictEqual(result.tags, { stringArrayValue: ['tag1', 'tag2', 'tag3'] });
      assert.deepStrictEqual(result.empty_array, { stringArrayValue: [] });
    });

    it('should skip undefined and null values', () => {
      const input = {
        defined: 'value',
        undefinedValue: undefined,
        nullValue: null,
      } as unknown as RawProperties;

      const result = wrapProperties(input);

      assert.deepStrictEqual(result.defined, { stringValue: 'value' });
      assert.strictEqual(result.undefinedValue, undefined);
      assert.strictEqual(result.nullValue, undefined);
    });

    it('should handle mixed property types', () => {
      const input: RawProperties = {
        name: 'test',
        count: 5,
        active: true,
        tags: ['a', 'b'],
      };
      const result = wrapProperties(input);

      assert.deepStrictEqual(result.name, { stringValue: 'test' });
      assert.deepStrictEqual(result.count, { numberValue: 5 });
      assert.deepStrictEqual(result.active, { booleanValue: true });
      assert.deepStrictEqual(result.tags, { stringArrayValue: ['a', 'b'] });
    });

    it('should handle empty object', () => {
      const input: RawProperties = {};
      const result = wrapProperties(input);

      assert.deepStrictEqual(result, {});
    });

    it('should handle zero and empty string values', () => {
      const input: RawProperties = {
        zero: 0,
        empty_string: '',
        false_value: false,
      };
      const result = wrapProperties(input);

      assert.deepStrictEqual(result.zero, { numberValue: 0 });
      assert.deepStrictEqual(result.empty_string, { stringValue: '' });
      assert.deepStrictEqual(result.false_value, { booleanValue: false });
    });

    it('should reject mixed arrays (non-string arrays)', () => {
      const input = {
        valid_array: ['a', 'b', 'c'],
        mixed_array: ['a', 1, 'c'],
        number_array: [1, 2, 3],
      } as unknown as RawProperties;

      const result = wrapProperties(input);

      assert.deepStrictEqual(result.valid_array, { stringArrayValue: ['a', 'b', 'c'] });
      assert.strictEqual(result.mixed_array, undefined);
      assert.strictEqual(result.number_array, undefined);
    });

    it('should handle special number values', () => {
      const input: RawProperties = {
        infinity: Infinity,
        negative_infinity: -Infinity,
        not_a_number: NaN,
      };
      const result = wrapProperties(input);

      assert.deepStrictEqual(result.infinity, { numberValue: Infinity });
      assert.deepStrictEqual(result.negative_infinity, { numberValue: -Infinity });
      // NaN should still be wrapped as a number (even though it's NaN)
      assert.ok(result.not_a_number);
      assert.ok('numberValue' in result.not_a_number);
      assert.ok(Number.isNaN(result.not_a_number.numberValue));
    });
  });
});
