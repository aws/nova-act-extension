import { createRoot } from 'react-dom/client';

import { ErrorBoundary } from '../../components/ErrorBoundary';
import { SideBarPanel } from '../../components/SideBar';
import { WebviewKind } from '../telemetry/events';
import { installGlobalErrorHooks } from '../utils/webviewErrorBridge';
import './sidebarGlobal.css';

installGlobalErrorHooks(WebviewKind.SIDEBAR);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary kind={WebviewKind.SIDEBAR}>
      <SideBarPanel />
    </ErrorBoundary>
  );
}
