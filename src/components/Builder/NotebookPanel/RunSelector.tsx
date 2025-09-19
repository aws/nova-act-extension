import { StopIcon } from '../../../core/utils/svg';
import { Tooltip } from '../Tooltip';
import { type RunAllState } from './index';

export const RunSelector = ({
  runAllState,
  runAllCells,
  stopExecution,
}: {
  runAllState: RunAllState;
  runAllCells: () => void;
  stopExecution: () => void;
}) => {
  const onButtonClick = runAllState.isRunning ? stopExecution : runAllCells;

  return (
    <div className="notebook-run-select-container">
      <div className="notebook-run-select-display">
        {runAllState.isRunning && (
          <>
            <div className="run-progress">
              <span>
                Running {runAllState.current}/{runAllState.total}
              </span>
              <span className="inline-spinner"></span>
            </div>
          </>
        )}
        <Tooltip
          content={runAllState.isRunning ? 'Stop running cells' : 'Run all cells'}
          position="left"
        >
          <button onClick={onButtonClick}>
            {runAllState.isRunning ? (
              <>
                <StopIcon />
                Stop
              </>
            ) : (
              'Run all cells'
            )}
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
