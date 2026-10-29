import * as assert from 'assert';
import type { ExtensionContext, Webview } from 'vscode';

import type * as BuilderModePage from '../../core/pages/builderModePage';
import '../setup';

// Required in before() so the vscode mock from ../setup is installed first, whatever
// order mocha loads the test files in.
let builderModePage: typeof BuilderModePage;

before(() => {
  builderModePage = require('../../core/pages/builderModePage');
});

const CSP_SOURCE = 'vscode-webview://test-csp-source';

const mockWebview = {
  asWebviewUri: (uri: { path: string }) => `vscode-webview://test${uri.path}`,
  cspSource: CSP_SOURCE,
} as unknown as Webview;

const mockContext = {
  extensionUri: { path: '/extension' },
} as unknown as ExtensionContext;

function getCspDirectives(nodeEnv: string | undefined): Map<string, string[]> {
  const originalNodeEnv = process.env.NODE_ENV;
  if (nodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = nodeEnv;
  }

  try {
    const html = builderModePage._getBuilderModeWebviewContent(mockWebview, mockContext);
    const match = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html);
    assert.ok(match?.[1], 'Builder Mode HTML must include a CSP meta tag');

    const directives = new Map<string, string[]>();
    for (const directive of match[1].split(';')) {
      const [name, ...sources] = directive.trim().split(/\s+/);
      if (name) {
        directives.set(name, sources);
      }
    }
    return directives;
  } finally {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  }
}

describe('Builder Mode webview CSP', () => {
  describe('production', () => {
    const directives = () => getCspDirectives('production');

    it("does not allow 'unsafe-eval' in any directive", () => {
      for (const [name, sources] of directives()) {
        assert.ok(!sources.includes("'unsafe-eval'"), `${name} must not allow 'unsafe-eval'`);
      }
    });

    it('does not allow the local dev server', () => {
      for (const [name, sources] of directives()) {
        assert.ok(
          !sources.some((source) => source.includes('localhost:3000')),
          `${name} must not allow the dev server`
        );
      }
    });

    it('keeps the sources Builder Mode and Monaco load from', () => {
      const csp = directives();
      const scriptSrc = csp.get('script-src') ?? [];
      assert.ok(scriptSrc.includes(CSP_SOURCE), 'script-src must allow the webview bundle');
      assert.ok(scriptSrc.includes('https://unpkg.com'), 'script-src must allow the Monaco CDN');
      assert.deepStrictEqual(csp.get('worker-src'), ['blob:', 'https://unpkg.com']);
    });
  });

  describe('development', () => {
    for (const nodeEnv of ['development', undefined]) {
      it(`keeps 'unsafe-eval' and the dev server for NODE_ENV=${String(nodeEnv)}`, () => {
        const scriptSrc = getCspDirectives(nodeEnv).get('script-src') ?? [];
        assert.ok(scriptSrc.includes("'unsafe-eval'"), "dev script-src must allow 'unsafe-eval'");
        assert.ok(scriptSrc.includes('http://localhost:3000'), 'dev script-src must allow HMR');
      });
    }
  });
});
