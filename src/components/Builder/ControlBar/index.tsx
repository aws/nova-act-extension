import { type ChangeEvent, useEffect, useState } from 'react';

import { RESTART_NOTEBOOK_PREFERENCE_KEY } from '../../../constants';
import { useCells } from '../../../core/context/CellsContext';
import { useFile } from '../../../core/context/FileContext';
import { templates } from '../../../core/templates/templates';
import { captureScriptLoadedTemplate, getPreference } from '../../../core/utils/builderModeUtils';
import {
  LockIcon,
  OpenFolderIcon,
  RestartIcon,
  SaveIcon,
  SettingsIcon,
} from '../../../core/utils/svg';
import { builderModeVscodeApi } from '../../../core/utils/vscodeApi';
import logger from '../../webviewLogger';
import { ConfirmationModal } from '../NotebookPanel/ConfirmationModal';
import { Tooltip } from '../Tooltip';
import './index.css';

export const ControlBar = () => {
  const [showConfirmationModel, setShowConfirmationModal] = useState(false);

  const [restartDontRemind, setRestartDontRemind] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { cells, addCells, deleteAllCells } = useCells();
  const { fileLocation, hasUnsavedChanges, setHasUnsavedChanges } = useFile();

  const fileName = fileLocation?.split('/').at(-1) ?? 'untitled.py';
  const fileInputValue = `${fileName}${hasUnsavedChanges ? ' *' : ''}`;

  useEffect(() => {
    getPreference(RESTART_NOTEBOOK_PREFERENCE_KEY).then((value) => setRestartDontRemind(value));
  }, []);

  const handleRestart = () => {
    logger.debug(`Restart requested - verifying if a cell is running`);
    const hasRunningCell = cells.some((c) => c.status === 'running');
    if (hasRunningCell) {
      logger.debug('Cannot restart - cell is currently running');
      builderModeVscodeApi.postMessage({
        command: 'showInfo',
        info: 'Cannot restart: a cell is running. Please stop execution first before restarting.',
      });
      return;
    }
    const contentBlocks = cells.map((cell) => cell.code);
    logger.debug(`Restarting panel with ${contentBlocks.length} cells`);
    builderModeVscodeApi?.postMessage({ command: 'restartPanel', content: contentBlocks });
  };

  const openFile = () => {
    builderModeVscodeApi?.postMessage({ command: 'openPythonFile' });
    setHasUnsavedChanges(false);
  };

  const onSaveFile = () => {
    const cellCount = cells.length;
    const lineCount = cells.reduce((acc, cell) => acc + cell.code.split('\n').length, 0);
    const content = cells.map((cell) => cell.code).join('\n\n');
    builderModeVscodeApi?.postMessage({
      command: 'savePythonFile',
      content,
      cellCount,
      lineCount,
      location: fileLocation,
    });
    setHasUnsavedChanges(false);
  };

  const handleRestartClick = () => {
    if (restartDontRemind) {
      handleRestart();
      setShowConfirmationModal(false);
      return;
    }
    setShowConfirmationModal(true);
  };

  const onLoadTemplate = (e: ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    if (!templateId) return;

    const template = templates[templateId];
    if (!template) return;

    deleteAllCells();
    addCells(template.cells);
    captureScriptLoadedTemplate({ templateId, templateName: template.name });
    setHasUnsavedChanges(true);
  };

  return (
    <div className="control-bar-container">
      <div className="left">
        <div className="input-with-buttons">
          <input
            className={`file-action ${hasUnsavedChanges && 'unsaved-changed'}`}
            value={fileInputValue}
            title={hasUnsavedChanges ? 'Unsaved changes' : ''}
            disabled
          />
          <Tooltip content="Open Python file" position="right">
            <button className="secondary-button" onClick={openFile} aria-label="Open Python file">
              <OpenFolderIcon />
            </button>
          </Tooltip>
          <Tooltip content="Save as Python file" position="right">
            <button
              className="secondary-button"
              onClick={onSaveFile}
              aria-label="Save as Python file"
            >
              <SaveIcon />
            </button>
          </Tooltip>
        </div>
        <select
          value={''}
          onChange={onLoadTemplate}
          className="load-template-select"
          name="Load from template"
          id="load-from-template"
        >
          <option value="">Load from template</option>
          {Object.keys(templates).map((k) => (
            <option key={`template-option-${k}`} value={k}>
              {templates[k]?.name} - {templates[k]?.description}
            </option>
          ))}
        </select>
      </div>
      <div className="right">
        <Tooltip content={'Restart Notebook'} position="left">
          <button
            onClick={handleRestartClick}
            className="secondary-button"
            aria-label="Restart Notebook"
          >
            <RestartIcon />
          </button>
        </Tooltip>
        <Tooltip content={'Nova Act settings'} position="left">
          <button
            onClick={() => {
              setShowSettings(!showSettings);
            }}
            className="secondary-button"
            aria-label="Nova Act settings"
          >
            <SettingsIcon />
          </button>
        </Tooltip>
      </div>
      <ConfirmationModal
        isOpen={showConfirmationModel}
        dontRemind={restartDontRemind}
        setDontRemind={setRestartDontRemind}
        onConfirm={() => {
          builderModeVscodeApi.postMessage({
            command: 'setPreference',
            key: RESTART_NOTEBOOK_PREFERENCE_KEY,
            value: restartDontRemind,
          });
          handleRestart();
          setShowConfirmationModal(false);
        }}
        onCancel={() => setShowConfirmationModal(false)}
        confirmationText={
          'Are you sure you want to restart the notebook? This will tear down any running NovaAct instance.'
        }
      />
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-panel-title">Nova Act Settings</div>
          <button
            className="secondary-button settings-button"
            onClick={() => {
              builderModeVscodeApi.postMessage({
                command: 'setApiKey',
              });
              setShowSettings(false);
            }}
          >
            <LockIcon />
            Set API key
          </button>
        </div>
      )}
    </div>
  );
};
