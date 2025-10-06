import React, { useEffect, useRef, useState } from 'react';

import loader from '@monaco-editor/loader';
import { type editor } from 'monaco-editor';

import { useCells } from '../../../core/context/CellsContext';
import { useFile } from '../../../core/context/FileContext';
import { useOutput } from '../../../core/context/OutputContext';
import { type Cell } from '../../../core/types/builder';
import { type ExtensionToBuilderModeMessage } from '../../../core/types/builderModeMessages';
import { getHtmlFilePath, handleOpenActionViewer } from '../../../core/utils/actionViewer';
import { CheckIcon } from '../../../core/utils/svg';
import logger from '../../webviewLogger';
import { Loader } from '../Loader';
import { CellControls } from './CellControls';
import './index.css';

interface NotebookCellProps {
  cell: Cell;
  index: number;
  containerWidth: number;
  isSelected: boolean;
  isRunning: boolean;
  disableActions: boolean;
  onRun: () => void;
  onCancel: () => void;
}

export const NotebookCell: React.FC<NotebookCellProps> = ({
  cell,
  index,
  containerWidth,
  isSelected,
  isRunning,
  onRun,
  disableActions,
  onCancel,
}) => {
  const { selectCell, updateCell } = useCells();
  const { setHasUnsavedChanges } = useFile();
  const { setSelectedOutput } = useOutput();
  const editorReference = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerReference = useRef<HTMLDivElement>(null);

  const [isLongRunning, setIsLongRunning] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'vs-dark' | 'vs-light' | 'hc-black'>('vs-dark');

  const MONACO_CONTAINER_MIN_HEIGHT = 32;

  // Auto-resize based on content including wrapped lines
  const updateHeight = () => {
    if (editorReference.current == null) {
      return;
    }
    const currentModel = editorReference.current.getModel();
    if (currentModel == null) {
      return;
    }

    // Get the actual content height which includes wrapped lines
    const contentHeight = editorReference.current.getContentHeight();
    const newHeight = Math.max(contentHeight, MONACO_CONTAINER_MIN_HEIGHT); // Add padding

    if (containerReference.current) {
      containerReference.current.style.height = `${newHeight}px`;
    }
    editorReference.current.layout();
  };

  const updateCellCode = (code: string): void => {
    setHasUnsavedChanges(true);
    updateCell(cell.id, (oldCell: Cell) => ({
      ...oldCell,
      code,
      hasNovaStart: code.includes('nova.start()'),
    }));
  };

  function initializeMonacoEditor() {
    // Configure Monaco loader to use unpkg.com to match CSP
    loader.config({
      paths: {
        vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs',
      },
    });

    loader.init().then((monaco) => {
      if (!containerReference.current) {
        return;
      }

      editorReference.current = monaco.editor.create(containerReference.current, {
        value: cell.code ?? '',
        language: 'python',
        theme: currentTheme,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        automaticLayout: true,
        wordWrap: 'on',
        folding: false,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        selectOnLineNumbers: true,
        readOnly: false,
        padding: {
          top: 16,
          bottom: 16,
        },
        lineHeight: 18, // Reduced from 32 to 18 for tighter spacing
        scrollbar: {
          vertical: 'hidden',
          horizontal: 'hidden',
          handleMouseWheel: false, // Disable Monaco's mouse wheel handling
        },
      });

      // Listen for content changes
      editorReference.current.onDidChangeModelContent(() => {
        if (!editorReference.current) {
          return;
        }
        const value = editorReference.current.getValue();
        updateCellCode(value);
      });

      updateHeight();
    });
  }

  useEffect(() => {
    if (containerReference.current && !editorReference.current) {
      initializeMonacoEditor();
    }

    // Update editor content if cell code changes externally
    if (editorReference.current && editorReference.current.getValue() !== cell.code) {
      editorReference.current.setValue(cell.code);
    }
  }, [cell.code]);

  useEffect(() => {
    updateHeight();
  }, [containerWidth, cell.code]);

  // Listen for theme changes from VS Code
  useEffect(() => {
    const messageHandler = (event: MessageEvent<ExtensionToBuilderModeMessage>) => {
      const msg = event.data;
      logger.debug(`NotebookCell received message: ${msg.type}`);

      switch (msg.type) {
        case 'theme':
          logger.debug(`Theme change detected: ${msg.theme}`);
          setCurrentTheme(msg.theme);

          // Update Monaco editor theme if it exists
          if (editorReference.current) {
            loader.init().then((monaco) => {
              monaco.editor.setTheme(msg.theme);
            });
          }
          break;

        case 'init':
        case 'stdout':
        case 'stderr':
        case 'cell_end':
        case 'loadFile':
        case 'fileSaved':
        case 'chromeDevToolsResponse':
        case 'agentActivity':
        case 'pythonProcessReloaded':
        case 'getPreferenceValue':
        case 'setPreferenceValue':
          // These messages are handled by NotebookPanel, not individual cells
          break;

        default:
          // Exhaustiveness check - ensures we handle all message types
          const _exhaustiveCheck: never = msg;
          logger.debug(`NotebookCell: Unhandled message type: ${JSON.stringify(_exhaustiveCheck)}`);
      }
    };

    window.addEventListener('message', messageHandler);
    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (editorReference.current) {
        editorReference.current.dispose();
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      onRun();
    }
  };

  // Handle long-running cell detection (2+ minutes)
  useEffect(() => {
    if (isRunning) {
      const longRunningTimer = setTimeout(() => {
        setIsLongRunning(true);
        // Cell has been running for 2+ minutes - logged to debug only in development
      }, 120000); // 2 minutes

      return () => clearTimeout(longRunningTimer);
    } else {
      setIsLongRunning(false);
    }
  }, [isRunning, cell.id]);

  const htmlPath = getHtmlFilePath(cell.output.at(-1) || '');

  return (
    <div
      className={`notebook-cell ${isSelected ? 'selected' : ''} ${isRunning ? 'cell-running' : ''} ${isLongRunning ? 'cell-long-running' : ''} ${cell.status === 'error' ? 'cell-error' : ''}`}
      onClick={() => selectCell(cell.id)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="cell-sidebar">
        <div className="cell-number">[{index + 1}]</div>
        <div className="cell-status">
          {isRunning && <Loader alignment="left" />}
          {!isRunning && cell.status === 'success' && (
            <span
              className="cell-status-indicator cell-status-success"
              style={{ display: 'inline' }}
            >
              ✓
            </span>
          )}
          {!isRunning && cell.status === 'error' && (
            <span className="cell-status-indicator cell-status-error" style={{ display: 'inline' }}>
              ✗
            </span>
          )}
        </div>
      </div>
      <div className="cell-main">
        <CellControls
          index={index}
          onRun={onRun}
          onCancel={onCancel}
          cell={cell}
          isRunning={isRunning}
          disableActions={disableActions}
        />

        <div className={`cell-editor ${isSelected ? 'selected' : ''}`}>
          <div
            ref={containerReference}
            className="monaco-editor-container"
            style={{ height: '44px', minHeight: '32px' }}
          />
        </div>

        {!!cell.output.length && (
          <div className="cell-output-actions">
            <div className="view-output" onClick={() => setSelectedOutput(index)}>
              <CheckIcon /> View logs
            </div>
            {htmlPath && (
              <div
                className="view-output"
                onClick={() => handleOpenActionViewer(cell.output.at(-1) || '')}
              >
                <CheckIcon /> Open Action Viewer
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
