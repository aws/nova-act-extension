import { WarningIcon } from '../../../../core/utils/svg';
import { builderModeVscodeApi } from '../../../../core/utils/vscodeApi';
import { ButtonGroup, ButtonGroupButton } from '../ButtonGroup';
import './index.css';

interface ActionFormProps {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly actionButton: {
    readonly text: string;
    readonly onClick: () => void;
    readonly disabled: boolean;
    readonly isLoading: boolean;
    readonly variant: 'primary' | 'secondary';
    readonly className?: string;
    readonly tooltip?: string;
  };
  readonly statusText?: string;
  readonly statusType?: 'success' | 'error' | 'loading' | 'idle';
  readonly validationError?: string;
  readonly warningMessage?: string;
  readonly warningType?: 'workflow-name' | 'deployment-format' | null;
  readonly warningAction?: {
    readonly text: string;
    readonly onClick: () => void;
    readonly icon?: string;
  };
  readonly additionalControls?: React.ReactNode;
}

const getStatusClassName = (statusType?: string, statusText?: string): string => {
  if (!statusText) return '';

  if (statusText.includes('Failed')) return 'error';
  if (statusText.includes('Successful')) return 'success';
  return statusType || '';
};

const ValidationFeedback = ({ error }: { error: string }) => (
  <div className="validation-feedback error">
    <i className="codicon codicon-error"></i>
    <span className="validation-error">{error}</span>
  </div>
);

const WarningBanner = ({
  message,
  action,
  warningType,
}: {
  message: string;
  action?: { text: string; onClick: () => void; icon?: string };
  warningType?: 'workflow-name' | 'deployment-format' | null;
}) => (
  <div className="warning-with-action">
    <div className="workflow-name-warning enhanced">
      <div className="warning-content">
        <WarningIcon />
        <span>{message}</span>
        <span
          className="workflow-docs-link"
          onClick={() => {
            if (warningType === 'workflow-name') {
              builderModeVscodeApi.postMessage({ command: 'viewWorkflowDetails' });
            } else if (warningType === 'deployment-format') {
              builderModeVscodeApi.postMessage({ command: 'viewDeploymentDocumentation' });
            }
          }}
          title="View Workflow documentation"
        >
          View Details
        </span>
      </div>
    </div>
    {action && (
      <button className="warning-action-button" onClick={action.onClick}>
        {action.icon && <i className={`codicon codicon-${action.icon}`}></i>}
        <span>{action.text}</span>
      </button>
    )}
  </div>
);

export const ActionForm = ({
  title,
  children,
  actionButton,
  statusText,
  statusType,
  validationError,
  warningMessage,
  warningType,
  warningAction,
  additionalControls,
}: ActionFormProps) => {
  const statusClassName = getStatusClassName(statusType, statusText);

  return (
    <div className="action-form">
      <h3 className="section-header">{title}</h3>

      <div className="form-content">
        {children}

        {additionalControls && <div className="additional-controls">{additionalControls}</div>}

        {warningMessage && (
          <WarningBanner
            message={warningMessage}
            action={warningAction}
            warningType={warningType}
          />
        )}

        <div className="action-button-container">
          <ButtonGroup>
            <ButtonGroupButton
              onClick={actionButton.onClick}
              disabled={actionButton.disabled}
              variant={actionButton.variant}
              className={actionButton.className}
              title={actionButton.tooltip}
            >
              <span>{actionButton.text}</span>
            </ButtonGroupButton>
          </ButtonGroup>

          {statusText && <span className={`status-text ${statusClassName}`}>{statusText}</span>}
        </div>

        {validationError && <ValidationFeedback error={validationError} />}
      </div>
    </div>
  );
};
