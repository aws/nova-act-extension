import { useEffect, useRef, useState } from 'react';

import { CLEAR_ALL_PREFERENCE_KEY } from '../../../constants';
import { useAgentMessages } from '../../../core/context/AgentMessagesContext';
import { useCells } from '../../../core/context/CellsContext';
import { useFile } from '../../../core/context/FileContext';
import { type Cell, type ChromeDevToolsTab } from '../../../core/types/builder';
import {
  type CellEndMessage,
  type CellExecutionMessage,
  type ExtensionToBuilderModeMessage,
  type LoadFileMessage,
} from '../../../core/types/builderModeMessages';
import { type CellCompletionStatus } from '../../../core/types/builderModeMessages';
import {
  captureRunAllCellsCompleted,
  captureRunAllCellsStarted,
  captureRunCellAborted,
  captureRunCellCompleted,
  captureRunCellFailed,
  captureRunCellStarted,
  countActCalls,
  countLines,
  createRunId,
  fetchChromeDevToolsUrl,
  getPreference,
} from '../../../core/utils/builderModeUtils';
import { splitPythonCode } from '../../../core/utils/splitPythonCode';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClearIcon,
  CopyPlusIcon,
  PlusIcon,
} from '../../../core/utils/svg';
import { builderModeVscodeApi } from '../../../core/utils/vscodeApi';
import logger from '../../webviewLogger';
import { NotebookCell } from '../NotebookCell';
import { Tooltip } from '../Tooltip';
import { ConfirmationModal } from './ConfirmationModal';
import { RunSelector } from './RunSelector';
import './index.css';

export type RunAllState = {
  isRunning: boolean;
  current: number;
  total: number;
};

interface NotebookProps {
  setDevToolsUrl: (url: string) => void;
  collapseView: (collapse: boolean) => void;
}

interface RunContext {
  runId: string;
  startedAt: number;
  batchRunId?: string;
}

interface BatchRunContext {
  runId: string;
  actCallCount: number;
  lineCount: number;
  startedAt: number;
  succeeded: number;
  failed: number;
  aborted: number;
}

