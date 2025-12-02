import React from 'react';

import { builderModeVscodeApi } from '../../../../core/utils/vscodeApi';
import './index.css';

interface WorkflowInfo {
  name: string;
}

interface WorkflowSelectorProps {
  workflows: WorkflowInfo[];
  region: string;
  selectedWorkflowName: string | null;
  workflowStates: { [name: string]: { status: string; isExecuting: boolean } };
  onSelectWorkflow: (workflowName: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const getStatusIndicator = (status: string, isExecuting: boolean): JSX.Element | null => {
  if (isExecuting) return <i className="codicon codicon-sync codicon-modifier-spin"></i>;
  if (status === 'success') return <i className="codicon codicon-check"></i>;
  if (status === 'error') return <i className="codicon codicon-error"></i>;
  return null;
};

export const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({
  workflows,
  region,
  selectedWorkflowName,
  workflowStates,
  onSelectWorkflow,
  onRefresh,
  isLoading,
}) => {
  const reversedWorkflows = [...workflows].reverse();

  return (
    <div className="workflow-selector">
      <div className="workflow-selector-header">
        <div className="workflow-selector-header-content">
          <h3>Workflows ({region})</h3>
          <span
            className="workflow-docs-link"
            onClick={() => builderModeVscodeApi.postMessage({ command: 'viewRunDocumentation' })}
            title="How the Run Tab Works"
          >
            <i className="codicon codicon-info"></i>
          </span>
        </div>
      </div>

      <div className="workflow-list">
        {reversedWorkflows.map((workflow) => {
          const state = workflowStates[workflow.name] || { status: 'idle', isExecuting: false };
          const indicator = getStatusIndicator(state.status, state.isExecuting);
          const isSelected = workflow.name === selectedWorkflowName;

          return (
            <div
              key={workflow.name}
              className={`workflow-list-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectWorkflow(workflow.name)}
            >
              <span className="status-indicator">{indicator}</span>
              <span className="workflow-name">{workflow.name}</span>
            </div>
          );
        })}
      </div>

      <button onClick={onRefresh} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Refresh'}
      </button>
    </div>
  );
};
