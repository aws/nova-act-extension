export type CellOutput = string[];

export interface Cell {
  id: string;
  code: string;
  output: CellOutput;
  status?: 'idle' | 'running' | 'success' | 'error';
  hasNovaStart?: boolean;
}

export interface CellAction {
  id: string;
  icon: string;
  title: string;
  matcher: (code: string) => boolean;
  action: (cellId: string) => void;
}

export interface Template {
  name: string;
  description: string;
  cells: string[];
}

export interface ChromeDevToolsTab {
  description: string;
  devtoolsFrontendUrl: string;
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
}

// Type guard for ChromeDevToolsTab
export function isChromeDevToolsTab(data: unknown): data is ChromeDevToolsTab {
  return (
    typeof data === 'object' &&
    data !== null &&
    'devtoolsFrontendUrl' in data &&
    'id' in data &&
    'title' in data &&
    'type' in data &&
    'url' in data &&
    'webSocketDebuggerUrl' in data
  );
}

export function isChromeDevToolsTabsArray(data: unknown): data is ChromeDevToolsTab[] {
  return Array.isArray(data) && data.every(isChromeDevToolsTab);
}
