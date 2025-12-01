import React from 'react';

import './index.css';

interface ConsoleLinkProps {
  region: string;
  workflowDefinitionName: string;
  linkText?: string;
  className?: string;
}

export const ConsoleLink: React.FC<ConsoleLinkProps> = ({
  region,
  workflowDefinitionName,
  linkText = 'View Workflow Run in AWS Console',
  className = 'console-link-button',
}) => {
  const consoleUrl = `https://${region}.console.aws.amazon.com/nova-act/home#/workflow-definitions/${workflowDefinitionName}`;

  return (
    <a href={consoleUrl} target="_blank" rel="noopener noreferrer" className={className}>
      <span className="button-text">{linkText}</span>
      <i className="codicon codicon-link-external"></i>
    </a>
  );
};
