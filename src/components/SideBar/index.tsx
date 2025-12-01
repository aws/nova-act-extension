import { useEffect, useState } from 'react';

import { templates } from '../../core/templates/templates';
import { TAB_NAMES } from '../../core/types/sidebarMessages';
import {
  AiEdit,
  BookIcon,
  ChevronIcon,
  CloudUploadIcon,
  FilePlusIcon,
  LockIcon,
  RunIcon,
} from '../../core/utils/svg';
// Removed SVG imports - using emojis for consistency
import { sidebarVscodeApi } from '../../core/utils/vscodeApi';
import logger from '../webviewLogger';
import './index.css';

// Default prompt for workflow generation
const DEFAULT_WORKFLOW_PROMPT =
  '@novaAct create a script to click the learn more button on nova.amazon.com/act and then return the title and publication date of the blog';

export function SideBarPanel() {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const [isVSCode, setIsVSCode] = useState<boolean>(false);

  logger.debug('SideBarPanel: Component initialized');
  function handleBuilderButtonClick() {
    logger.debug('SideBarPanel: Builder button clicked');
    sidebarVscodeApi.postMessage({
      command: 'builderMode',
      initialTab: TAB_NAMES.BUILD,
    });
  }

  function handleDeployButtonClick() {
    logger.debug('SideBarPanel: Deploy button clicked');
    sidebarVscodeApi.postMessage({
      command: 'builderMode',
      initialTab: TAB_NAMES.DEPLOY,
    });
  }

  function handleRunButtonClick() {
    logger.debug('SideBarPanel: Run button clicked');
    sidebarVscodeApi.postMessage({
      command: 'builderMode',
      initialTab: TAB_NAMES.RUN_WORKFLOWS,
    });
  }

  function handleGenerateWorkflowClick() {
    logger.debug('SideBarPanel: Generate workflow button clicked');
    // Navigate to Copilot with a starting prompt for Workflow generation
    sidebarVscodeApi.postMessage({
      command: 'openCopilotWithPrompt',
      prompt: DEFAULT_WORKFLOW_PROMPT,
    });
  }

  function handleOpenTemplate(templateId?: string) {
    if (!templateId) return;
    const template = templates[templateId];
    if (!template) return;

    sidebarVscodeApi.postMessage({
      command: 'builderMode',
      template,
      initialTab: TAB_NAMES.BUILD,
    });
  }

  function handleCheckApiKeyStatus() {
    logger.debug('SideBarPanel: Check API Key Status button clicked');
    setIsLoading(true);
    sidebarVscodeApi.postMessage({
      command: 'checkApiKeyStatus',
    });
  }

  useEffect(() => {
    logger.debug('SideBarPanel: useEffect hook running, setting up message handler');

    const messageHandler = (event: MessageEvent) => {
      logger.debug(`SideBarPanel: Received message from extension: ${JSON.stringify(event.data)}`);
      const message = event.data;
      if (message.type === 'init') {
        logger.debug(
          `SideBarPanel: Processing init message - hasApiKey: ${message.hasApiKey}, isVSCode: ${message.isVSCode}`
        );
        setHasApiKey(message.hasApiKey);
        setIsVSCode(message.isVSCode);
        setIsLoading(false);
        logger.debug(
          `SideBarPanel: State updated - hasApiKey: ${message.hasApiKey}, isVSCode: ${message.isVSCode}, isLoading: false`
        );
      }
    };

    window.addEventListener('message', messageHandler);
    logger.debug('SideBarPanel: Message handler registered');

    // Request initial status check
    logger.debug('SideBarPanel: Requesting initial API key status check');
    handleCheckApiKeyStatus();

    return () => {
      logger.debug('SideBarPanel: Cleaning up message handler');
      window.removeEventListener('message', messageHandler);
    };
  }, []);

  logger.debug(`SideBarPanel: Rendering - hasApiKey: ${hasApiKey}, isLoading: ${isLoading}`);

  return (
    <div className="container">
      <div className="welcome-section">
        <h1>Welcome to the Nova Act extension!</h1>
        <p className="description">
          The Nova Act extension transforms how you build with Nova Act by unifying script
          development, testing, and debugging directly into your IDE. Get started by selecting an
          action below to quickly build reliable, production-grade workflows
        </p>
      </div>

      <div className="center-container">
        <div className="button-container">
          <button
            id="authenticateBtn"
            className="action-button"
            title="Authenticate with AWS or API Key"
            onClick={() => {
              sidebarVscodeApi.postMessage({
                command: 'builderMode',
                initialTab: TAB_NAMES.AUTHENTICATE,
              });
            }}
          >
            <LockIcon />
            Authenticate
          </button>
          <div className="builder-mode-with-templates">
            <div className="inline-buttons">
              <button
                id="builderBtn"
                className="left-btn action-button"
                title="Open builder mode"
                onClick={handleBuilderButtonClick}
              >
                <FilePlusIcon />
                Build Workflows
              </button>
              <button
                title="Show templates"
                className={`right-btn icon-button ${showTemplates && 'expanded'}`}
                onClick={() => setShowTemplates(!showTemplates)}
              >
                <ChevronIcon />
              </button>
            </div>
            {showTemplates && (
              <div className="template-container">
                {Object.keys(templates).map((k, index) => (
                  <button
                    id={`builder-mode-template-btn-${index}`}
                    className="secondary-button template-button"
                    key={`template-select-${k}`}
                    onClick={() => handleOpenTemplate(k)}
                    title={templates[k]?.description}
                  >
                    {`Template - ${templates[k]?.name}`}
                    <br />
                    {`${templates[k]?.description}`}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            id="deployBtn"
            className="action-button"
            title="Open deploy mode"
            onClick={handleDeployButtonClick}
          >
            <CloudUploadIcon />
            Deploy Workflows
          </button>
          <button
            id="runBtn"
            className="action-button"
            title="Open run mode"
            onClick={handleRunButtonClick}
          >
            <RunIcon />
            Run Workflows
          </button>
          {isVSCode && (
            <button
              id="generateBtn"
              title="Generate Workflows"
              className="action-button"
              onClick={handleGenerateWorkflowClick}
            >
              <AiEdit /> Generate Workflows
            </button>
          )}
          <button
            id="guideBtn"
            title="Open Guide and Examples"
            className="action-button"
            onClick={() => {
              sidebarVscodeApi.postMessage({
                command: 'openExternalUrl',
                url: 'https://github.com/aws/nova-act',
              });
            }}
          >
            <BookIcon />
            Guide and Examples
          </button>
        </div>
      </div>
    </div>
  );
}
