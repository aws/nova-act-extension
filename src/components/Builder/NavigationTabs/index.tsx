import { useEffect, useRef, useState } from 'react';

import { useInitialTab } from '../../../core/context/InitialTabContext';
import { TAB_NAMES } from '../../../core/types/sidebarMessages';
import { AuthenticateTab } from '../AuthenticateTab';
import { BrowserViewPanel } from '../BrowserViewPanel';
import { DeployTab } from '../DeployTab';
import { DeveloperTabs } from '../DeveloperTabs';
import { NotebookPanel } from '../NotebookPanel';
import { WorkflowsTab } from '../WorkflowsTab';
import './index.css';

const RESIZE_HANDLE_WIDTH = 12;

export const NavigationTabs = () => {
  const { activeTab, navigateToTab } = useInitialTab();
  const [devToolsUrl, setDevToolsUrl] = useState('');
  const [browserIsExpanded, setBrowserIsExpanded] = useState(true);
  const [isOverlayVisible, setOverlayVisible] = useState(true);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'init' && msg.initialTab) {
        navigateToTab(msg.initialTab);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigateToTab]);

  // refs
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const topRowRef = useRef<HTMLDivElement>(null);
  const bottomRowRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const leftColumnWidthRef = useRef<number>(50); // Default 50%

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const leftColumn = leftColumnRef.current;
      const rightColumn = rightColumnRef.current;

      if (!leftColumn || !rightColumn) return;
      const leftWidth = leftColumn.offsetWidth;
      leftColumn.style.pointerEvents = 'none';
      rightColumn.style.pointerEvents = 'none';

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const newLeftWidth = leftWidth + deltaX;
        const containerWidth = leftColumn.parentElement?.offsetWidth || 1;
        const newPercentage = (newLeftWidth / containerWidth) * 100;
        leftColumnWidthRef.current = newPercentage;
        leftColumn.style.width = `${newLeftWidth}px`;
        rightColumn.style.width = `calc(100% - ${newLeftWidth}px - ${RESIZE_HANDLE_WIDTH}px)`;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        leftColumn.style.pointerEvents = 'auto';
        rightColumn.style.pointerEvents = 'auto';
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    resizeHandleRef.current?.addEventListener('mousedown', handleMouseDown);

    return () => {
      resizeHandleRef.current?.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateColumnWidths = () => {
      const leftColumn = leftColumnRef.current;
      const rightColumn = rightColumnRef.current;
      if (!leftColumn || !rightColumn) return;

      const containerWidth = container.offsetWidth;
      const leftWidth = (containerWidth * leftColumnWidthRef.current) / 100;

      leftColumn.style.width = `${leftWidth}px`;
      rightColumn.style.width = `calc(100% - ${leftWidth}px - ${RESIZE_HANDLE_WIDTH}px)`;
    };

    const resizeObserver = new ResizeObserver(() => {
      updateColumnWidths();
    });

    resizeObserver.observe(container);

    updateColumnWidths();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="tab-container">
      <div className="tab-header">
        <button
          className={`tab-button ${activeTab === TAB_NAMES.AUTHENTICATE && 'active'}`}
          data-tab="authenticate"
          onClick={() => navigateToTab(TAB_NAMES.AUTHENTICATE)}
        >
          Authenticate
        </button>
        <button
          className={`tab-button ${activeTab === TAB_NAMES.BUILD && 'active'}`}
          data-tab="build"
          onClick={() => navigateToTab(TAB_NAMES.BUILD)}
        >
          Build
        </button>
        <button
          className={`tab-button ${activeTab === TAB_NAMES.DEPLOY && 'active'}`}
          data-tab="deploy"
          onClick={() => navigateToTab(TAB_NAMES.DEPLOY)}
        >
          Deploy
        </button>
        <button
          className={`tab-button ${activeTab === TAB_NAMES.RUN_WORKFLOWS && 'active'}`}
          data-tab="runWorkflows"
          onClick={() => navigateToTab(TAB_NAMES.RUN_WORKFLOWS)}
        >
          Run
        </button>
      </div>
      <div className="tab-content">
        <div
          id="authenticate-tab"
          className={`tab-pane ${activeTab === TAB_NAMES.AUTHENTICATE ? 'active' : ''}`}
        >
          <main className="full-width-layout">
            <AuthenticateTab />
          </main>
        </div>
        <div id="build-tab" className={`tab-pane ${activeTab === TAB_NAMES.BUILD ? 'active' : ''}`}>
          <main ref={containerRef} className="two-column-layout">
            <div ref={leftColumnRef} className="left-column">
              <NotebookPanel
                setDevToolsUrl={setDevToolsUrl}
                collapseView={(collapse: boolean) => {
                  setBrowserIsExpanded(collapse);
                  setOverlayVisible(collapse);
                }}
              />
            </div>
            <div ref={resizeHandleRef} className="resize-handle" />
            <div ref={rightColumnRef} className="right-column">
              <div ref={topRowRef} className={`top-row ${browserIsExpanded ? 'expanded' : ''}`}>
                <section className="panel browser-panel">
                  <BrowserViewPanel
                    isExpanded={browserIsExpanded}
                    toggleExpand={() => setBrowserIsExpanded(!browserIsExpanded)}
                    devToolsUrl={devToolsUrl}
                    isOverlayVisible={isOverlayVisible}
                    toggleOverlay={() => setOverlayVisible(!isOverlayVisible)}
                  />
                </section>
              </div>
              <div className={`right-column-separator ${!browserIsExpanded && 'disabled'}`} />
              <div
                ref={bottomRowRef}
                className={`bottom-row ${!browserIsExpanded ? 'expanded' : ''}`}
              >
                <section className="panel">
                  <DeveloperTabs
                    isExpanded={!browserIsExpanded}
                    toggleExpand={() => setBrowserIsExpanded(!browserIsExpanded)}
                  />
                </section>
              </div>
            </div>
          </main>
        </div>
        <div
          id="deploy-tab"
          className={`tab-pane ${activeTab === TAB_NAMES.DEPLOY ? 'active' : ''}`}
        >
          <main className="full-width-layout">
            <DeployTab />
          </main>
        </div>
        <div
          id="runWorkflows-tab"
          className={`tab-pane ${activeTab === TAB_NAMES.RUN_WORKFLOWS ? 'active' : ''}`}
        >
          <main className="full-width-layout">
            <WorkflowsTab onNavigateToTab={navigateToTab} />
          </main>
        </div>
      </div>
    </div>
  );
};
