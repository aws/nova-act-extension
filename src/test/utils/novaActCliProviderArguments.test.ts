/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { NovaActCliProvider } from '../../core/provider/novaActCliProvider';
import '../setup';

describe('NovaActCliProvider argument handling', () => {
  const maybe = process.platform === 'win32' ? describe.skip : describe;

  const mockContext = {
    globalState: { get: () => undefined, update: () => Promise.resolve() },
  };
  const mockWebview = { postMessage: () => Promise.resolve(true) };

  let markers: string[] = [];
  function freshMarker(tag: string): string {
    const m = path.join(
      os.tmpdir(),
      `nova-act-t2-${tag}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    if (fs.existsSync(m)) {
      fs.unlinkSync(m);
    }
    markers.push(m);
    return m;
  }
  afterEach(() => {
    for (const m of markers) {
      if (fs.existsSync(m)) {
        fs.unlinkSync(m);
      }
    }
    markers = [];
  });

  maybe('deployWorkflow', () => {
    it('must not execute a shell payload embedded in the workflow name', async () => {
      const marker = freshMarker('deploy');
      const provider = new NovaActCliProvider(mockContext as any, 'echo');
      const shellMetaName = `$(touch ${marker})`;
      try {
        await provider.deployWorkflow(shellMetaName, 'us-east-1', '/tmp', mockWebview as any);
      } catch {}
      provider.dispose();
      assert.strictEqual(
        fs.existsSync(marker),
        false,
        'workflow name reached a shell: command substitution was evaluated'
      );
    });
  });

  maybe('listWorkflows', () => {
    it('must not execute a shell payload embedded in the region', async () => {
      const marker = freshMarker('region');
      const provider = new NovaActCliProvider(mockContext as any, 'echo');
      const shellMetaRegion = `us-east-1; touch ${marker}`;
      try {
        await provider.listWorkflows(shellMetaRegion);
      } catch {}
      provider.dispose();
      assert.strictEqual(
        fs.existsSync(marker),
        false,
        'region reached a shell: the chained command was evaluated'
      );
    });
  });

  maybe('handleInvokeRuntime', () => {
    it('must not execute a shell payload embedded in the runtime payload', async () => {
      const marker = freshMarker('invoke');
      const provider = new NovaActCliProvider(mockContext as any, 'echo');
      const shellMetaPayload = `'; touch ${marker}; echo '`;
      try {
        await provider.handleInvokeRuntime(
          { name: 'wf', payload: shellMetaPayload },
          mockWebview as any
        );
      } catch {}
      provider.dispose();
      assert.strictEqual(
        fs.existsSync(marker),
        false,
        'runtime payload reached a shell: the chained command was evaluated'
      );
    });
  });

  maybe('executeNovaActCommand (no shell, no field validation)', () => {
    it('must not interpret shell metacharacters in an argv element', async () => {
      const marker = freshMarker('argv');
      const provider = new NovaActCliProvider(mockContext as any, 'echo');
      try {
        await provider.executeNovaActCommand([`$(touch ${marker})`]);
      } catch {}
      provider.dispose();
      assert.strictEqual(
        fs.existsSync(marker),
        false,
        'argv element was shell-parsed: a shell has been reintroduced'
      );
    });

    it('must not interpret a semicolon-chained command in an argv element', async () => {
      const marker = freshMarker('argv-semi');
      const provider = new NovaActCliProvider(mockContext as any, 'echo');
      try {
        await provider.executeNovaActCommand(['hello', `; touch ${marker}`]);
      } catch {}
      provider.dispose();
      assert.strictEqual(
        fs.existsSync(marker),
        false,
        'argv element was shell-parsed: a shell has been reintroduced'
      );
    });
  });

  describe('CLI argument contracts', () => {
    const provider = () => new NovaActCliProvider(mockContext as any, 'echo');

    it('accepts every name the service contract allows, including leading - and _', async () => {
      for (const name of [
        'wf',
        'my-workflow',
        'my_workflow_1',
        '-leading-dash',
        '_leading_underscore',
        'a'.repeat(40),
      ]) {
        const p = provider();
        await p.deployWorkflow(name, 'us-east-1', '/tmp', mockWebview as any).catch((e: Error) => {
          assert.ok(
            !/Invalid workflow name/.test(e.message),
            `contract-valid name "${name}" was rejected: ${e.message}`
          );
        });
        p.dispose();
      }
    });

    it('rejects names outside the service contract', async () => {
      for (const name of ['', 'has space', 'has.dot', 'has/slash', 'a'.repeat(41)]) {
        await assert.rejects(
          () => provider().deployWorkflow(name, 'us-east-1', '/tmp', mockWebview as any),
          /Invalid workflow name/,
          `expected "${name}" to be rejected`
        );
      }
    });

    it('accepts region ids the service allows and rejects malformed ones', async () => {
      const p = provider();
      await p.listWorkflows('ap-southeast-3').catch((e: Error) => {
        assert.ok(!/Invalid region/.test(e.message), `legit region rejected: ${e.message}`);
      });
      p.dispose();
      await assert.rejects(() => provider().listWorkflows('US-EAST-1'), /Invalid region/);
      await assert.rejects(() => provider().listWorkflows('us east 1'), /Invalid region/);
    });

    it('passes options in --opt=value form so a leading - is never parsed as a flag', async () => {
      const seen: string[][] = [];
      const p = provider();
      (p as any).executeNovaActCommand = (args: string[]) => {
        seen.push(args);
        return Promise.resolve('');
      };
      await p.deployWorkflow('-leading-dash', 'us-east-1', '/tmp', mockWebview as any);
      p.dispose();
      const args = seen[0] ?? [];
      assert.ok(
        args.includes('--name=-leading-dash'),
        `expected --name=-leading-dash in argv, got: ${JSON.stringify(args)}`
      );
      assert.ok(
        !args.includes('-leading-dash'),
        `value must not be a standalone argv element: ${JSON.stringify(args)}`
      );
    });

    it('handleInvokeRuntime reports an error for a name outside the contract', async () => {
      const posted: any[] = [];
      const spyWebview = {
        postMessage: (m: any) => {
          posted.push(m);
          return Promise.resolve(true);
        },
      };
      const p = provider();
      await p.handleInvokeRuntime({ name: 'has space', payload: '{}' }, spyWebview as any);
      p.dispose();
      const errorText = JSON.stringify(posted);
      assert.ok(
        /Invalid workflow name/.test(errorText),
        `expected an "Invalid workflow name" error to be posted, got: ${errorText.slice(0, 300)}`
      );
    });
  });
});
