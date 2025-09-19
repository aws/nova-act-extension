import * as vscode from 'vscode';

export class Logger implements vscode.Disposable {
  private output = vscode.window.createOutputChannel('Nova Act VS Code Extension');
  private visible = false;
  private context?: vscode.ExtensionContext;

  setContext(context: vscode.ExtensionContext) {
    this.context = context;
  }

  debug(str: string) {
    if (this.context?.extensionMode === vscode.ExtensionMode.Development) {
      const lines = str.split(/\r?\n/gm);
      while (lines.length > 0 && /^\s*$/.test(lines[lines.length - 1]!)) {
        lines.pop();
      }
      this.output.appendLine(lines.join('\n'));
    }
  }

  log(str: string) {
    const lines = str.split(/\r?\n/gm);
    while (lines.length > 0 && /^\s*$/.test(lines[lines.length - 1]!)) {
      lines.pop();
    }
    this.output.appendLine(lines.join('\n'));
  }
  toggle = () => {
    this.visible = !this.visible;
    this.output.show();
    if (this.visible) this.output.show();
    else this.output.hide();
  };
  error(str: string | Error) {
    const errorMessage = str instanceof Error ? str.message : str;
    this.output.appendLine(`ERROR: ${errorMessage}`);
  }
  trace(str: string, ...args: unknown[]) {
    const message = args.length > 0 ? `${str} ${args.join(' ')}` : str;
    this.output.appendLine(`TRACE: ${message}`);
  }
  dispose() {
    this.output.dispose();
  }
}

export default new Logger();
