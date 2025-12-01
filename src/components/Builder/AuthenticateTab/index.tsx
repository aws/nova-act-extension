import React from 'react';

import { ApiKeyAuthColumn } from './ApiKeyAuthColumn';
import { AwsAuthColumn } from './AwsAuthColumn';
import './index.css';

export const AuthenticateTab: React.FC = () => {
  return (
    <div className="authenticate-tab">
      <div className="authenticate-tab-centered-wrapper">
        <div className="authenticate-tab-header">
          <h1>Authenticate</h1>
          <p>Choose your authentication method to start building workflows</p>
        </div>

        <div className="authenticate-columns">
          <ApiKeyAuthColumn />
          <AwsAuthColumn />
        </div>
      </div>
    </div>
  );
};
