import { useEffect } from 'react';

import { ButtonGroup, ButtonGroupButton } from '../ButtonGroup';
import { ExpandableSection } from '../ExpandableSection';
import { useContentHeight } from '../hooks/useContentHeight';
import './index.css';

const OUTPUT_DISPLAY_CONFIG = {
  heights: {
    min: 120,
    max: 400,
  },
  transitions: {
    height: '0.15s ease',
  },
} as const;

interface OutputDisplayProps {
  readonly title: string;
  readonly content: string;
  readonly status: 'idle' | 'success' | 'error';
  readonly isActive?: boolean;
  readonly onCopy?: () => void;
  readonly minHeight?: number;
  readonly maxHeight?: number;
  readonly className?: string;
}

export const OutputDisplay = ({
  title,
  content,
  status,
  isActive,
  onCopy,
  minHeight = OUTPUT_DISPLAY_CONFIG.heights.min,
  maxHeight = OUTPUT_DISPLAY_CONFIG.heights.max,
  className = '',
}: OutputDisplayProps) => {
  const { height, contentRef, updateHeight } = useContentHeight({
    minHeight,
    maxHeight,
    dependencies: [content],
  });

  useEffect(() => {
    if (contentRef.current && content) {
      const element = contentRef.current;
      const shouldAutoScroll =
        element.scrollTop + element.clientHeight >= element.scrollHeight - 10;

      if (shouldAutoScroll) {
        setTimeout(() => {
          element.scrollTop = element.scrollHeight;
        }, 0);
      }
    }
  }, [content, contentRef]);

  useEffect(() => {
    updateHeight();
  }, [content, updateHeight]);

  const effectiveDefaultExpanded = isActive || status === 'idle';

  const renderContent = () => (
    <div className={`output-content ${className}`}>
      {onCopy && (
        <div className="output-controls">
          <ButtonGroup>
            <ButtonGroupButton
              onClick={onCopy}
              disabled={!content}
              variant="secondary"
              aria-label="Copy output"
            >
              <i className="codicon codicon-copy"></i>
              Copy
            </ButtonGroupButton>
          </ButtonGroup>
        </div>
      )}
      <pre
        ref={contentRef as React.RefObject<HTMLPreElement>}
        className={`output-text ${status} dynamic-height`}
        style={{
          height: `${height}px`,
          transition: OUTPUT_DISPLAY_CONFIG.transitions.height,
          overflow: 'auto',
        }}
      >
        {content}
      </pre>
    </div>
  );

  return (
    <div className="output-display">
      <ExpandableSection
        title={title}
        defaultExpanded={effectiveDefaultExpanded}
        isCollapsible={true}
      >
        {renderContent()}
      </ExpandableSection>
    </div>
  );
};
