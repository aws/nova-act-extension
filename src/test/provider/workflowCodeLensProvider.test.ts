import * as assert from 'assert';
import * as vscode from 'vscode';

import { WorkflowCodeLensProvider } from '../../core/integration/workflowCodeLensProvider';

suite('WorkflowCodeLensProvider Tests', () => {
  let provider: WorkflowCodeLensProvider;

  setup(() => {
    provider = new WorkflowCodeLensProvider();
  });

  test('detects Workflow imports correctly', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: 'from nova_act import Workflow\n\nwith Workflow() as workflow:\n    pass',
      language: 'python',
    });

    const codeLenses = provider.provideCodeLenses(
      document,
      new vscode.CancellationTokenSource().token
    );
    assert.ok(Array.isArray(codeLenses));
    assert.strictEqual(codeLenses.length, 2); // Two CodeLens actions per match
  });

  test('returns empty array for non-Python files', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: 'with Workflow() as workflow:\n    pass',
      language: 'javascript',
    });

    const codeLenses = provider.provideCodeLenses(
      document,
      new vscode.CancellationTokenSource().token
    );
    assert.ok(Array.isArray(codeLenses));
    assert.strictEqual(codeLenses.length, 0);
  });

  test('returns empty array when no Workflow imports found', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: 'with SomeOtherClass() as obj:\n    pass',
      language: 'python',
    });

    const codeLenses = provider.provideCodeLenses(
      document,
      new vscode.CancellationTokenSource().token
    );
    assert.ok(Array.isArray(codeLenses));
    assert.strictEqual(codeLenses.length, 0);
  });

  test('handles multiple Workflow instances', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: `from nova_act import Workflow

with Workflow() as workflow1:
    pass

with Workflow() as workflow2:
    pass`,
      language: 'python',
    });

    const codeLenses = provider.provideCodeLenses(
      document,
      new vscode.CancellationTokenSource().token
    );
    assert.ok(Array.isArray(codeLenses));
    assert.strictEqual(codeLenses.length, 4); // 2 actions × 2 matches
  });
});
