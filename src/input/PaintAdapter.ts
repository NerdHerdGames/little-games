import type { ActionState, PaintAction } from './ActionState';

/** Convert captured mouse, pen, or touch strokes into logical art-space segments. */
export class PaintAdapter {
  private readonly listeners = new AbortController();
  private pointer: number | undefined;
  private previous: { x: number; y: number } | undefined;
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly state: ActionState,
  ) {
    const options = { signal: this.listeners.signal };
    canvas.addEventListener('pointerdown', this.down, options);
    canvas.addEventListener('pointermove', this.move, options);
    canvas.addEventListener('pointerup', this.up, options);
    canvas.addEventListener('pointercancel', this.release, options);
    canvas.addEventListener('lostpointercapture', this.release, options);
    window.addEventListener('blur', this.release, options);
    document.addEventListener('visibilitychange', this.release, options);
    state.clearPaint();
  }
  destroy(): void {
    this.listeners.abort();
    this.release();
    this.state.clearPaint();
  }
  private point(event: PointerEvent): { x: number; y: number } {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) * this.canvas.width) / bounds.width,
      y: ((event.clientY - bounds.top) * this.canvas.height) / bounds.height,
    };
  }
  private down = (event: PointerEvent): void => {
    if (this.pointer !== undefined || event.button !== 0) return;
    event.preventDefault();
    this.pointer = event.pointerId;
    this.previous = this.point(event);
    this.canvas.setPointerCapture(event.pointerId);
    this.state.requestPaint({ from: this.previous, to: this.previous });
  };
  private move = (event: PointerEvent): void => {
    if (this.pointer !== event.pointerId || !this.previous) return;
    event.preventDefault();
    const events = event.getCoalescedEvents?.() ?? [];
    for (const point of events.length ? events : [event]) {
      const to = this.point(point);
      const action: PaintAction = { from: this.previous, to };
      this.state.requestPaint(action);
      this.previous = to;
    }
  };
  private up = (event: PointerEvent): void => {
    if (this.pointer !== event.pointerId) return;
    this.move(event);
    this.release();
  };
  private release = (): void => {
    const pointer = this.pointer;
    this.pointer = undefined;
    this.previous = undefined;
    if (pointer !== undefined && this.canvas.hasPointerCapture(pointer))
      this.canvas.releasePointerCapture(pointer);
  };
}
