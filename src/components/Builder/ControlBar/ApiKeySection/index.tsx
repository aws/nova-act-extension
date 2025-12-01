import React from 'react';

import { Tooltip } from '../../Tooltip';
import './index.css';

const obfuscateApiKey = (apiKey: string): string => {
  const parts = apiKey.split('-');
  if (parts.length < 2) return '***-...-***';
  return `${parts[0]}-...-${parts[parts.length - 1]}`;
};

interface ApiKeySectionProps {
  apiKey: string;
  isRefreshing: boolean;
  onRefreshApiKey: () => void;
}

export const ApiKeySection: React.FC<ApiKeySectionProps> = ({
  apiKey,
  isRefreshing,
  onRefreshApiKey,
}) => {
  const displayValue = apiKey ? obfuscateApiKey(apiKey) : 'None';

  return (
    <div className="api-key-compact">
      <span className="api-key-label">API Key: </span>
      <Tooltip content={displayValue} position="bottom">
        <span className="api-key-value">{displayValue}</span>
      </Tooltip>
      <button
        onClick={onRefreshApiKey}
        disabled={isRefreshing}
        className="refresh-icon-button"
        aria-label="Refresh API key"
      >
        <i className={`codicon codicon-refresh ${isRefreshing ? 'refresh-spinner' : ''}`}></i>
      </button>
    </div>
  );
};
