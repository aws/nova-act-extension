import React from 'react';

import './index.css';

interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

interface ButtonGroupButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  className?: string;
  'aria-label'?: string;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export const ButtonGroupButton: React.FC<ButtonGroupButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'secondary',
  className = '',
  'aria-label': ariaLabel,
  type = 'button',
  title,
}) => {
  const buttonClass = variant === 'primary' ? 'primary-button' : 'secondary-button';

  return (
    <button
      type={type}
      className={`${buttonClass} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );
};

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className = '' }) => {
  return <div className={`button-group ${className}`.trim()}>{children}</div>;
};
