// Action data interfaces
export interface ActionStep {
  stepNumber: number;
  currentUrl: string;
  timestamp: string;
  imageData?: string;
  actionData?: string;
  actId?: string;
  fileName?: string;
}

export interface ActionGroup {
  actId: string;
  prompt: string;
  fileName: string;
  timestamp: string;
  steps: ActionStep[];
}

export interface ActionData {
  actId: string;
  prompt: string;
  steps: ActionStep[];
  isFolder?: boolean;
  fileCount?: number;
  actions?: ActionGroup[]; // For grouped view when isFolder is true
  sessionCreatedTime?: string | null; // For session creation timestamp
  sessionId?: string | null; // For session ID extracted from path
}

// Messages from extension to Action Viewer webview
export type ExtensionToActionViewerMessage = {
  type: 'actionData';
  filePath: string;
  data: ActionData | null;
  error?: string;
};

// Messages from Action Viewer webview to extension
export type ActionViewerToExtensionMessage = {
  type: 'ready';
};
