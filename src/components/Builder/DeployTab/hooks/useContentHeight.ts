import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Custom hook for managing dynamic content height with automatic resize handling.
 *
 * Provides a ref to attach to content elements and automatically calculates optimal height
 * based on content size, constrained by min/max bounds. Handles ResizeObserver for content
 * changes and window resize events for responsive behavior.
 *
 * @param options Configuration for height constraints and update dependencies
 * @returns Object with current height, content ref, and manual update function
 */

interface UseContentHeightOptions {
  minHeight?: number;
  maxHeight?: number;
  dependencies?: unknown[];
}

interface UseContentHeightReturn {
  height: number;
  contentRef: React.RefObject<HTMLElement>;
  updateHeight: () => void;
}

const DEFAULT_MIN_HEIGHT = 100;
const DEFAULT_MAX_HEIGHT = 400;

export const useContentHeight = ({
  minHeight = DEFAULT_MIN_HEIGHT,
  maxHeight = DEFAULT_MAX_HEIGHT,
  dependencies = [],
}: UseContentHeightOptions = {}): UseContentHeightReturn => {
  const contentRef = useRef<HTMLElement>(null);
  const [height, setHeight] = useState(minHeight);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const updateHeight = useCallback(() => {
    if (contentRef.current) {
      const scrollHeight = contentRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      setHeight(newHeight);
    }
  }, [minHeight, maxHeight]);

  useEffect(() => {
    updateHeight();
  }, [updateHeight, ...dependencies]);

  useEffect(() => {
    if (!contentRef.current) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      updateHeight();
    });

    resizeObserverRef.current.observe(contentRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [updateHeight]);

  useEffect(() => {
    const handleResize = () => updateHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateHeight]);

  return {
    height,
    contentRef,
    updateHeight,
  };
};
