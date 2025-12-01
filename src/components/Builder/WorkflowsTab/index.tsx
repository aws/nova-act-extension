import React, { useEffect } from 'react';

import { useIamIdentity } from '../../../core/context/IamIdentityContext';
import { TAB_NAMES } from '../../../core/types/sidebarMessages';
import { AuthenticationValidationPage } from '../shared/AuthenticationValidationPage';
import { EmptyState } from './EmptyState';
import { ExecutionPanel } from './ExecutionPanel';
import { WorkflowSelector } from './WorkflowSelector';
import { useWorkflowFlow } from './hooks/useWorkflowFlow';
import './index.css';

interface WorkflowsTabProps {
  onNavigateToTab: (tabName: string) => void;
}

export const WorkflowsTab: React.FC<WorkflowsTabProps> = ({ onNavigateToTab }) => {
  const { credentialStatus } = useIamIdentity();
  const {
    workflows,
    isLoadingWorkflows,
    loadError,
    region,
    selectedWorkflowName,
    workflowStates,
    loadWorkflows,
    selectWorkflow,
    updatePayload,
    executeWorkflow,
    getCurrentWorkflowState,
  } = useWorkflowFlow();

  useEffect(() => {
    if (credentialStatus === 'valid') {
      loadWorkflows();
    }
  }, [credentialStatus]);

  const handleGoToDeploy = () => {
    onNavigateToTab(TAB_NAMES.DEPLOY);
  };

  const handlePayloadChange = (payload: string) => {
    if (selectedWorkflowName) {
      updatePayload(selectedWorkflowName, payload);
    }
  };

  const handleExecute = () => {
    if (selectedWorkflowName) {
      executeWorkflow(selectedWorkflowName);
    }
  };

  const handleClearPayload = () => {
    if (selectedWorkflowName) {
      updatePayload(selectedWorkflowName, '');
    }
  };

  const handleFormatPayload = () => {
    if (selectedWorkflowName) {
      const currentState = getCurrentWorkflowState();
      try {
        const formatted = JSON.stringify(JSON.parse(currentState.payload), null, 2);
        updatePayload(selectedWorkflowName, formatted);
      } catch (_e) {
        // Invalid JSON, do nothing
      }
    }
  };

  if (credentialStatus !== 'valid') {
    return (
      <AuthenticationValidationPage
        credentialStatus={credentialStatus}
        actionContext="run workflows"
        wrapperClassName="workflows-tab-wrapper"
      />
    );
  }

  if (workflows.length === 0 && !isLoadingWorkflows) {
    return <EmptyState onGoToDeploy={handleGoToDeploy} onRetry={loadWorkflows} error={loadError} />;
  }

  return (
    <div className="workflows-tab">
      <div className="workflows-two-column-layout">
        <div className="workflows-left-column">
          <WorkflowSelector
            workflows={workflows}
            region={region}
            selectedWorkflowName={selectedWorkflowName}
            workflowStates={workflowStates}
            onSelectWorkflow={selectWorkflow}
            onRefresh={loadWorkflows}
            isLoading={isLoadingWorkflows}
          />
        </div>
        <div className="workflows-column-separator"></div>
        <div className="workflows-right-column">
          <ExecutionPanel
            workflowName={selectedWorkflowName}
            region={region}
            workflowState={getCurrentWorkflowState()}
            onPayloadChange={handlePayloadChange}
            onExecute={handleExecute}
            onClearPayload={handleClearPayload}
            onFormatPayload={handleFormatPayload}
          />
        </div>
      </div>
    </div>
  );
};
