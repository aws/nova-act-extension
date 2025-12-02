import React from 'react';

import { AgentMessagesProvider } from '../../core/context/AgentMessagesContext';
import { AuthenticationProvider } from '../../core/context/AuthenticationContext';
import { CellProvider } from '../../core/context/CellsContext';
import { FileProvider } from '../../core/context/FileContext';
import { IamIdentityProvider } from '../../core/context/IamIdentityContext';
import { InitialTabProvider } from '../../core/context/InitialTabContext';
import { OutputProvider } from '../../core/context/OutputContext';
import { ControlBar } from './ControlBar';
import { NavigationTabs } from './NavigationTabs';
import './index.css';

export const BuilderPanels: React.FC = () => {
  return (
    <IamIdentityProvider>
      <div className="builder-mode">
        <ControlBar />
        <NavigationTabs />
      </div>
    </IamIdentityProvider>
  );
};

export const BuilderMode = () => {
  return (
    <OutputProvider>
      <FileProvider>
        <CellProvider>
          <AgentMessagesProvider>
            <InitialTabProvider>
              <AuthenticationProvider>
                <BuilderPanels />
              </AuthenticationProvider>
            </InitialTabProvider>
          </AgentMessagesProvider>
        </CellProvider>
      </FileProvider>
    </OutputProvider>
  );
};
