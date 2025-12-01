import React, { useState } from 'react';

import { useAuthentication } from '../../../../core/context/AuthenticationContext';
import { useInitialTab } from '../../../../core/context/InitialTabContext';
import { templates } from '../../../../core/templates/templates';
import { TAB_NAMES } from '../../../../core/types/sidebarMessages';
import { builderModeVscodeApi } from '../../../../core/utils/vscodeApi';
import { ConfirmationModal } from '../../NotebookPanel/ConfirmationModal';
import { AuthActionSection } from '../AuthActionSection';
import './index.css';

export const ApiKeyAuthColumn: React.FC = () => {
  const { apiKeyStatus, setAuthMethod } = useAuthentication();
  const { navigateToTab } = useInitialTab();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dontRemind, setDontRemind] = useState(false);

  const handleSetApiKey = () => {
    builderModeVscodeApi?.postMessage({ command: 'setApiKey' });
  };

  const loadTemplateAndSwitchTab = () => {
    setAuthMethod('apiKey');
    const starterPackTemplate = templates['starter-pack'];
    if (starterPackTemplate) {
      navigateToTab(TAB_NAMES.BUILD);
      builderModeVscodeApi.postMessage({
        command: 'builderMode',
        template: starterPackTemplate,
        initialTab: TAB_NAMES.BUILD,
      });
    }
  };

  const handleStartBuilding = () => {
    if (!dontRemind) {
      setShowConfirmModal(true);
    } else {
      loadTemplateAndSwitchTab();
    }
  };

  return (
    <>
      <div className="auth-column api-key-column">
        <h2>API Key Authentication</h2>
        <p className="auth-description">To use the latest free version capabilities</p>

        <ol className="auth-instructions auth-description">
          <li>
            Generate your API key from{' '}
            <a href="https://nova.amazon.com/act" target="_blank" rel="noopener noreferrer">
              nova.amazon.com/act
            </a>
          </li>
          <li>
            Input your API key{' '}
            <span className="inline-action-link" onClick={handleSetApiKey}>
              here
            </span>
          </li>
        </ol>

        <p className="auth-description">
          Workflow data is collected with this authentication method, subject to{' '}
          <a href="https://nova.amazon.com" target="_blank" rel="noopener noreferrer">
            nova.amazon.com
          </a>{' '}
          terms.
        </p>

        <AuthActionSection
          detailsCommand="viewNovaActStepDetails"
          buttonText="Build with API Key"
          buttonDisabled={!apiKeyStatus}
          onButtonClick={handleStartBuilding}
        />
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        dontRemind={dontRemind}
        setDontRemind={setDontRemind}
        onConfirm={() => {
          loadTemplateAndSwitchTab();
          setShowConfirmModal(false);
        }}
        onCancel={() => setShowConfirmModal(false)}
        confirmationText="Warning: This will overwrite all builder mode cells with a preconfigured template for this authentication mode!"
      />
    </>
  );
};
