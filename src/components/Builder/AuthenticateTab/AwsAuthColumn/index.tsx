import React, { useState } from 'react';

import { useAuthentication } from '../../../../core/context/AuthenticationContext';
import { useInitialTab } from '../../../../core/context/InitialTabContext';
import { templates } from '../../../../core/templates/templates';
import { TAB_NAMES } from '../../../../core/types/sidebarMessages';
import { builderModeVscodeApi } from '../../../../core/utils/vscodeApi';
import { ConfirmationModal } from '../../NotebookPanel/ConfirmationModal';
import { AuthActionSection } from '../AuthActionSection';
import './index.css';

export const AwsAuthColumn: React.FC = () => {
  const { awsCredentialStatus, setAuthMethod, validateAwsCredentials } = useAuthentication();
  const { navigateToTab } = useInitialTab();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dontRemind, setDontRemind] = useState(false);

  const loadTemplateAndSwitchTab = () => {
    setAuthMethod('aws');
    const awsWorkflowTemplate = templates['act-workflow'];
    if (awsWorkflowTemplate) {
      navigateToTab(TAB_NAMES.BUILD);
      builderModeVscodeApi.postMessage({
        command: 'builderMode',
        template: awsWorkflowTemplate,
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

  const handleValidateCredentials = () => {
    validateAwsCredentials();
  };

  return (
    <>
      <div className="auth-column aws-column">
        <h2>IAM Authentication</h2>
        <p className="auth-description">
          For production development with built-in AWS Console observability
        </p>

        <ol className="auth-instructions auth-description">
          <li>
            Configure AWS credentials using <code>aws configure</code>{' '}
            <a
              href="https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              (install CLI)
            </a>{' '}
            or set environment variables{' '}
            <a
              href="https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              (docs)
            </a>
          </li>
          <li>
            Validate credentials{' '}
            {awsCredentialStatus === 'checking' ? (
              <span className="inline-action-link disabled">
                <span className="codicon codicon-loading codicon-modifier-spin"></span>{' '}
                validating...
              </span>
            ) : (
              <span className="inline-action-link" onClick={handleValidateCredentials}>
                here
              </span>
            )}
          </li>
        </ol>

        <p className="auth-description">
          Workflow data is temporarily collected with this authentication method, subject to your
          AWS customer terms.
        </p>

        <AuthActionSection
          detailsCommand="viewWorkflowDetails"
          buttonText="Build with AWS Credentials"
          buttonDisabled={awsCredentialStatus !== 'valid'}
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
