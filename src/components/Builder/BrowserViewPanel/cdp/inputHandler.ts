import type { CDPClient } from './cdpClient';
import type { MouseButton, MouseEventType } from './cdpTypes';

const log = (..._args: unknown[]) => {
  // Uncomment for debugging: console.log('[InputHandler]', ...args);
};

interface ScaleInfo {
  scaleX: number;
  scaleY: number;
}

export class InputHandler {
  private client: CDPClient;
  private canvas: HTMLCanvasElement;
  private getScale: () => ScaleInfo;
  private pendingMove: MouseEvent | null = null;
  private moveRafId: number | null = null;
  private hasGlobalMouseUp = false;

  constructor(client: CDPClient, canvas: HTMLCanvasElement, getScale: () => ScaleInfo) {
    this.client = client;
    this.canvas = canvas;
    this.getScale = getScale;
  }

  attach(): void {
    // Prevent double-attaching if called multiple times
    this.detach();

    // Prevent native text-selection drag so Shift+click-drag doesn't
    // swallow mousedown/mouseup events on the canvas.
    this.canvas.style.userSelect = 'none';
    (this.canvas.style as unknown as Record<string, string>).webkitUserSelect = 'none';
    this.canvas.addEventListener('selectstart', this.onSelectStart);
    this.canvas.addEventListener('dragstart', this.onDragStart);

    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.canvas.addEventListener('keydown', this.onKeyDown);
    this.canvas.addEventListener('keyup', this.onKeyUp);
  }

  detach(): void {
    this.canvas.removeEventListener('selectstart', this.onSelectStart);
    this.canvas.removeEventListener('dragstart', this.onDragStart);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    if (this.hasGlobalMouseUp) {
      window.removeEventListener('mouseup', this.onGlobalMouseUp);
      this.hasGlobalMouseUp = false;
    }
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('keydown', this.onKeyDown);
    this.canvas.removeEventListener('keyup', this.onKeyUp);
    if (this.moveRafId !== null) {
      cancelAnimationFrame(this.moveRafId);
      this.moveRafId = null;
    }
    this.pendingMove = null;
    this.canvas.style.userSelect = '';
    (this.canvas.style as unknown as Record<string, string>).webkitUserSelect = '';
  }

  // ── coordinate helpers ──

  private toDeviceCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const { scaleX, scaleY } = this.getScale();
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  }

  private getButton(e: MouseEvent): MouseButton {
    switch (e.button) {
      case 0:
        return 'left';
      case 1:
        return 'middle';
      case 2:
        return 'right';
      default:
        return 'none';
    }
  }

  /** Modifier bitmask via getModifierState — matches DevTools InputModel. */
  private modifiersForEvent(e: MouseEvent | KeyboardEvent): number {
    return (
      Number(e.getModifierState('Alt')) |
      (Number(e.getModifierState('Control')) << 1) |
      (Number(e.getModifierState('Meta')) << 2) |
      (Number(e.getModifierState('Shift')) << 3)
    );
  }

  // ── mouse ──

  private sendMouse(e: MouseEvent, type: MouseEventType): void {
    if (!this.canvas.isConnected) return;
    const { x, y } = this.toDeviceCoords(e);
    const modifiers = this.modifiersForEvent(e);
    const button = type === 'mouseMoved' ? 'none' : this.getButton(e);
    const clickCount = type === 'mouseMoved' ? 0 : e.detail;
    log('sendMouse', {
      type,
      x,
      y,
      button,
      clickCount,
      modifiers,
      buttons: e.buttons,
    });
    this.client.sendMouseEvent({ type, x, y, button, clickCount, modifiers });
  }

  private onMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    this.canvas.focus();
    this.sendMouse(e, 'mousePressed');
    if (!this.hasGlobalMouseUp) {
      this.hasGlobalMouseUp = true;
      window.addEventListener('mouseup', this.onGlobalMouseUp);
    }
  };

  private onGlobalMouseUp = (e: MouseEvent): void => {
    this.hasGlobalMouseUp = false;
    window.removeEventListener('mouseup', this.onGlobalMouseUp);
    this.sendMouse(e, 'mouseReleased');
  };

  private onSelectStart = (e: Event): void => {
    e.preventDefault();
  };
  private onDragStart = (e: Event): void => {
    e.preventDefault();
  };

  private onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.pendingMove = e;
    if (this.moveRafId === null) {
      this.moveRafId = requestAnimationFrame(() => {
        if (this.pendingMove) {
          this.sendMouse(this.pendingMove, 'mouseMoved');
          this.pendingMove = null;
        }
        this.moveRafId = null;
      });
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const { x, y } = this.toDeviceCoords(e);
    this.client.sendScroll({ x, y, deltaX: e.deltaX, deltaY: e.deltaY });
  };

  // ── keyboard ──
  // Printable chars → Input.insertText (most reliable over raw WS CDP).
  // Everything else → rawKeyDown / keyUp.

  private onKeyDown = (e: KeyboardEvent): void => {
    log('keydown', {
      key: e.key,
      code: e.code,
      keyCode: e.keyCode,
      modifiers: this.modifiersForEvent(e),
      state: this.client.state,
    });
    if (this.client.state !== 'connected') return;
    e.preventDefault();

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      log('insertText', e.key);
      this.client.sendInsertText(e.key);
      return;
    }

    log('rawKeyDown', { key: e.key, code: e.code, vk: e.keyCode });
    this.client.sendKeyEvent({
      type: 'rawKeyDown',
      key: e.key,
      code: e.code,
      modifiers: this.modifiersForEvent(e),
      windowsVirtualKeyCode: e.keyCode,
      nativeVirtualKeyCode: e.keyCode,
    });
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    log('keyup', {
      key: e.key,
      code: e.code,
      keyCode: e.keyCode,
      state: this.client.state,
    });
    if (this.client.state !== 'connected') return;
    e.preventDefault();

    this.client.sendKeyEvent({
      type: 'keyUp',
      key: e.key,
      code: e.code,
      modifiers: this.modifiersForEvent(e),
      windowsVirtualKeyCode: e.keyCode,
      nativeVirtualKeyCode: e.keyCode,
    });
  };
}
