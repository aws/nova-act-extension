import { type ReactNode, useRef, useState } from 'react';

import './index.css';

interface ExpandableSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  isCollapsible?: boolean;
}

export const ExpandableSection = ({
  title,
  children,
  defaultExpanded = false,
  isCollapsible = true,
}: ExpandableSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);

  const toggleExpanded = () => {
    if (isCollapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpanded();
    }
  };

  return (
    <div className="expandable-section">
      <div
        className={`expandable-header ${isCollapsible ? 'collapsible' : 'non-collapsible'}`}
        onClick={toggleExpanded}
        onKeyDown={handleKeyDown}
        tabIndex={isCollapsible ? 0 : -1}
        role={isCollapsible ? 'button' : 'heading'}
        aria-expanded={isCollapsible ? isExpanded : undefined}
        aria-controls="expandable-content"
      >
        <h3 className="expandable-title">{title}</h3>
        {isCollapsible && (
          <span className={`expand-icon ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <span className="expand-icon-symbol" />
          </span>
        )}
      </div>
      <div
        ref={contentRef}
        id="expandable-content"
        className={`expandable-content ${isExpanded ? 'expanded' : 'collapsed'}`}
        aria-hidden={!isExpanded}
      >
        <div className="expandable-content-inner">{children}</div>
      </div>
    </div>
  );
};
