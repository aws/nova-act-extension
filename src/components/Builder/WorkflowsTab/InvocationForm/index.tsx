import React from 'react';

import { builderModeVscodeApi } from '../../../../core/utils/vscodeApi';
import { ActionForm } from '../../DeployTab/ActionForm';
import { ButtonGroup, ButtonGroupButton } from '../../DeployTab/ButtonGroup';
import './index.css';

interface InvocationFormProps {
  // Form state
  invocationPayload: string;

  // Form handlers
  onPayloadChange: (payload: string) => void;
  onInvoke: () => void;
  onClearPayload: () => void;
  onFormatPayload: () => void;

  // Form execution state
  isInvoking: boolean;
  invocationStatusText: string;

  // Form validation
  isValidJson: (str: string) => boolean;
}

export const InvocationForm: React.FC<InvocationFormProps> = ({
  invocationPayload,
  onPayloadChange,
  onInvoke,
  onClearPayload,
  onFormatPayload,
  isInvoking,
  invocationStatusText,
  isValidJson,
}) => {
  return (
    <div className="endpoint-section">
      <div className="runtime-invocation-content">
        <div className="runtime-invocation-overlay-controls">
          <ButtonGroup>
            <ButtonGroupButton
              onClick={onClearPayload}
              disabled={isInvoking}
              variant="secondary"
              aria-label="Clear payload"
            >
              <i className="codicon codicon-clear-all"></i>
              Clear
            </ButtonGroupButton>
            <ButtonGroupButton
              onClick={onFormatPayload}
              disabled={isInvoking || !isValidJson(invocationPayload)}
              variant="secondary"
              aria-label="Format JSON"
            >
              <i className="codicon codicon-symbol-structure"></i>
              Format
            </ButtonGroupButton>
          </ButtonGroup>
        </div>

        <div className="runtime-invocation">
          <ActionForm
            title=""
            actionButton={{
              text: 'Invoke Your Workflow',
              onClick: onInvoke,
              disabled: isInvoking || !isValidJson(invocationPayload),
              isLoading: isInvoking,
              variant: 'primary',
              className: 'invoke-runtime-button',
            }}
            statusText={isInvoking ? 'Invoking runtime' : invocationStatusText}
            statusType="idle"
          >
            <div className="form-group">
              <div className="label-with-info">
                <label htmlFor="invocation-payload">AgentCore Runtime JSON Payload</label>
                <span
                  className="codicon codicon-info docs-link"
                  onClick={() =>
                    builderModeVscodeApi.postMessage({
                      command: 'openExternalUrl',
                      url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_InvokeAgentRuntime.html#API_InvokeAgentRuntime_RequestBody',
                    })
                  }
                  title="View AgentCore Runtime API documentation"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      builderModeVscodeApi.postMessage({
                        command: 'openExternalUrl',
                        url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_InvokeAgentRuntime.html#API_InvokeAgentRuntime_RequestBody',
                      });
                    }
                  }}
                ></span>
              </div>
              <textarea
                id="invocation-payload"
                value={invocationPayload}
                onChange={(e) => onPayloadChange(e.target.value)}
                placeholder='{"key": "value"}'
                disabled={isInvoking}
                className="payload-input"
              />
            </div>
          </ActionForm>
        </div>
      </div>
      <div className="section-divider"></div>
    </div>
  );
};
