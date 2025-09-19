import React, { useEffect, useRef, useState } from 'react';

import './index.css';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 250,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const timeoutRef = useRef<NodeJS.Timeout>();
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Small delay to ensure DOM is ready for positioning
      setTimeout(() => {
        updateTooltipPosition();
      }, 10);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const updateTooltipPosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();

    // Create a temporary element to measure tooltip dimensions
    const tempTooltip = document.createElement('div');
    tempTooltip.className = `button-tooltip button-tooltip-${position}`;
    tempTooltip.style.visibility = 'hidden';
    tempTooltip.style.position = 'fixed';
    tempTooltip.style.top = '-9999px';
    tempTooltip.textContent = content;
    document.body.appendChild(tempTooltip);

    const tooltipRect = tempTooltip.getBoundingClientRect();
    document.body.removeChild(tempTooltip);

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + 8;
        break;
    }

    // Keep tooltip within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;

    // Horizontal bounds checking
    if (left < padding) {
      left = padding;
    } else if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }

    // Vertical bounds checking with fallback positioning
    if (top < padding) {
      // If tooltip would go above viewport, show it below the trigger instead
      top = triggerRect.bottom + 8;
    } else if (top + tooltipRect.height > viewportHeight - padding) {
      // If tooltip would go below viewport, show it above the trigger instead
      top = triggerRect.top - tooltipRect.height - 8;

      // Final fallback: if still doesn't fit, position it at the top of viewport
      if (top < padding) {
        top = padding;
      }
    }

    // Ensure tooltip is never positioned outside viewport
    left = Math.max(padding, Math.min(left, viewportWidth - tooltipRect.width - padding));
    top = Math.max(padding, Math.min(top, viewportHeight - tooltipRect.height - padding));

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 10000,
    });
  };

  useEffect(() => {
    if (isVisible) {
      updateTooltipPosition();

      // Add window resize and scroll listeners to reposition tooltip
      const handleResize = () => {
        if (isVisible) {
          updateTooltipPosition();
        }
      };

      const handleScroll = () => {
        if (isVisible) {
          updateTooltipPosition();
        }
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true); // Use capture to catch all scroll events

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const clonedChild = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => {
      showTooltip();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hideTooltip();
      children.props.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      showTooltip();
      children.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hideTooltip();
      children.props.onBlur?.(e);
    },
  });

  return (
    <>
      {clonedChild}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`button-tooltip button-tooltip-${position}`}
          style={tooltipStyle}
        >
          {content}
        </div>
      )}
    </>
  );
};
