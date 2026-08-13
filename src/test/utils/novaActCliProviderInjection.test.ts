/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { NovaActCliProvider } from '../../core/provider/novaActCliProvider';
import '../setup';

// Regression test: OS command injection in the Nova Act CLI provider (CWE-78).
// Workflow name / payload / region flow from an untrusted webview message into a command
// STRING that would be run with `shell: true`. Shell metacharacters in those fields ($(...),
// ;, ', backticks) would then be interpreted by /bin/sh. The fix passes the CLI path
// and every argument as a literal argv vector (shell: false), so metacharacters are inert.
describe('NovaActCliProvider command injection', () => {
  // POSIX-shell payloads (touch, $(...), ;) do not apply to Windows cmd.exe.
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
      // `echo` as the CLI path makes the child process a harmless no-op that exits 0.
      const provider = new NovaActCliProvider(mockContext as any, 'echo');
      // Command-substitution payload: fires inside the double-quoted --name "$(...)".
      const maliciousName = `$(touch ${marker})`;
      try {
        await provider.deployWorkflow(maliciousName, 'us-east-1', '/tmp', mockWebview as any);
      } catch {
        // A non-zero exit / thrown error is irrelevant to whether the payload ran.
      }
      provider.dispose();
      assert.strictEqual(
        fs.existsSync(marker),
        false,
        'workflow name was passed to a shell — command substitution executed (RCE)'
      );
    });
  });

  maybe('listWorkflows', () => {
    it('must not execute a shell payload embedded in the region', async () => {
      const marker = freshMarker('region');
      const provider = new NovaActCliProvider(mockContext as any, 'echo');
      // listWorkflows interpolated the region UNQUOTED (`--region ${region}`), so it
      // needs a BARE-metacharacter payload — a quote-breaking payload would false-negative
      // even against the vulnerable code (there are no surrounding quotes to break out of).
      const maliciousRegion = `us-east-1; touch ${marker}`;
      try {
        await provider.listWorkflows(maliciousRegion);
      } catch {
        // ignore
      }
      provider.dispose();
      assert.strictEqual(
        fs.existsSync(marker),
        false,
        'region was passed to a shell — injected command executed (RCE)'
      );
    });
  });

  maybe('handleInvokeRuntime', () => {
    it('must not execute a shell payload embedded in the runtime payload', async () => {
      const marker = freshMarker('invoke');
      const provider = new NovaActCliProvider(mockContext as any, 'echo');
      // Single-quote breakout: payload is interpolated into --payload '<payload>'.
      const maliciousPayload = `'; touch ${marker}; echo '`;
      try {
        await provider.handleInvokeRuntime(
          { name: 'wf', payload: maliciousPayload },
          mockWebview as any
        );
      } catch {
        // ignore
      }
      provider.dispose();
      assert.strictEqual(
        fs.existsSync(marker),
        false,
        'runtime payload was passed to a shell — injected command executed (RCE)'
      );
    });
  });
});
