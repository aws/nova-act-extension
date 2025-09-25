import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { useCells } from '../../../core/context/CellsContext';
import { useOutput } from '../../../core/context/OutputContext';
import { type Cell } from '../../../core/types/builder';
import {
  getAllHtmlFilePaths,
  openActionViewer,
  openSessionViewer,
} from '../../../core/utils/actionViewer';
import { CopyToClipboardIcon } from '../../../core/utils/svg';
import { Tooltip } from '../Tooltip';

type CellOption = Cell & { index: number };

export const Output = () => {
  const { cells, cellsOutputHistory, clearTrigger } = useCells();
  const { selectedOutput, setSelectedOutput } = useOutput();

  const [options, setOptions] = useState<CellOption[]>([]);

  const outputBodyRef = useRef<HTMLDivElement>(null);

  const outputToDisplay = useMemo(() => {
    // no cells available
    if (!cells.length) return ['Add a cell to view output'];
    // cells available and view all output selected
    if (cells.length && selectedOutput === undefined) {
      return cellsOutputHistory.length ? cellsOutputHistory : ['No output available'];
    }
    // cells available and single output selected
    if (selectedOutput) {
      const output = cells[selectedOutput]?.output;
      return output?.length ? output : ['No output available'];
    }
    // fallback
    return ['No output available'];
  }, [JSON.stringify(cells), selectedOutput]);

  useEffect(() => {
    setOptions(cells.map((cell, index) => ({ ...cell, index })));
  }, [JSON.stringify(cells)]);

  useEffect(() => {
    setSelectedOutput(undefined);
  }, [clearTrigger]);

  // Auto-scroll to bottom when output content changes
  useEffect(() => {
    if (outputBodyRef.current) {
      const element = outputBodyRef.current;

      const scrollToBottom = () => {
        requestAnimationFrame(() => {
          element.scrollTop = element.scrollHeight;
        });
      };

      // Scroll immediately when content changes
      scrollToBottom();

      // Also set up a MutationObserver to catch any DOM changes
      const observer = new MutationObserver(() => {
        scrollToBottom();
      });

      observer.observe(element, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      return () => {
        observer.disconnect();
      };
    }
  }, [JSON.stringify(outputToDisplay)]);

  const hasStartFailedError = () => {
    const lastOutput = outputToDisplay?.at(-1);
    if (!lastOutput) return false;
    const o = lastOutput.toLowerCase();
    return o.includes('startfailed');
  };

  const getStartFailedMessage = () => {
    if (!hasStartFailedError()) return null;
    return 'StartFailed detected - This usually indicates a browser connection issue. Browser may not be running or it is already running on on port 9222. Check the Warning button of the cell for next steps.';
  };

  const handleSelectCell = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value) || value === -1) {
      setSelectedOutput(undefined);
    } else {
      setSelectedOutput(value);
    }
  };

  const outputTags = useMemo(() => {
    const outputTags: JSX.Element[] = [];

    outputToDisplay.forEach((o) => {
      const outputString = o;
      const htmlFiles = getAllHtmlFilePaths(outputString);

      if (htmlFiles.length === 0) {
        outputTags.push(<>{outputString}</>);
        return;
      }

      const parts: ReactNode[] = [];
      let lastIndex = 0;

      htmlFiles.forEach((file, index) => {
        // Add text before this file
        const textPart = outputString.substring(lastIndex, file.endIndex);
        if (textPart) {
          parts.push(textPart);
        }

        // Add buttons for this file
        parts.push(
          <div key={`action-viewer-${index}`} className="action-viewer-section">
            <button
              onClick={() => openActionViewer(file.filePath)}
              className="action-viewer-btn-below"
              title={`Open Action Viewer for ${file.filePath}`}
              type="button"
            >
              View your act run
            </button>
            <button
              onClick={() => openSessionViewer(file.filePath)}
              className="action-viewer-btn-below"
              title={`Open Session Viewer for ${file.filePath}`}
              type="button"
            >
              View your session
            </button>
          </div>
        );

        lastIndex = file.endIndex;
      });

      if (lastIndex < outputString.length) {
        const remainingText = outputString.substring(lastIndex);
        if (remainingText) {
          parts.push(remainingText);
        }
      }

      const outputTag = <div className="output-with-multiple-viewers">{parts}</div>;
      outputTags.push(outputTag);
    });

    return outputTags;
  }, [JSON.stringify(outputToDisplay)]);

  return (
    <div className="dev-tab-output-container">
      <div className="dev-tab-menu-container">
        <select
          onChange={handleSelectCell}
          value={selectedOutput}
          disabled={!cells.length}
          className="output-cell-select"
          name="Cell output"
          id="cell-output-select"
        >
          {!cells.length && <option value={undefined}>Add a cell to view output</option>}
          {!!cells.length && <option value={undefined}>View all cell outputs</option>}
          {options.map((o, index) => (
            <option key={`cell-option-${o.id}`} value={index}>{`Cell [${o.index + 1}]`}</option>
          ))}
        </select>
        <Tooltip content={'Copy logs to clipboard'} position="left">
          <button
            className="secondary-button"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(outputToDisplay.join('\n'));
            }}
            aria-label="Copy logs to clipboard"
          >
            <CopyToClipboardIcon />
          </button>
        </Tooltip>
      </div>
      <div className="dev-tab-output-body" ref={outputBodyRef}>
        {hasStartFailedError() && (
          <div className="start-failed-message">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              <span>{getStartFailedMessage()}</span>
            </div>
          </div>
        )}
        {outputTags}
      </div>
    </div>
  );
};
