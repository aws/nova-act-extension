import React from 'react';

import './ConfirmationModal.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmationText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  confirmationText,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="confirmation-modal-backdrop" onClick={handleBackdropClick}>
      <div className="confirmation-modal">
        <div className="confirmation-modal-header">
          <h3>Nova Act extension</h3>
        </div>
        <div className="confirmation-modal-content">
          <p>
            {confirmationText ??
              'Are you sure you want to delete the content of all cells? This cannot be undone.'}
          </p>
        </div>
        <div className="confirmation-modal-actions">
          <button className="confirmation-modal-button cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirmation-modal-button ok" onClick={onConfirm}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
