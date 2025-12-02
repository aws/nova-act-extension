import React from 'react';

import { useInitialTab } from '../../../../core/context/InitialTabContext';
import { TAB_NAMES } from '../../../../core/types/sidebarMessages';
import { DeploymentForm } from '../DeploymentForm';
import { ExpandableSection } from '../ExpandableSection';
import { OutputDisplay } from '../OutputDisplay';
import './index.css';

interface DeploymentSectionProps {
  // Form props (passed through to DeploymentForm)
  agentName: string;
  region: string;
  executionRoleArn: string;
  validationError: string;
  executionRoleArnError: string;
  workflowNameWarning: string;
  warningType: 'workflow-name' | 'deployment-format' | null;
  hasConversionAction: boolean;
  onConvert: () => void;
  isAgentNameValid: boolean;
  canDeploy: boolean;
  deployButtonTooltip: string;
  regions: Array<{ value: string; label: string }>;
  onAgentNameChange: (name: string) => void;
  onAgentNameBlur: () => void;
  onRegionChange: (region: string) => void;
  onExecutionRoleArnChange: (arn: string) => void;
  onExecutionRoleArnBlur: () => void;
  onDeploy: () => void;
  isDeploying: boolean;
  deploymentStatusText: string;

  // Output props (handled by section)
  deployOutput: string;
  deployStatus: 'idle' | 'success' | 'error';
}

export const DeploymentSection: React.FC<DeploymentSectionProps> = ({
  agentName,
  region,
  executionRoleArn,
  validationError,
  executionRoleArnError,
  workflowNameWarning,
  warningType,
  hasConversionAction,
  onConvert,
  isAgentNameValid,
  canDeploy,
  deployButtonTooltip,
  regions,
  onAgentNameChange,
  onAgentNameBlur,
  onRegionChange,
  onExecutionRoleArnChange,
  onExecutionRoleArnBlur,
  onDeploy,
  isDeploying,
  deploymentStatusText,
  deployOutput,
  deployStatus,
}) => {
  const { navigateToTab } = useInitialTab();

  const handleNavigateToRunTab = () => {
    navigateToTab(TAB_NAMES.RUN_WORKFLOWS);
    setTimeout(() => {
      window.postMessage({ type: 'refreshWorkflowList' }, '*');
    }, 100);
  };

  const renderDeploymentOutput = () => {
    if (!deployOutput || !deployOutput.trim()) return null;

    return (
      <div className="deployment-output-section spacing-normal">
        <OutputDisplay
          title="Deployment Output"
          content={deployOutput}
          status={deployStatus}
          isActive={isDeploying}
          onCopy={() => navigator.clipboard.writeText(deployOutput)}
          minHeight={120}
          maxHeight={400}
          className="deploy-output-content"
        />
        {deployStatus === 'success' && (
          <div className="deploy-button-container spacing-normal" style={{ marginTop: '16px' }}>
            <button
              className="run-workflow-link-button secondary-button"
              onClick={handleNavigateToRunTab}
            >
              Run Workflow
              <i className="codicon codicon-arrow-right"></i>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="expandable-section-wrapper">
      <ExpandableSection
        title="Deployment Configuration"
        defaultExpanded={deployStatus !== 'success'}
        isCollapsible={true}
      >
        <DeploymentForm
          agentName={agentName}
          region={region}
          executionRoleArn={executionRoleArn}
          validationError={validationError}
          executionRoleArnError={executionRoleArnError}
          workflowNameWarning={workflowNameWarning}
          warningType={warningType}
          hasConversionAction={hasConversionAction}
          onConvert={onConvert}
          isAgentNameValid={isAgentNameValid}
          canDeploy={canDeploy}
          deployButtonTooltip={deployButtonTooltip}
          regions={regions}
          onAgentNameChange={onAgentNameChange}
          onAgentNameBlur={onAgentNameBlur}
          onRegionChange={onRegionChange}
          onExecutionRoleArnChange={onExecutionRoleArnChange}
          onExecutionRoleArnBlur={onExecutionRoleArnBlur}
          onDeploy={onDeploy}
          isDeploying={isDeploying}
          deploymentStatusText={deploymentStatusText}
        />
      </ExpandableSection>
      {renderDeploymentOutput()}
    </div>
  );
};
