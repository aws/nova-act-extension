/* eslint-disable unicorn/filename-case */
import { useCallback, useEffect, useRef, useState } from 'react';

import './CDPBrowserView.css';
import { CDPClient, type ConnectionState, type ScreencastOptions } from './cdp/cdpClient';
import { InputHandler } from './cdp/inputHandler';

export type { ConnectionState } from './cdp/cdpClient';

export interface CDPBrowserViewProps {
  wsUrl: string;
  interactive?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  className?: string;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

const log = (..._args: unknown[]) => {
  // Uncomment for debugging: console.log('[CDPBrowserView]', ...args);
};

const OVERLAY_MESSAGES: Record<ConnectionState, string> = {
  disconnected: 'Disconnected',
  connecting: '',
  connected: '',
  error: 'Disconnected',
};

export const CDPBrowserView = ({
  wsUrl,
  interactive = true,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 80,
  className = '',
  onConnectionStateChange,
}: CDPBrowserViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clientRef = useRef<CDPClient | null>(null);
  const inputRef = useRef<InputHandler | null>(null);
  const deviceSizeRef = useRef({ width: 0, height: 0 });
  const lastBitmapRef = useRef<ImageBitmap | null>(null);
  const frameSeqRef = useRef(0);
  const lastRenderedSeqRef = useRef(0);
  const onConnectionStateChangeRef = useRef(onConnectionStateChange);
  onConnectionStateChangeRef.current = onConnectionStateChange;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const { width: dw, height: dh } = deviceSizeRef.current;
    if (!canvas || !container || !dw || !dh) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const aspect = dw / dh;
    const dpr = window.devicePixelRatio || 1;

    let w: number, h: number;
    if (cw / ch > aspect) {
      h = ch;
      w = h * aspect;
    } else {
      w = cw;
      h = w / aspect;
    }

    // Set canvas internal resolution to match physical pixels for sharp rendering
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    // Redraw last frame since setting width/height clears the canvas
    const bitmap = lastBitmapRef.current;
    if (bitmap) {
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    if (!wsUrl) {
      log('no wsUrl, skipping connection');
      return;
    }

    log('effect: creating CDPClient for', wsUrl);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const screencastOpts: ScreencastOptions = { quality, maxWidth, maxHeight };
    let aborted = false;

    const client = new CDPClient(
      (state) => {
        log('state changed:', state);
        setConnectionState(state);
        onConnectionStateChangeRef.current?.(state);
      },
      (base64Data, width, height) => {
        const sizeChanged =
          deviceSizeRef.current.width !== width || deviceSizeRef.current.height !== height;
        if (sizeChanged) {
          log('device size changed:', { width, height });
        }
        deviceSizeRef.current = { width, height };
        if (sizeChanged) fitCanvas();

        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        const frameSeq = ++frameSeqRef.current;
        createImageBitmap(blob)
          .then((bitmap) => {
            if (aborted || frameSeq < lastRenderedSeqRef.current) {
              bitmap.close();
              return;
            }
            lastRenderedSeqRef.current = frameSeq;
            ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            if (lastBitmapRef.current) lastBitmapRef.current.close();
            lastBitmapRef.current = bitmap;
          })
          .catch(() => {
            /* skip corrupt frame */
          });
      },
      screencastOpts
    );

    clientRef.current = client;

    const input = new InputHandler(client, canvas, () => {
      const dpr = window.devicePixelRatio || 1;
      return {
        scaleX: deviceSizeRef.current.width / ((canvas.width || 1) / dpr),
        scaleY: deviceSizeRef.current.height / ((canvas.height || 1) / dpr),
      };
    });
    inputRef.current = input;

    log('connecting client');
    client.connect(wsUrl);

    return () => {
      log('cleanup: disconnecting client');
      aborted = true;
      input.detach();
      client.disconnect();
      clientRef.current = null;
      inputRef.current = null;
      deviceSizeRef.current = { width: 0, height: 0 };
      frameSeqRef.current = 0;
      lastRenderedSeqRef.current = 0;
      if (lastBitmapRef.current) {
        lastBitmapRef.current.close();
        lastBitmapRef.current = null;
      }
    };
  }, [wsUrl, maxWidth, maxHeight, quality, fitCanvas]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    if (interactive && connectionState === 'connected') {
      input.attach();
    } else {
      input.detach();
    }
  }, [interactive, connectionState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => fitCanvas());
    observer.observe(container);
    return () => observer.disconnect();
  }, [fitCanvas]);

  const isConnected = connectionState === 'connected';

  const overlayClass = [
    'cdp-browser-view__overlay',
    isConnected && 'cdp-browser-view__overlay--hidden',
  ]
    .filter(Boolean)
    .join(' ');

  const canvasClass = [
    'cdp-browser-view__canvas',
    isConnected && 'cdp-browser-view__canvas--visible',
    !interactive && 'cdp-browser-view__canvas--non-interactive',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`cdp-browser-view ${className}`} ref={containerRef}>
      <canvas
        ref={canvasRef}
        className={canvasClass}
        tabIndex={interactive ? 0 : -1}
        aria-label="Remote browser viewport"
      />
      <div className={overlayClass}>
        <svg
          className="cdp-browser-view__overlay-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span className="cdp-browser-view__overlay-text">{OVERLAY_MESSAGES[connectionState]}</span>
      </div>
    </div>
  );
};
