import React from 'react';

import { DEPLOY_TAB_CONFIG } from '../../../../core/config/deployTabConfig';
import { Tooltip } from '../../Tooltip';
import './index.css';

interface IamIdentitySectionProps {
  iamIdentity: string;
  isRefreshing: boolean;
  onRefreshCredentials: () => void;
}

export const IamIdentitySection: React.FC<IamIdentitySectionProps> = ({
  iamIdentity,
  isRefreshing,
  onRefreshCredentials,
}) => {
  return (
    <div className="iam-identity-compact">
      <span className="iam-label">{DEPLOY_TAB_CONFIG.ui.labels.iamIdentity}</span>
      <Tooltip content={iamIdentity || 'None'} position="bottom">
        <span className="iam-arn">{iamIdentity || 'None'}</span>
      </Tooltip>
      <button
        onClick={onRefreshCredentials}
        disabled={isRefreshing}
        className="refresh-icon-button"
        aria-label="Refresh credentials"
      >
        <i className={`codicon codicon-refresh ${isRefreshing ? 'refresh-spinner' : ''}`}></i>
      </button>
    </div>
  );
};
