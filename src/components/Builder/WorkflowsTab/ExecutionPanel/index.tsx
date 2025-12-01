import React from 'react';

import { validateJsonPayload } from '../../../../core/utils/utils';
import { ConsoleLink } from '../../DeployTab/ConsoleLink';
import { OutputDisplay } from '../../DeployTab/OutputDisplay';
import { InvocationForm } from '../InvocationForm';
import './index.css';

interface ExecutionState {
  payload: string;
  isExecuting: boolean;
  output: string;
  status: 'idle' | 'running' | 'success' | 'error';
  startTime?: Date;
  endTime?: Date;
}

interface ExecutionPanelProps {
  workflowName: string | null;
  region: string;
  workflowState: ExecutionState;
  onPayloadChange: (payload: string) => void;
  onExecute: () => void;
  onClearPayload: () => void;
  onFormatPayload: () => void;
}

const StatusDisplay: React.FC<{ state: ExecutionState }> = ({ state }) => {
  if (state.isExecuting) {
    return (
      <>
        <i className="codicon codicon-sync codicon-modifier-spin"></i> Running since{' '}
        {state.startTime?.toLocaleTimeString()}
      </>
    );
  }
  if (state.status === 'success') {
    return (
      <>
        <i className="codicon codicon-check"></i> Completed at {state.endTime?.toLocaleTimeString()}
      </>
    );
  }
  if (state.status === 'error') {
    return (
      <>
        <i className="codicon codicon-error"></i> Failed at {state.endTime?.toLocaleTimeString()}
      </>
    );
  }
  return <>Idle</>;
};

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  workflowName,
  region,
  workflowState,
  onPayloadChange,
  onExecute,
  onClearPayload,
  onFormatPayload,
}) => {
  if (!workflowName) {
    return (
      <div className="execution-panel">
        <div className="execution-panel-empty-state">
          <h1>Select your workflow</h1>
          <p>Choose a workflow from the list to configure and execute</p>
        </div>
      </div>
    );
  }

  return (
    <div className="execution-panel">
      <div className="execution-panel-header">
        <h3 className="workflow-title">Selected: {workflowName}</h3>
        <div className="workflow-status">
          <StatusDisplay state={workflowState} />
        </div>
      </div>

      <InvocationForm
        invocationPayload={workflowState.payload}
        onPayloadChange={onPayloadChange}
        onInvoke={onExecute}
        onClearPayload={onClearPayload}
        onFormatPayload={onFormatPayload}
        isInvoking={workflowState.isExecuting}
        invocationStatusText=""
        isValidJson={validateJsonPayload}
      />

      {workflowState.status !== 'idle' && workflowName && (
        <ConsoleLink region={region} workflowDefinitionName={workflowName} />
      )}

      <OutputDisplay
        title="Output"
        content={workflowState.output}
        status={workflowState.status === 'running' ? 'idle' : workflowState.status}
        isActive={workflowState.isExecuting}
        onCopy={() => navigator.clipboard.writeText(workflowState.output)}
      />
    </div>
  );
};
