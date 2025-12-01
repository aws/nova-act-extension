import React from 'react';

import {
  AGENT_NAME_FIELD,
  DEPLOY_TAB_CONFIG,
  EXECUTION_ROLE_ARN_FIELD,
  REGION_FIELD,
} from '../../../../core/config/deployTabConfig';
import { ActionForm } from '../ActionForm';
import './index.css';

interface DeploymentFormProps {
  // Form state
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

  // Form handlers
  onAgentNameChange: (name: string) => void;
  onAgentNameBlur: () => void;
  onRegionChange: (region: string) => void;
  onExecutionRoleArnChange: (arn: string) => void;
  onExecutionRoleArnBlur: () => void;
  onDeploy: () => void;

  // Form execution state
  isDeploying: boolean;
  deploymentStatusText: string;
}

export const DeploymentForm: React.FC<DeploymentFormProps> = ({
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
}) => {
  return (
    <div className="deployment-form-content">
      <div className="deployment-form-container enhanced">
        <div className="form-section spacing-normal">
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">{AGENT_NAME_FIELD.label}</label>
              <div className="form-input-wrapper">
                <input
                  className={`form-control form-input ${validationError ? 'error' : isAgentNameValid ? 'valid' : ''}`}
                  value={agentName}
                  onChange={(e) => onAgentNameChange(e.target.value)}
                  onBlur={onAgentNameBlur}
                  placeholder={AGENT_NAME_FIELD.placeholder}
                />
                {isAgentNameValid && !validationError && (
                  <div className="validation-success-icon">
                    <i className="codicon codicon-check"></i>
                  </div>
                )}
              </div>
              {AGENT_NAME_FIELD.helpText && (
                <div className="help-text">{AGENT_NAME_FIELD.helpText}</div>
              )}
            </div>
            <div className="form-field">
              <label className="form-label">{REGION_FIELD.label}</label>
              <select
                className="form-control form-dropdown"
                value={region}
                onChange={(e) => onRegionChange(e.target.value)}
                disabled
              >
                {regions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {REGION_FIELD.helpText && <div className="help-text">{REGION_FIELD.helpText}</div>}
            </div>
            <div className="form-field">
              <label className="form-label">{EXECUTION_ROLE_ARN_FIELD.label}</label>
              <div className="form-input-wrapper">
                <input
                  className={`form-control form-input ${executionRoleArnError ? 'error' : ''}`}
                  value={executionRoleArn}
                  onChange={(e) => onExecutionRoleArnChange(e.target.value)}
                  onBlur={onExecutionRoleArnBlur}
                  placeholder={EXECUTION_ROLE_ARN_FIELD.placeholder}
                />
              </div>
              {EXECUTION_ROLE_ARN_FIELD.helpText && (
                <div className="help-text">{EXECUTION_ROLE_ARN_FIELD.helpText}</div>
              )}
              {executionRoleArnError && (
                <div className="error-text">
                  <i className="codicon codicon-error"></i>
                  {executionRoleArnError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ActionForm
        title=""
        actionButton={{
          text: DEPLOY_TAB_CONFIG.ui.buttons.packageDeploy,
          onClick: onDeploy,
          disabled: !canDeploy || isDeploying,
          isLoading: isDeploying,
          variant: 'primary',
          className: 'package-deploy-button',
          tooltip: deployButtonTooltip,
        }}
        statusText={deploymentStatusText}
        statusType="idle"
        validationError={validationError}
        warningMessage={workflowNameWarning}
        warningType={warningType}
        warningAction={
          hasConversionAction
            ? {
                text: 'Convert to Deployment Format',
                onClick: onConvert,
                icon: 'wand',
              }
            : undefined
        }
      >
        <></>
      </ActionForm>
    </div>
  );
};
