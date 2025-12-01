import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
// eslint-disable-next-line import/order
import type { ExtensionContext, Uri } from 'vscode';

import { BuilderModeProvider } from '../../core/provider/builderModeProvider';
import { TelemetryClient } from '../../core/telemetry/client';
import { ImportSource } from '../../core/telemetry/events';
import '../setup';

describe('Link to README', () => {
  it('should have Troubleshooting section in README', () => {
    const readmePath = path.join(__dirname, '../../../README.md');
    const readmeContent = fs.readFileSync(readmePath, 'utf8');

    assert.ok(
      readmeContent.includes('# Troubleshooting'),
      'README.md must contain "# Troubleshooting" section'
    );
  });
});

interface MockPanel {
  reveal: sinon.SinonStub;
  webview: { postMessage: sinon.SinonStub };
}
interface MockCurrentPanel {
  panel: MockPanel;
  postMessageToWebview: sinon.SinonStub;
  getDefaultStarterScript: sinon.SinonStub;
}

type BuilderModeProviderStatics = {
  currentPanel?: MockCurrentPanel;
  loadExistingPanel: (args: {
    currentPanel: MockCurrentPanel;
    initialContent?: string | string[];
    initialContentSource?: ImportSource;
    initialTab?: string;
  }) => Promise<void>;
};

describe('BuilderModeProvider.show (existing panel path)', () => {
  let mockPanel: MockPanel;

  beforeEach(() => {
    mockPanel = { reveal: sinon.stub(), webview: { postMessage: sinon.stub() } };
  });

  afterEach(() => {
    sinon.restore();
    (BuilderModeProvider as unknown as BuilderModeProviderStatics).currentPanel = undefined;
  });

  it('calls loadExistingPanel when currentPanel exists', async () => {
    const mockCurrentPanel: MockCurrentPanel = {
      panel: mockPanel,
      postMessageToWebview: sinon.stub(),
      getDefaultStarterScript: sinon.stub().returns(['default']),
    };

    const statics = BuilderModeProvider as unknown as BuilderModeProviderStatics;
    statics.currentPanel = mockCurrentPanel;

    const loadExistingPanelStub = sinon.stub(statics, 'loadExistingPanel').resolves();

    await BuilderModeProvider.show(
      { extensionUri: {} as Uri } as ExtensionContext,
      'test script',
      ImportSource.FILE
    );

    assert.ok(loadExistingPanelStub.calledOnce, 'loadExistingPanel should be called');
    assert.deepStrictEqual(loadExistingPanelStub.firstCall.args[0], {
      currentPanel: mockCurrentPanel,
      initialContent: 'test script',
      initialContentSource: ImportSource.FILE,
      initialTab: undefined,
    });
  });
});

describe('BuilderModeProvider.loadExistingPanel', () => {
  let telemetryStub: sinon.SinonStub;
  let mockPanel: MockPanel;

  beforeEach(() => {
    telemetryStub = sinon.stub(TelemetryClient.prototype, 'captureScriptImported');
    mockPanel = { reveal: sinon.stub(), webview: { postMessage: sinon.stub() } };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('reveals panel and emits telemetry when initialContentSource provided', async () => {
    const mockCurrentPanel: MockCurrentPanel = {
      panel: mockPanel,
      postMessageToWebview: sinon.stub(),
      getDefaultStarterScript: sinon.stub().returns(['default']),
    };

    await (BuilderModeProvider as unknown as BuilderModeProviderStatics).loadExistingPanel({
      currentPanel: mockCurrentPanel,
      initialContent: 'test script',
      initialContentSource: ImportSource.COPILOT,
    });

    assert.ok(mockPanel.reveal.calledOnce, 'panel.reveal should be called once');
    assert.ok(
      telemetryStub.calledWith(ImportSource.COPILOT),
      'captureScriptImported should be called with ImportSource.COPILOT'
    );
  });

  it('reveals panel and does not emit import telemetry when initialContentSource not provided', async () => {
    const mockCurrentPanel: MockCurrentPanel = {
      panel: mockPanel,
      postMessageToWebview: sinon.stub(),
      getDefaultStarterScript: sinon.stub().returns(['default']),
    };

    await (BuilderModeProvider as unknown as BuilderModeProviderStatics).loadExistingPanel({
      currentPanel: mockCurrentPanel,
      initialContent: 'test script',
    });

    assert.ok(mockPanel.reveal.calledOnce, 'panel.reveal should be called once');
    assert.ok(telemetryStub.notCalled, 'captureScriptImported should not be called');
  });
});
