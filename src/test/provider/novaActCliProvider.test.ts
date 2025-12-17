/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/order */
import { STSClient } from '@aws-sdk/client-sts';
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
});

suite('AWS Credential Validation Tests', () => {
  let provider: NovaActCliProvider;
  let mockContext: MockContext;
  let mockWebview: any;

  setup(() => {
    mockContext = {
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    };
    provider = new NovaActCliProvider(mockContext as any, '/mock/path/act');
    mockWebview = {
      postMessage: () => {},
    };
  });

  test('handleValidateAwsCredentials posts success message with identity', async () => {
    const mockIdentity = { UserId: 'test', Account: '123', Arn: 'arn:aws:iam::123:user/test' };
    const mockSend = async () => mockIdentity;
    const originalSend = STSClient.prototype.send;
    STSClient.prototype.send = mockSend as any;

    let postedMessage: any;
    mockWebview.postMessage = (msg: any) => {
      postedMessage = msg;
    };

    await provider.handleValidateAwsCredentials(mockWebview, false);

    assert.strictEqual(postedMessage.type, 'awsCredentialsValidationResult');
    assert.strictEqual(postedMessage.success, true);
    assert.deepStrictEqual(postedMessage.identity, mockIdentity);
    assert.strictEqual(postedMessage.isRefresh, false);

    STSClient.prototype.send = originalSend;
  });

  test('handleValidateAwsCredentials posts error message on failure', async () => {
    const mockSend = async () => {
      throw new Error('Invalid credentials');
    };
    const originalSend = STSClient.prototype.send;
    STSClient.prototype.send = mockSend as any;

    let postedMessage: any;
    mockWebview.postMessage = (msg: any) => {
      postedMessage = msg;
    };

    await provider.handleValidateAwsCredentials(mockWebview, false);

    assert.strictEqual(postedMessage.type, 'awsCredentialsValidationResult');
    assert.strictEqual(postedMessage.success, false);
    assert.ok(postedMessage.error.includes('Invalid credentials'));
    assert.strictEqual(postedMessage.isRefresh, false);

    STSClient.prototype.send = originalSend;
  });

  test('handleValidateAwsCredentials respects isRefresh flag', async () => {
    const mockIdentity = { UserId: 'test', Account: '123', Arn: 'arn:aws:iam::123:user/test' };
    const mockSend = async () => mockIdentity;
    const originalSend = STSClient.prototype.send;
    STSClient.prototype.send = mockSend as any;

    let postedMessage: any;
    mockWebview.postMessage = (msg: any) => {
      postedMessage = msg;
    };

    await provider.handleValidateAwsCredentials(mockWebview, true);

    assert.strictEqual(postedMessage.isRefresh, true);

    STSClient.prototype.send = originalSend;
  });
});
