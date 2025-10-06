import { useEffect, useState } from 'react';

import { RUN_ALL_PREFERENCE_KEY } from '../../../constants';
import { getPreference } from '../../../core/utils/builderModeUtils';
import { StopIcon } from '../../../core/utils/svg';
import { builderModeVscodeApi } from '../../../core/utils/vscodeApi';
import { Tooltip } from '../Tooltip';
import { ConfirmationModal } from './ConfirmationModal';
import { type RunAllState } from './index';

export const RunSelector = ({
  runAllState,
  restartPythonAndRunAll,
  stopExecution,
}: {
  runAllState: RunAllState;
  restartPythonAndRunAll: () => void;
  stopExecution: () => void;
}) => {
  const [runAllConfirmation, setRunAllConfirmation] = useState(false);
  const [runAllDontRemind, setRunAllDontRemind] = useState(false);

  useEffect(() => {
    getPreference(RUN_ALL_PREFERENCE_KEY).then((value) => setRunAllDontRemind(value));
  }, []);

  const onButtonClick = () => {
    if (runAllState.isRunning) {
      stopExecution();
      return;
    }

    if (runAllDontRemind) {
      restartPythonAndRunAll();
      setRunAllConfirmation(false);
      return;
    }

    setRunAllConfirmation(true);
  };

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
      <ConfirmationModal
        isOpen={runAllConfirmation}
        onConfirm={() => {
          builderModeVscodeApi.postMessage({
            command: 'setPreference',
            key: RUN_ALL_PREFERENCE_KEY,
            value: runAllDontRemind,
          });
          restartPythonAndRunAll();
          setRunAllConfirmation(false);
        }}
        onCancel={() => setRunAllConfirmation(false)}
        confirmationText="Are you sure you want to run all cells? This will restart any running Nova Act instance"
        dontRemind={runAllDontRemind}
        setDontRemind={setRunAllDontRemind}
      />
    </div>
  );
};
