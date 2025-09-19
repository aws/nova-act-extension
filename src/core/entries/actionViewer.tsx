import React from 'react';
import { createRoot } from 'react-dom/client';

import { ActionViewer } from '../../components/ActionViewer';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { WebviewKind } from '../telemetry/events';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <ErrorBoundary kind={WebviewKind.ACTION_VIEWER}>
    <ActionViewer />
  </ErrorBoundary>
);
