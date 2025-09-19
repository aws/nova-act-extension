import React from 'react';

import { AgentMessagesProvider } from '../../core/context/AgentMessagesContext';
import { CellProvider } from '../../core/context/CellsContext';
import { FileProvider } from '../../core/context/FileContext';
import { OutputProvider } from '../../core/context/OutputContext';
import { ControlBar } from './ControlBar';
import { NavigationTabs } from './NavigationTabs';
import './index.css';

export const BuilderPanels: React.FC = () => {
  return (
    <div className="builder-mode">
      <ControlBar />
      <NavigationTabs />
    </div>
  );
};

export const BuilderMode = () => {
  return (
    <OutputProvider>
      <FileProvider>
        <CellProvider>
          <AgentMessagesProvider>
            <BuilderPanels />
          </AgentMessagesProvider>
        </CellProvider>
      </FileProvider>
    </OutputProvider>
  );
};
