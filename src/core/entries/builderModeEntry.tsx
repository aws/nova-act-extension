import { createRoot } from 'react-dom/client';

import { BuilderMode } from '../../components/Builder';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { WebviewKind } from '../telemetry/events';
import { installGlobalErrorHooks } from '../utils/webviewErrorBridge';
import './builderModeGlobal.css';

installGlobalErrorHooks(WebviewKind.BUILDER);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary kind={WebviewKind.BUILDER}>
      <BuilderMode />
    </ErrorBoundary>
  );
}
