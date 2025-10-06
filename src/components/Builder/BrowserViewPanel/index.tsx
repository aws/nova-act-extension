import { useEffect, useState } from 'react';

import {
  CaptionsIcon,
  FullscreenIcon,
  PanelTopCloseIcon,
  PanelTopOpenIcon,
} from '../../../core/utils/svg';
import { AgentOverlay } from '../AgentOverlay';
import { Loader } from '../Loader';
import { Tooltip } from '../Tooltip';
import { WidthCalcFrame } from './WidthCalcFrame';
import './index.css';

interface BrowserViewPanelProps {
  readonly devToolsUrl: string;
  readonly isExpanded: boolean;
  readonly toggleExpand: () => void;
  readonly toggleOverlay: () => void;
  readonly isOverlayVisible: boolean;
}

export const BrowserViewPanel = ({
  isExpanded,
  toggleExpand,
  devToolsUrl,
  isOverlayVisible,
  toggleOverlay,
}: BrowserViewPanelProps) => {
  const [receivedWidth, setReceivedWidth] = useState();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const onFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Event listener for event dispatched by <WidthCalcFrame />
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleEvent(e: any) {
      setReceivedWidth(e.detail.width + 6);
    }
    window.document.addEventListener('myWidthUpdate', handleEvent, false);
  }, []);

  return (
    <>
      <div className={`panel-header ${isExpanded && 'expanded'}`}>
        <div className="panel-header-left">
          <button className={`tab-button active`} data-tab="build-run">
            Live view
          </button>
        </div>
        <div className="panel-header-buttons">
          <Tooltip
            content={isOverlayVisible ? 'Turn agent captions off' : 'Turn agent captions on'}
            position="left"
          >
            <button
              className={`${!isOverlayVisible && 'secondary-button'} captions-button`}
              onClick={toggleOverlay}
              aria-label={isOverlayVisible ? 'Agent captions on' : 'Agent captions off'}
            >
              <CaptionsIcon />
              Captions: {isOverlayVisible ? 'ON' : 'OFF'}
            </button>
          </Tooltip>

          <Tooltip content="Fullscreen view" position="left">
            <button onClick={onFullscreenToggle} aria-label="Fullscreen view">
              <FullscreenIcon />
            </button>
          </Tooltip>
          <Tooltip content={isExpanded ? 'Hide live view' : 'Show live view'} position="left">
            <button
              aria-label={isExpanded ? 'Hide live view' : 'Show live view'}
              onClick={toggleExpand}
              className={`${isExpanded && 'expanded'}`}
            >
              {isExpanded ? <PanelTopOpenIcon /> : <PanelTopCloseIcon />}
            </button>
          </Tooltip>
        </div>
      </div>
      <div
        className="devtools-container"
        style={{
          display: 'block',
          height: isExpanded ? 'auto' : '0',
          border: isExpanded ? 'revert-layer' : 'none',
        }}
      >
        {devToolsUrl ? (
          receivedWidth ? (
            <iframe
              className="devtools-iframe"
              src={devToolsUrl}
              allow="clipboard-read; clipboard-write"
              style={{ width: `calc( 100% + ${receivedWidth}px )`, height: '100%' }}
            />
          ) : (
            <>
              <Loader />
              <WidthCalcFrame devToolsUrl={devToolsUrl} />
            </>
          )
        ) : (
          <div className="placeholder-content">
            <span>
              Live view not available, set the{' '}
              <span className="code-span">NOVA_ACT_BROWSER_ARGS</span> env variable and run Nova Act
              to see the live view.
            </span>
          </div>
        )}
        <AgentOverlay isVisible={isOverlayVisible} />
      </div>
      {isFullscreen && (
        <div className="fullscreen-modal">
          <div className="fullscreen-header">
            <h2>Browser</h2>
            <div className="fullscreen-header-buttons">
              <button
                className={`${!isOverlayVisible && 'secondary-button'} captions-button`}
                onClick={toggleOverlay}
                title="Toggle Agent Activity"
              >
                <CaptionsIcon />
                Captions: {isOverlayVisible ? 'ON' : 'OFF'}
              </button>
              <button onClick={onFullscreenToggle}>Exit fullscreen</button>
            </div>
          </div>
          {devToolsUrl ? (
            receivedWidth ? (
              <iframe
                className="fullscreen-iframe"
                src={devToolsUrl}
                allow="clipboard-read; clipboard-write"
                style={{ width: `calc( 100% + ${receivedWidth ?? '250'}px )`, height: '100%' }}
              />
            ) : (
              <Loader />
            )
          ) : (
            <div className="placeholder-content">
              <span>
                Live view not available, set the{' '}
                <span className="code-span">NOVA_ACT_BROWSER_ARGS</span> env variable and run Nova
                Act to see the live view.
              </span>
            </div>
          )}
          <AgentOverlay isVisible={isOverlayVisible} />
        </div>
      )}
    </>
  );
};