export const NotebookPanel = ({ setDevToolsUrl, collapseView }: NotebookProps) => {
  const {
    cells,
    moveCell,
    selectedCellIndex,
    selectCell,
    addCell,
    addCells,
    updateCell,
    updateCellOutput,
    deleteAllCells,
  } = useCells();

  const [clearDontRemind, setClearDontRemind] = useState(false);

  const { setFileContent, setFileLocation, setHasUnsavedChanges } = useFile();

  const { addAgentMessage } = useAgentMessages();

  const [runningCell, setRunningCell] = useState<string | null>(null);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [runAllState, setRunAllState] = useState<RunAllState>({
    isRunning: false,
    current: 0,
    total: 0,
  });
  const [runAllAfterPythonRestart, setRunAllAfterPythonRestart] = useState(false);
  useEffect(() => {
    if (runAllAfterPythonRestart) {
      if (cells.length > 0) runAllCells();
      setRunAllAfterPythonRestart(false);
    }
  }, [runAllAfterPythonRestart]);

  const notebookContainerRef = useRef<HTMLDivElement>(null);
  const cellCompletionCallbacks = useRef<Map<string, (success: boolean) => void>>(new Map());
  const cellsRef = useRef<Cell[]>([]);
  const browserAlreadyStarted = useRef<boolean>(false);

  /** Map of cell ID to its active run context */
  const activeRunsByCellReference = useRef<Map<string, RunContext>>(new Map());
  /** Reference to the current run-all batch (if any) */
  const batchRunReference = useRef<BatchRunContext | null>(null);

  /// add ResizeObserver for notebook container
  useEffect(() => {
    const element = notebookContainerRef.current;

    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === element) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!builderModeVscodeApi) {
      // Running outside VS Code webview. Communication will not work.
      return;
    }
    builderModeVscodeApi.postMessage({ command: 'ready' });

    const messageHandler = (event: MessageEvent<ExtensionToBuilderModeMessage>) => {
      const msg = event.data;
      logger.debug(`Received message: ${msg.type}`);

      switch (msg.type) {
        case 'init':
          logger.debug(`Initializing notebook with ${msg.content.length} cells`);
          deleteAllCells();
          addCells(msg.content);
          break;

        case 'stdout':
        case 'stderr':
          handleCellOutput(msg);
          break;
        case 'cell_end':
          handleCellEnd(msg);
          break;

        case 'loadFile':
          loadFileContent(msg);
          break;

        case 'fileSaved':
          handleFileSaved(msg);
          break;

        case 'chromeDevToolsResponse':
          logger.debug(`Chrome DevTools response - success: ${msg.success}`);
          handleChromeDevToolsResponse(msg.success, msg.data, msg.error);
          break;

        case 'agentActivity':
          logger.debug(`Agent activity detected - forwarding to DevToolsPanel`);
          // Forward agent activity messages to DevToolsPanel
          addAgentMessage(msg.data);
          break;
        case 'pythonProcessReloaded':
          setRunAllAfterPythonRestart(true);
          break;

        default:
          logger.debug(`Unknown message type: ${JSON.stringify(msg)}`);
      }
    };
    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, []);

  useEffect(() => {
    getPreference(CLEAR_ALL_PREFERENCE_KEY).then((value) => setClearDontRemind(value));
  }, []);

  const handleClearClick = () => {
    if (clearDontRemind) {
      deleteAllCells();
      addCell({});
      setShowClearConfirmation(false);
      return;
    }
    setShowClearConfirmation(true);
  };

  // Keep cellsRef in sync with cells state
  useEffect(() => {
    cellsRef.current = cells;
  }, [cells]);

  const stopExecution = () => {
    logger.debug(
      `Stopping execution - running cell: ${runningCell}, callbacks: ${cellCompletionCallbacks.current.size}`
    );
    setRunAllState({ isRunning: false, current: 0, total: 0 });
    cellCompletionCallbacks.current.forEach((resolve) => resolve(false));
    cellCompletionCallbacks.current.clear();

    if (runningCell !== null) {
      logger.debug(`Updating cell ${runningCell} status to error and stopping execution`);
      updateCell(runningCell, (oldCell: Cell) => ({
        ...oldCell,
        status: 'error',
      }));
      builderModeVscodeApi?.postMessage({ command: 'stopExecution' });
      setRunningCell(null);
    }
  };

  const handleCellEnd = (message: CellEndMessage) => {
    const { cellId, success, completionStatus, novaActStatus } = message;
    if (!cellId) {
      logger.debug('Cell end message received without cellId');
      return;
    }

    const currentCell = cellsRef.current.find((c) => c.id === cellId);
    if (!currentCell) {
      logger.debug(`Cell end: cell ${cellId} not found in current cells`);
      return;
    }

    logger.debug(`Cell ${cellId} execution ended - success: ${success}`);

    // Update cell output and status
    updateCell(cellId, (oldCell: Cell) => ({
      ...oldCell,
      status: success ? 'success' : 'error',
    }));

    setRunningCell((prev) => (prev === cellId ? null : prev));

    const callback = cellCompletionCallbacks.current.get(cellId);
    if (callback) {
      logger.debug(`Executing completion callback for cell ${cellId} with success: ${success}`);
      cellCompletionCallbacks.current.delete(cellId);
      callback(success);
    }

    // Auto-fetch DevTools if successful, novaAct status is 'started', and we haven't already started the browser in this session
    if (success && novaActStatus === 'started' && browserAlreadyStarted.current !== true) {
      logger.debug(`Cell ${message.cellId} contains nova.start() - scheduling DevTools fetch`);
      setTimeout(() => fetchChromeDevToolsUrl(), 500);
      browserAlreadyStarted.current = true;
    }

    if (success && novaActStatus === 'stopped') {
      setDevToolsUrl('');
      browserAlreadyStarted.current = false;
    }

    handleRunCompletionTelemetry({ cellId, completionStatus, cellCode: currentCell.code });
  };

  const handleCellOutput = (message: CellExecutionMessage) => {
    if (!message.cellId) {
      logger.debug('Cell output message received without cellId');
      return;
    }

    updateCellOutput(message.cellId, message.data);
  };

  const handleFileSaved = (msg: { type: 'fileSaved'; location: string }) => {
    setHasUnsavedChanges(false);
    setFileLocation(msg.location);
  };

  const restartPythonAndRunAll = (): void => {
    if (!builderModeVscodeApi) {
      // Running outside VS Code webview. Communication will not work.
      return;
    }
    if (browserAlreadyStarted.current === false) {
      runAllCells();
      return;
    }

    // Reset browser view, cells
    for (const [_, cell] of cells.entries()) {
      updateCell(cell.id, (oldCell: Cell) => ({
        ...oldCell,
        status: 'idle',
      }));
    }

    // Reset dev tools
    setDevToolsUrl('');
    browserAlreadyStarted.current = false;

    builderModeVscodeApi.postMessage({
      command: 'restartPythonProcess',
      restart: true,
    });
  };

  const loadFileContent = (msg: LoadFileMessage): void => {
    logger.debug(
      `Loading file content - ${msg.content.length} characters, ${msg.content.split('\n').length} lines`
    );
    deleteAllCells();

    setFileContent(msg.content);
    setFileLocation(msg.location);

    // Use the splitPythonCode utility function for proper Python code splitting
    const cellsToAdd = splitPythonCode(msg.content);

    addCells(cellsToAdd);

    logger.debug(`File loaded successfully - created ${cellsToAdd.length} cells`);
  };

  const handleChromeDevToolsResponse = (
    success: boolean,
    data?: ChromeDevToolsTab[],
    error?: string
  ) => {
    logger.debug(`Chrome DevTools response - success: ${success}, tabs: ${data?.length || 0}`);

    if (success && !!data) {
      try {
        const pageTab = data.find((tab) => tab.type === 'page');
        if (pageTab?.devtoolsFrontendUrl) {
          logger.debug(`Setting DevTools URL: ${pageTab.devtoolsFrontendUrl}`);
          setDevToolsUrl(pageTab.devtoolsFrontendUrl);
        } else {
          logger.debug('No page tab found in DevTools response');
        }
      } catch (e) {
        logger.debug(`Error processing DevTools response: ${e}`);
        if (error) {
          logger.debug(`DevTools fetch error: ${error}, ${e}`);
        }
      }
    } else {
      logger.debug(`DevTools fetch failed: ${error || 'Unknown error'}`);
      // We didn't get a dev tool response, collapse the view
      collapseView(false);
    }
  };

  const initializeRunContext = (cellId: string, batchRunId?: string): string => {
    const runId = createRunId();
    const startedAt = Date.now();
    activeRunsByCellReference.current.set(cellId, { runId, startedAt, batchRunId });
    return runId;
  };

  const handleRunCompletionTelemetry = ({
    cellId,
    completionStatus,
    cellCode,
  }: {
    cellId: string;
    completionStatus: CellCompletionStatus;
    cellCode: string;
  }) => {
    const runContext = activeRunsByCellReference.current.get(cellId);
    if (runContext === undefined) {
      logger.debug(`No active run context found for cell ${cellId} on completion`);
      return;
    }
    const { runId, startedAt } = runContext;

    const durationMs = Date.now() - startedAt;
    const actCallCount = countActCalls(cellCode);
    const lineCount = countLines(cellCode);

    if (completionStatus === 'completed') {
      captureRunCellCompleted({ runId, cellId, durationMs, actCallCount, lineCount });
    } else if (completionStatus === 'failed') {
      captureRunCellFailed({ runId, cellId, durationMs, actCallCount, lineCount });
    } else if (completionStatus === 'aborted') {
      captureRunCellAborted({ runId, cellId, durationMs, actCallCount, lineCount });
    }

    // Also update batch run context if applicable
    if (batchRunReference.current && runContext.batchRunId !== undefined) {
      updateBatchRunCounts(completionStatus);
    }

    // Remove the run context as it's completed
    activeRunsByCellReference.current.delete(cellId);
  };

  const initializeBatchRunContext = ({
    actCallCount,
    lineCount,
  }: {
    actCallCount: number;
    lineCount: number;
  }) => {
    const runId = createRunId();
    batchRunReference.current = {
      runId,
      actCallCount,
      lineCount,
      startedAt: Date.now(),
      succeeded: 0,
      failed: 0,
      aborted: 0,
    };

    return runId;
  };

  const updateBatchRunCounts = (completionStatus: CellCompletionStatus) => {
    if (batchRunReference.current) {
      if (completionStatus === 'completed') {
        batchRunReference.current.succeeded += 1;
      } else if (completionStatus === 'failed') {
        batchRunReference.current.failed += 1;
      } else if (completionStatus === 'aborted') {
        batchRunReference.current.aborted += 1;
      }
    }
  };

  const handleRunAllCompletionTelemetry = (cellIds: string[]) => {
    if (batchRunReference.current) {
      const { runId, startedAt, succeeded, failed, aborted, actCallCount, lineCount } =
        batchRunReference.current;
      const durationMs = Date.now() - startedAt;
      captureRunAllCellsCompleted({
        runId,
        actCallCount,
        lineCount,
        succeeded,
        failed,
        aborted,
        durationMs,
        cellCount: cellIds.length,
        cellIds,
      });
      batchRunReference.current = null;
    }
  };

  const runCell = ({
    cellId,
    emitTelemetry = true,
    batchRunId,
  }: {
    cellId: string;
    emitTelemetry?: boolean;
    batchRunId?: string;
  }) => {
    logger.debug(`Attempting to run cell: ${cellId}`);

    // Prevent running if any cell is already running
    if (runningCell !== null) {
      logger.debug(`Cannot run cell ${cellId} - cell ${runningCell} is already running`);
      builderModeVscodeApi.postMessage({
        command: 'showInfo',
        info: 'A cell is already running. Please wait for it to finish.',
      });
      return;
    }

    const cell = cells.find((c) => c.id === cellId);
    if (!cell || !builderModeVscodeApi || !cell.code.trim()) {
      logger.debug(`Cannot run cell ${cellId} - cell not found, no API, or empty code`);
      return;
    }

    logger.debug(`Running cell ${cellId} with ${cell.code.length} characters of code`);
    const runId = initializeRunContext(cellId, batchRunId);
    setRunningCell(cellId);

    updateCell(cellId, (oldCell: Cell) => ({
      ...oldCell,
      status: 'running',
    }));

    builderModeVscodeApi.postMessage({ command: 'runPython', code: cell.code, cellId });

    if (emitTelemetry) {
      const lineCount = countLines(cell.code);
      const actCallCount = countActCalls(cell.code);

      captureRunCellStarted({
        runId,
        cellId,
        lineCount,
        actCallCount,
      });
    }
  };

  const runAllCells = async () => {
    if (cells.length === 0) {
      logger.debug('Cannot run all cells - no cells available');
      return;
    }

    logger.debug(`Starting to run all ${cells.length} cells`);

    setRunAllState({ isRunning: true, current: 0, total: cells.length });

    // Precompute for RUN_ALL_STARTED
    const cellIds = cells.map((cell) => cell.id);
    const lineCount = cells.reduce((acc, cell) => acc + countLines(cell.code), 0);
    const actCallCount = cells.reduce((acc, cell) => acc + countActCalls(cell.code), 0);

    const runId = initializeBatchRunContext({ actCallCount, lineCount });
    captureRunAllCellsStarted({ runId, cellCount: cells.length, lineCount, actCallCount, cellIds });

    for (const [i, cell] of cells.entries()) {
      logger.debug(`Running cell ${i + 1}/${cells.length}: ${cell.id}`);
      setRunAllState((prev) => ({ ...prev, current: i + 1 }));
      selectCell(cell.id);

      // Skip emitting telemetry for single cell runs in favor of the single run-all event above
      runCell({ cellId: cell.id, emitTelemetry: false, batchRunId: runId });

      // Wait for completion and check if it succeeded
      const cellSucceeded = await new Promise<boolean>((resolve) => {
        cellCompletionCallbacks.current.set(cell.id, resolve);
      });

      logger.debug(`Cell ${cell.id} completed with success: ${cellSucceeded}`);

      // Abort execution if the cell failed
      if (!cellSucceeded) {
        logger.debug(`Cell ${cell.id} failed - aborting execution of remaining cells`);
        setRunAllState({ isRunning: false, current: 0, total: 0 });
        handleRunAllCompletionTelemetry(cellIds);
        return;
      }
    }

    logger.debug('All cells execution completed');
    setRunAllState({ isRunning: false, current: 0, total: 0 });

    handleRunAllCompletionTelemetry(cellIds);
  };

  const moveSelectedCell = (direction: 'up' | 'down') => {
    if (selectedCellIndex === undefined) return;

    if (direction === 'up' && selectedCellIndex > 0) {
      const newIndex = selectedCellIndex - 1;
      moveCell(selectedCellIndex, newIndex);
    }

    if (direction === 'down' && selectedCellIndex < cells.length - 1) {
      const newIndex = selectedCellIndex + 1;
      moveCell(selectedCellIndex, newIndex);
    }
  };

  const copyCell = () => {
    if (selectedCellIndex === undefined) return;
    const selectedCell = cells[selectedCellIndex];
    addCell({ code: selectedCell?.code, output: [], afterIndex: selectedCellIndex });
  };

  return (
    <section className="panel notebook-panel">
      <div className="notebook-header">
        <div className="notebook-controls">
          <div className="notebook-cell-controls">
            <Tooltip content={'Move cell up'} position="right">
              <button onClick={() => moveSelectedCell('up')} aria-label="Move cell up">
                <ArrowUpIcon />
              </button>
            </Tooltip>

            <Tooltip content={'Move cell down'} position="right">
              <button onClick={() => moveSelectedCell('down')} aria-label="Move cell down">
                <ArrowDownIcon />
              </button>
            </Tooltip>

            <div className="notebook-cell-controls-divider" />
            <Tooltip content={'Copy cell'} position="right">
              <button
                onClick={copyCell}
                disabled={selectedCellIndex === undefined}
                aria-label="Copy cell"
              >
                <CopyPlusIcon />
              </button>
            </Tooltip>

            <Tooltip content={'Add new cell'} position="right">
              <button onClick={() => addCell({})} aria-label="Add new cell">
                <PlusIcon />
              </button>
            </Tooltip>
            <div className="notebook-cell-controls-divider" />

            <Tooltip content={'Clear all cells'} position="right">
              <button
                onClick={() => {
                  if (runningCell) {
                    builderModeVscodeApi.postMessage({
                      command: 'showInfo',
                      info: 'Cannot delete all cells: a cell is running. Please stop execution first before deleting.',
                    });
                    return;
                  }
                  handleClearClick();
                  setHasUnsavedChanges(true);
                }}
                aria-label="Clear all cells"
              >
                <ClearIcon />
              </button>
            </Tooltip>
          </div>
          <RunSelector
            stopExecution={stopExecution}
            runAllState={runAllState}
            restartPythonAndRunAll={restartPythonAndRunAll}
          />
          <ConfirmationModal
            isOpen={showClearConfirmation}
            dontRemind={clearDontRemind}
            setDontRemind={setClearDontRemind}
            onConfirm={() => {
              builderModeVscodeApi.postMessage({
                command: 'setPreference',
                key: CLEAR_ALL_PREFERENCE_KEY,
                value: clearDontRemind,
              });
              deleteAllCells();
              addCell({});
              setShowClearConfirmation(false);
            }}
            onCancel={() => setShowClearConfirmation(false)}
            confirmationText={'Are you sure you want to clear all cells? This cannot be undone.'}
          />
        </div>
      </div>

      <div ref={notebookContainerRef} className="notebook-container">
        {cells.map((cell, index) => (
          <NotebookCell
            key={cell.id}
            containerWidth={containerWidth}
            cell={cell}
            index={index}
            isSelected={selectedCellIndex !== undefined && cells[selectedCellIndex]?.id === cell.id}
            isRunning={runningCell === cell.id}
            disableActions={cells.some((c) => c.status === 'running')}
            onRun={() => runCell({ cellId: cell.id })}
            onCancel={() => stopExecution()}
          />
        ))}
      </div>
    </section>
  );
};
