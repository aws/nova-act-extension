import { useState } from 'react';

import { PanelBottomCloseIcon, PanelBottomOpenIcon } from '../../../core/utils/svg';
import { Tooltip } from '../Tooltip';
import { Output } from './Output';
import './index.css';

type Tabs = 'output';

export const DeveloperTabs = ({
  toggleExpand,
  isExpanded,
}: {
  readonly isExpanded: boolean;
  readonly toggleExpand: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<Tabs>('output');

  return (
    <div className="dev-tabs-container">
      <div className="panel-header">
        <div className="panel-header-left">
          <button
            className={`tab-button active`}
            data-tab="build-run"
            onClick={() => setActiveTab('output')}
          >
            Output
          </button>
        </div>
        <div className="panel-header-buttons">
          <Tooltip
            content={isExpanded ? 'Minimize output panel' : 'Maximize output panel'}
            position="left"
          >
            <button
              onClick={toggleExpand}
              aria-label={isExpanded ? 'Minimize output panel' : 'Maximize output panel'}
            >
              {isExpanded ? <PanelBottomOpenIcon /> : <PanelBottomCloseIcon />}
            </button>
          </Tooltip>
        </div>
      </div>
      <div className="tab-content">{activeTab === 'output' && <Output />}</div>
    </div>
  );
};
