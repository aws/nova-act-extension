/** Chrome DevTools Protocol types for screencast + input */

export interface CDPMessage {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

export interface ScreencastFrameMetadata {
  offsetTop: number;
  pageScaleFactor: number;
  deviceWidth: number;
  deviceHeight: number;
  scrollOffsetX: number;
  scrollOffsetY: number;
  timestamp?: number;
}

export interface ScreencastFrameParams {
  data: string; // base64 encoded image
  metadata: ScreencastFrameMetadata;
  sessionId: number;
}

export type MouseEventType = 'mousePressed' | 'mouseReleased' | 'mouseMoved';
export type MouseButton = 'none' | 'left' | 'middle' | 'right';

export interface DispatchMouseEventParams {
  type: MouseEventType;
  x: number;
  y: number;
  button?: MouseButton;
  clickCount?: number;
  modifiers?: number;
}

export type KeyEventType = 'keyDown' | 'keyUp' | 'rawKeyDown' | 'char';

export interface DispatchKeyEventParams {
  type: KeyEventType;
  modifiers?: number;
  text?: string;
  unmodifiedText?: string;
  key?: string;
  code?: string;
  windowsVirtualKeyCode?: number;
  nativeVirtualKeyCode?: number;
}

export interface DispatchTouchEventParams {
  type: 'touchStart' | 'touchEnd' | 'touchMove' | 'touchCancel';
  touchPoints: Array<{
    x: number;
    y: number;
    radiusX?: number;
    radiusY?: number;
    force?: number;
    id?: number;
  }>;
  modifiers?: number;
}

export interface ScrollParams {
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
}
