import * as assert from 'assert';

import * as SvgComponents from '../../core/utils/svg/index';
import '../setup';

describe('SVG Components Test Suite', () => {
  describe('Component Exports', () => {
    it('should export components that can be called', () => {
      // Test a few key components to ensure they're callable
      const testComponents = [
        SvgComponents.PlusIcon,
        SvgComponents.TrashIcon,
        SvgComponents.RunIcon,
        SvgComponents.SaveIcon,
      ];

      testComponents.forEach((Component) => {
        assert.doesNotThrow(() => {
          // This would create a React element in a real React environment
          // In our test environment, we just verify it's callable
          const result = Component();
          assert.ok(result, 'Component should return a value');
        });
      });
    });

    it('should have consistent naming pattern', () => {
      const exportedKeys = Object.keys(SvgComponents);

      exportedKeys.forEach((key) => {
        // Most components should end with 'Icon' except 'AiEdit'
        if (key !== 'AiEdit') {
          assert.ok(
            key.endsWith('Icon'),
            `Component ${key} should follow naming pattern ending with 'Icon'`
          );
        }

        // Should start with capital letter
        assert.ok(
          key[0] === key[0]?.toUpperCase(),
          `Component ${key} should start with capital letter`
        );
      });
    });
  });

  describe('Individual Components', () => {
    it('should export PlusIcon component', () => {
      assert.ok(SvgComponents.PlusIcon);
      assert.strictEqual(typeof SvgComponents.PlusIcon, 'function');
    });

    it('should export TrashIcon component', () => {
      assert.ok(SvgComponents.TrashIcon);
      assert.strictEqual(typeof SvgComponents.TrashIcon, 'function');
    });

    it('should export RunIcon component', () => {
      assert.ok(SvgComponents.RunIcon);
      assert.strictEqual(typeof SvgComponents.RunIcon, 'function');
    });

    it('should export SaveIcon component', () => {
      assert.ok(SvgComponents.SaveIcon);
      assert.strictEqual(typeof SvgComponents.SaveIcon, 'function');
    });

    it('should export AiEdit component with different naming', () => {
      assert.ok(SvgComponents.AiEdit);
      assert.strictEqual(typeof SvgComponents.AiEdit, 'function');
    });
  });
});
