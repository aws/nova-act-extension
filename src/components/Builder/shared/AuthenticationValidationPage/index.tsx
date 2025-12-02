import React from 'react';

import { useIamIdentity } from '../../../../core/context/IamIdentityContext';
import { useInitialTab } from '../../../../core/context/InitialTabContext';
import { TAB_NAMES } from '../../../../core/types/sidebarMessages';
import './index.css';

interface AuthenticationValidationPageProps {
  credentialStatus: 'checking' | 'invalid';
  actionContext: string;
  wrapperClassName?: string;
}

export const AuthenticationValidationPage: React.FC<AuthenticationValidationPageProps> = ({
  credentialStatus,
  actionContext,
  wrapperClassName = 'auth-validation-wrapper',
}) => {
  const { refreshCredentials, isRefreshing } = useIamIdentity();
  const { navigateToTab } = useInitialTab();

  const handleNavigateToAuthenticate = () => {
    navigateToTab(TAB_NAMES.AUTHENTICATE);
  };

  if (credentialStatus === 'checking') {
    return (
      <div className={wrapperClassName}>
        <div className="credential-validation-notice">
          <div className="notice-icon">
            <i className="codicon codicon-loading codicon-modifier-spin"></i>
          </div>
          <h2>Validating Credentials</h2>
          <p>Checking your AWS credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <div className="credential-validation-notice">
        <div className="notice-icon">
          <i className="codicon codicon-warning"></i>
        </div>
        <h2>AWS Credentials Required</h2>
        <p>You need to configure AWS credentials to {actionContext}.</p>

        <div className="credential-actions">
          <button
            className="retry-credentials-button primary-button"
            onClick={refreshCredentials}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <i className="codicon codicon-loading codicon-modifier-spin"></i>
                Validating...
              </>
            ) : (
              <>
                <i className="codicon codicon-refresh"></i>
                Retry Validation
              </>
            )}
          </button>

          <button
            className="authenticate-link-button secondary-button"
            onClick={handleNavigateToAuthenticate}
          >
            <i className="codicon codicon-arrow-left"></i>
            Authenticate Tab
          </button>
        </div>
      </div>
    </div>
  );
};
