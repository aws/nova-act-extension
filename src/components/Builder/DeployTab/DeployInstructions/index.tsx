import React, { useState } from 'react';

import { DEPLOY_TAB_CONFIG } from '../../../../core/config/deployTabConfig';
import { builderModeVscodeApi } from '../../../../core/utils/vscodeApi';
import { ConfirmationModal } from '../../NotebookPanel/ConfirmationModal';
import './index.css';

interface DeployInstructionsProps {
  onLoadAwsTemplate: () => void;
}

export const DeployInstructions: React.FC<DeployInstructionsProps> = ({ onLoadAwsTemplate }) => {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateDontRemind, setTemplateDontRemind] = useState(false);

  const handleTemplateClick = () => {
    if (templateDontRemind) {
      onLoadAwsTemplate();
    } else {
      setShowTemplateModal(true);
    }
  };

  return (
    <>
      <div className="deploy-instructions-section spacing-loose">
        <h3 className="section-title">{DEPLOY_TAB_CONFIG.ui.titles.deployHeading}</h3>
        <div className="deploy-instructions-content">
          <p className="deploy-instructions">{DEPLOY_TAB_CONFIG.ui.instructions.introText}</p>
          <p className="deploy-instructions" style={{ marginTop: '16px' }}>
            Want to understand how deployment works?{' '}
            <span
              className="template-inline-link"
              onClick={() =>
                builderModeVscodeApi.postMessage({ command: 'viewDeploymentDocumentation' })
              }
              title="View deployment process documentation"
            >
              View Docs
            </span>
          </p>

          <div className="deploy-section-content">
            <div className="section-divider-container">
              <div className="section-divider"></div>
            </div>
            <h4 className="subsection-title">{DEPLOY_TAB_CONFIG.ui.titles.prerequisites}</h4>
            <ol className="deploy-steps-list">
              <li className="deploy-step">
                Make sure that your script defines a <code>workflow_definition_name</code> or{' '}
                <code>@workflow</code> tag, and that the name matches the AWS WorkflowDefinition
                Name you enter in the form below.{' '}
                <span
                  className="template-inline-link"
                  onClick={() =>
                    builderModeVscodeApi.postMessage({ command: 'viewWorkflowDetails' })
                  }
                  title="View Workflow documentation"
                >
                  (View Details)
                </span>
              </li>
              <li className="deploy-step">
                Make sure your workflow script is selected and <strong>saved</strong> in the file
                control bar above. The deployment process reads the saved file, not the editor
                content.
              </li>
              <li className="deploy-step">
                Ensure your AWS credentials have the required IAM permissions for deployment.{' '}
                <span
                  className="template-inline-link"
                  onClick={() =>
                    builderModeVscodeApi.postMessage({ command: 'viewIamPermissions' })
                  }
                  title="View IAM permissions"
                >
                  (View Permissions)
                </span>
              </li>
              <li className="deploy-step">
                Ensure Docker is installed and running on your system. Deployment requires Docker
                for containerization. Verify with <code>docker --version</code>
              </li>
            </ol>

            <p className="deploy-instructions">
              Need to get started quickly? Use the{' '}
              <span className="template-inline-link" onClick={handleTemplateClick}>
                AWS Workflow template
              </span>{' '}
              to create a new Workflow script in the Build tab.
            </p>

            <div className="section-divider-container">
              <div className="section-divider"></div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showTemplateModal}
        dontRemind={templateDontRemind}
        setDontRemind={setTemplateDontRemind}
        onConfirm={() => {
          onLoadAwsTemplate();
          setShowTemplateModal(false);
        }}
        onCancel={() => setShowTemplateModal(false)}
        confirmationText="This will switch to the Build tab and load the AWS Workflow template. Any unsaved changes in your current script will be lost. Do you want to proceed?"
      />
    </>
  );
};
