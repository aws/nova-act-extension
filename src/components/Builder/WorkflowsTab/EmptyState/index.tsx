import React from 'react';

import { OutputDisplay } from '../../DeployTab/OutputDisplay';
import './index.css';

interface EmptyStateProps {
  onGoToDeploy: () => void;
  onRetry: () => void;
  error: string | null;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onGoToDeploy, onRetry, error }) => {
  if (error) {
    return (
      <div className="empty-state empty-state--error">
        <OutputDisplay title="Failed to load workflows" content={error} status="error" />
        <button onClick={onRetry}>Retry</button>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <p>No workflows deployed yet.</p>
      <p>Deploy a workflow in the Deploy tab to get started.</p>
      <button onClick={onGoToDeploy}>Go to Deploy Tab</button>
    </div>
  );
};
