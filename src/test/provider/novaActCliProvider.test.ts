/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';

import { NovaActCliProvider } from '../../core/provider/novaActCliProvider';

interface MockContext {
  globalState: {
    get: () => undefined;
    update: () => Promise<void>;
  };
}

suite('NovaActCliProvider Tests', () => {
  let provider: NovaActCliProvider;
  let mockContext: MockContext;

  setup(() => {
    mockContext = {
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    };
    provider = new NovaActCliProvider(mockContext as any, '/mock/path/act');
  });

  test('constructor sets extension context and path', () => {
    assert.strictEqual(provider.getNovaActPath(), '/mock/path/act');
  });

  test('setNovaActPath updates path', () => {
    provider.setNovaActPath('/new/path/act');
    assert.strictEqual(provider.getNovaActPath(), '/new/path/act');
  });

  test('createEnhancedEnvironment returns environment object', async () => {
    const env = await provider.createEnhancedEnvironment();
    assert.ok(typeof env === 'object');
    assert.ok(env !== null);
  });

  test('validateCli returns false for undefined path', async () => {
    const providerWithoutPath = new NovaActCliProvider(mockContext as any);
    providerWithoutPath.setNovaActPath('');
    const result = await providerWithoutPath.validateCli();
    assert.strictEqual(result, false);
  });

  test('validateDocker calls validation command', async () => {
    const result = await provider.validateDocker();
    assert.ok(typeof result === 'boolean');
  });

  test('validateAwsCredentials calls validation command', async () => {
    const result = await provider.validateAwsCredentials();
    assert.ok(typeof result === 'boolean');
  });
});
