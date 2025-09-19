import { useEffect, useRef, useState } from 'react';

import { useCells } from '../../../core/context/CellsContext';
import { type Cell, type CellAction } from '../../../core/types/builder';
import { PlusIcon, RunIcon, StopIcon, TrashIcon } from '../../../core/utils/svg';
import logger from '../../webviewLogger';
import { Tooltip } from '../Tooltip';

type CellControlsProps = {
  index: number;
  cell: Cell;
  onRun: () => void;
  onCancel: () => void;
  isRunning: boolean;
  disableActions: boolean;
};

export const CellControls = ({
  cell,
  onCancel,
  onRun,
  isRunning,
  disableActions,
  index,
}: CellControlsProps) => {
  const debugButtonRef = useRef<HTMLButtonElement>(null);
  const [showPortConflictMenu, setShowPortConflictMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [showDebugMenu, setShowDebugMenu] = useState(false);

  const { deleteCell, addCell } = useCells();

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDebugMenu(false);
      setShowPortConflictMenu(false);
    };

    if (showDebugMenu || showPortConflictMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDebugMenu, showPortConflictMenu]);

  const addCellAfter = (): void => {
    if (index === -1) return;
    addCell({ code: '', output: [], afterIndex: index + 1 });
    logger.debug(`Added cell after index ${index}`);
  };

  // Cell actions system
  const cellActions: CellAction[] = [];

  const getActiveActions = () => {
    return cellActions.filter((action) => action.matcher(cell.code));
  };

  return (
    <div className="cell-overlay-controls">
      {/* Contextual action buttons */}
      {getActiveActions().map((action) => (
        <button
          key={action.id}
          ref={debugButtonRef}
          className="cell-overlay-btn"
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuPosition({ top: rect.bottom + 5, left: rect.left });
            action.action(cell.id);
          }}
          title={action.title}
        >
          {action.icon}
        </button>
      ))}

      {!isRunning ? (
        <Tooltip content={'Run cell'} position="left">
          <button
            className="cell-overlay-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRun();
            }}
            aria-label="Run Cell"
            disabled={disableActions}
          >
            <RunIcon />
          </button>
        </Tooltip>
      ) : (
        <Tooltip content={'Stop cell'} position="left">
          <button
            className="cell-overlay-btn"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            aria-label="Stop Cell"
          >
            <StopIcon />
          </button>
        </Tooltip>
      )}
      {
        <Tooltip content={'Add cell below'} position="left">
          <button
            className="cell-overlay-btn"
            onClick={(e) => {
              e.stopPropagation();
              addCellAfter();
            }}
            aria-label="Add Cell Below"
            disabled={disableActions}
          >
            <PlusIcon />
          </button>
        </Tooltip>
      }

      <Tooltip content={'Delete cell'} position="left">
        <button
          className="cell-overlay-btn"
          onClick={(e) => {
            e.stopPropagation();
            deleteCell(cell.id);
          }}
          disabled={disableActions}
          aria-label="Delete Cell"
        >
          <TrashIcon />
        </button>
      </Tooltip>
      {showDebugMenu && (
        <div
          className="debug-action-menu"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <div className="debug-menu-header">🐛 Debug Helper</div>
          <div className="debug-menu-item">🚧 Coming Soon!</div>
          <div className="debug-menu-description">
            Advanced debugging tools and helpers for your code.
          </div>
        </div>
      )}

      {/* Port Conflict Menu */}
      {showPortConflictMenu && (
        <div
          className="port-conflict-menu"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <div className="port-conflict-menu-header">Port 9222 Troubleshooting</div>

          <div className="port-conflict-menu-section">
            <div className="port-conflict-menu-title">Check what's using port 9222:</div>
            <div className="port-conflict-command-item">
              <code>lsof -i :9222</code>
              <button
                className="copy-command-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText('lsof -i :9222');
                }}
                title="Copy command"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="port-conflict-menu-section">
            <div className="port-conflict-menu-title">Kill process (replace PID):</div>
            <div className="port-conflict-command-item">
              <code>kill -9 &lt;PID&gt;</code>
              <button
                className="copy-command-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText('kill -9 <PID>');
                }}
                title="Copy command"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="port-conflict-menu-actions">
            <div
              className="port-conflict-menu-item"
              onClick={() => {
                setShowPortConflictMenu(false);
                onRun(); // Retry the cell
              }}
            >
              Try Again
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
