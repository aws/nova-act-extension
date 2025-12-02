import React from 'react';

import { builderModeVscodeApi } from '../../../../core/utils/vscodeApi';
import './index.css';

interface AuthActionSectionProps {
  detailsCommand: 'viewWorkflowDetails' | 'viewNovaActStepDetails';
  buttonText: string;
  buttonDisabled: boolean;
  onButtonClick: () => void;
}

export const AuthActionSection: React.FC<AuthActionSectionProps> = ({
  detailsCommand,
  buttonText,
  buttonDisabled,
  onButtonClick,
}) => {
  return (
    <div className="auth-action-section">
      <div className="auth-action-row">
        <button
          className="auth-action-button start-building-button"
          onClick={onButtonClick}
          disabled={buttonDisabled}
        >
          {buttonText}
        </button>
        <span
          className="inline-action-link"
          onClick={() => builderModeVscodeApi.postMessage({ command: detailsCommand })}
        >
          (View Details)
        </span>
      </div>
    </div>
  );
};
