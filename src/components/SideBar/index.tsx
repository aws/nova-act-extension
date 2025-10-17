import { useEffect, useState } from 'react';

import { templates } from '../../core/templates/templates';
import {
  AiEdit,
  BookIcon,
  ChevronIcon,
  ExternalLinkIcon,
  GlobeIcon,
  WarningIcon,
} from '../../core/utils/svg';
// Removed SVG imports - using emojis for consistency
import { sidebarVscodeApi } from '../../core/utils/vscodeApi';
import logger from '../webviewLogger';
import './index.css';

// Default prompt for script generation
const DEFAULT_SCRIPT_PROMPT =
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
    });
  }

  function handleGenerateScriptClick() {
    logger.debug('SideBarPanel: Generate script button clicked');
    // Navigate to Copilot with a starting prompt for Nova Act script generation
    sidebarVscodeApi.postMessage({
      command: 'openCopilotWithPrompt',
      prompt: DEFAULT_SCRIPT_PROMPT,
    });
  }

  function handleOpenTemplate(templateId?: string) {
    if (!templateId) return;
    const template = templates[templateId];
    if (!template) return;

    sidebarVscodeApi.postMessage({
      command: 'builderMode',
      template,
    });
  }

  function handleSetApiKeyClick() {
    logger.debug('SideBarPanel: Set API Key button clicked');
    setIsLoading(true);
    sidebarVscodeApi.postMessage({
      command: 'setApiKey',
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
          {!hasApiKey && (
            <>
              <button id="setApiKeyBtn" className="action-button" onClick={handleSetApiKeyClick}>
                Set API Key
              </button>
              <div className="warning-text">
                <WarningIcon />
                API key required for Builder Mode
              </div>
            </>
          )}
          <div className="builder-mode-with-templates">
            <div className="inline-buttons">
              <button
                id="builderBtn"
                className="left-btn action-button"
                title="Open builder mode"
                onClick={handleBuilderButtonClick}
                disabled={!hasApiKey}
              >
                <GlobeIcon />
                Open Builder Mode
              </button>
              <button
                disabled={!hasApiKey}
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
          {isVSCode && (
            <button
              id="generateBtn"
              title="Generate Nova Act Script"
              className="action-button"
              onClick={handleGenerateScriptClick}
            >
              <AiEdit /> Generate Nova Act Script
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
          <div className="waitlist-section">
            <div className="waitlist-content">
              <h3>Path to Production</h3>
              <p>Join the preview waitlist to work with us to productionize your agents</p>
              <button
                id="waitlistBtn"
                title="Open waitlist"
                className="action-button waitlist-button"
                onClick={() => {
                  sidebarVscodeApi.postMessage({
                    command: 'openExternalUrl',
                    url: 'https://amazonexteu.qualtrics.com/jfe/form/SV_9siTXCFdKHpdwCa',
                  });
                }}
              >
                Join Waitlist
                <ExternalLinkIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
