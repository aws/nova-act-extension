import React, { useEffect, useState } from 'react';

import type {
  ActionData,
  ActionGroup,
  ActionStep,
  ExtensionToActionViewerMessage,
} from '../../core/types/actionViewerMessages';
// eslint-disable-next-line import/order
import { actionViewerVscodeApi } from '../../core/utils/vscodeApi';
import './index.css';

// Helper function to decode HTML entities
const decodeHtmlEntities = (text: string): string => {
  const textarea: HTMLTextAreaElement = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

// Component to render individual action steps
const ActionStepComponent: React.FC<{ step: ActionStep; showStepNumber?: boolean }> = ({
  step,
  showStepNumber = true,
}) => {
  return (
    <div className="action-step">
      {showStepNumber && <h4 className="action-step__title">Step {step.stepNumber}</h4>}

      <div className="action-step__url-container">
        <strong className="action-step__url-label">Current URL:</strong>
        {step.currentUrl ? (
          <a
            href={step.currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="action-step__url"
          >
            {step.currentUrl}
          </a>
        ) : (
          <span className="action-step__url">No URL available</span>
        )}
      </div>

      <div className="action-step__timestamp">
        <strong>Timestamp:</strong> {step.timestamp || 'No timestamp available'}
      </div>

      {step.imageData ? (
        <div className="action-step__image-container">
          <img
            src={step.imageData}
            alt={`Screenshot for Step ${step.stepNumber}`}
            className="action-step__image"
          />
        </div>
      ) : (
        <div className="action-step__image-container">
          <p>No screenshot available</p>
        </div>
      )}

      <div className="action-step__action-container">
        <strong className="action-step__action-label">Action:</strong>
        <pre className="action-step__action-code">
          {step.actionData ? decodeHtmlEntities(step.actionData) : 'No action data available'}
        </pre>
      </div>
    </div>
  );
};

// Component to render an action group (expandable/collapsible)
const ActionGroupComponent: React.FC<{
  action: ActionGroup;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ action, index, isExpanded, onToggle }) => {
  return (
    <div className="action-group">
      <div className="action-group__header" onClick={onToggle}>
        <div className="action-group__toggle">
          <span className={`action-group__arrow ${isExpanded ? 'expanded' : ''}`}>▶</span>
        </div>
        <div className="action-group__info">
          <h3 className="action-group__title">
            Act {index + 1}: {action.actId}
          </h3>
          <div className="action-group__meta">
            <div className="action-group__prompt">Prompt: {action.prompt}</div>
            <div className="action-group__details">{action.steps.length} steps</div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="action-group__content">
          {action.steps.map((step, stepIndex) => (
            <ActionStepComponent
              key={stepIndex}
              step={{ ...step, stepNumber: stepIndex + 1 }}
              showStepNumber={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ActionViewer: React.FC = () => {
  const [actionData, setActionData] = useState<ActionData | null>(null);
  const [filePath, setFilePath] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Listen for messages from the extension
    const messageListener = (event: MessageEvent<ExtensionToActionViewerMessage>): void => {
      const message: ExtensionToActionViewerMessage = event.data;

      switch (message.type) {
        case 'actionData':
          setFilePath(message.filePath);
          setActionData(message.data);
          setError(message.error || null);
          setLoading(false);
          // Expand all actions by default
          if (message.data?.actions && message.data.actions.length > 0) {
            const expandedIndices: Set<number> = new Set(
              message.data.actions.map((_, index) => index)
            );
            setExpandedActions(expandedIndices);
          }
          break;
        default:
      }
    };

    window.addEventListener('message', messageListener);

    // Send ready message to extension
    actionViewerVscodeApi.postMessage({ type: 'ready' });

    return () => {
      window.removeEventListener('message', messageListener);
    };
  }, []);

  const toggleAction = (index: number): void => {
    const newExpanded: Set<number> = new Set(expandedActions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedActions(newExpanded);
  };

  const expandAll = (): void => {
    if (actionData?.actions) {
      const allIndices: Set<number> = new Set(actionData.actions.map((_, index) => index));
      setExpandedActions(allIndices);
    }
  };

  const collapseAll = (): void => {
    setExpandedActions(new Set());
  };

  if (loading) {
    return (
      <div className="action-viewer__loading">
        <div>Loading action data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="action-viewer__error">
        <h3>Error Loading Action Data</h3>
        <p>{error}</p>
        <p className="action-viewer__error-file">File: {filePath}</p>
      </div>
    );
  }

  if (!actionData) {
    return (
      <div className="action-viewer__no-data">
        <div>No action data available</div>
        <p className="action-viewer__no-data-file">File: {filePath}</p>
      </div>
    );
  }

  // Calculate total steps for grouped view
  const totalSteps: number = actionData.actions
    ? actionData.actions.reduce((sum: number, action: ActionGroup) => sum + action.steps.length, 0)
    : actionData.steps.length;

  return (
    <div className="action-viewer">
      {/* Header */}
      <div className="action-viewer__header">
        <h2>{actionData.isFolder ? 'Session Viewer' : 'Action Viewer'}</h2>

        {/* Show Session ID for both folder and file views */}
        {actionData.sessionId && (
          <div className="action-viewer__session-id">Session ID: {actionData.sessionId}</div>
        )}

        {/* Show Act ID only for single file view */}
        {!actionData.isFolder && actionData.actId && (
          <div className="action-viewer__act-id">Act ID: {actionData.actId}</div>
        )}

        {actionData.prompt && !actionData.isFolder && (
          <div className="action-viewer__prompt">Prompt: "{actionData.prompt}"</div>
        )}

        <div className="action-viewer__steps-count">
          {actionData.isFolder
            ? `${actionData.fileCount} actions, ${totalSteps} total steps`
            : `${actionData.steps.length} steps`}
        </div>

        {actionData.isFolder && actionData.sessionCreatedTime && (
          <div className="action-viewer__session-time">
            Session created: {new Date(actionData.sessionCreatedTime).toLocaleString()}
          </div>
        )}

        {/* Expand/Collapse controls for grouped view */}
        {actionData.actions && actionData.actions.length > 0 && (
          <div className="action-viewer__controls">
            <button
              onClick={expandedActions.size === actionData.actions.length ? collapseAll : expandAll}
              className="action-viewer__control-btn"
            >
              {expandedActions.size === actionData.actions.length ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="action-viewer__content">
        {actionData.actions && actionData.actions.length > 0 ? (
          // Grouped view for folders
          actionData.actions.map((action, index) => (
            <ActionGroupComponent
              key={index}
              action={action}
              index={index}
              isExpanded={expandedActions.has(index)}
              onToggle={() => toggleAction(index)}
            />
          ))
        ) : actionData.steps.length > 0 ? (
          // Single action view
          actionData.steps.map((step) => <ActionStepComponent key={step.stepNumber} step={step} />)
        ) : (
          <div className="action-viewer__no-steps">No steps found in this action</div>
        )}
      </div>
    </div>
  );
};
