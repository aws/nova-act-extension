import React from 'react';

import { useIamIdentity } from '../../../core/context/IamIdentityContext';
import { AuthenticationValidationPage } from '../shared/AuthenticationValidationPage';
import './index.css';
import { DeploymentPage } from './pages/DeploymentPage';

export const DeployTab: React.FC = () => {
  const { credentialStatus } = useIamIdentity();

  if (credentialStatus !== 'valid') {
    return (
      <AuthenticationValidationPage
        credentialStatus={credentialStatus}
        actionContext="deploy workflows"
        wrapperClassName="deploy-tab-wrapper"
      />
    );
  }

  return (
    <div className="deploy-tab-wrapper">
      <div className="deploy-tab-container">
        <div className="deploy-tab-content">
          <DeploymentPage />
        </div>
      </div>
    </div>
  );
};
