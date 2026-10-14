import type { ActionState } from './ActionState';

interface Contact {
  x: number;
  y: number;
}

/** Convert drag, two-finger pinch, and wheel input into shared logical view gestures. */
export class OrbitGestureAdapter {
  private readonly contacts = new Map<number, Contact>();
  private readonly listeners = new AbortController();

  constructor(
    private readonly element: HTMLElement,
    private readonly state: ActionState,
  ) {
    const options = { signal: this.listeners.signal };
    element.addEventListener('pointerdown', this.onDown, options);
    element.addEventListener('pointermove', this.onMove, options);
    element.addEventListener('pointerup', this.onEnd, options);
    element.addEventListener('pointercancel', this.onEnd, options);
    element.addEventListener('lostpointercapture', this.onEnd, options);
    element.addEventListener('wheel', this.onWheel, { ...options, passive: false });
    window.addEventListener('blur', this.release, options);
    document.addEventListener('visibilitychange', this.release, options);
    this.state.clearViewGestures();
  }

  destroy(): void {
    this.listeners.abort();
    this.release();
  }

  private onDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.contacts.size >= 2) return;
    event.preventDefault();
    this.contacts.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.element.setPointerCapture(event.pointerId);
  };

  private onMove = (event: PointerEvent): void => {
    const previous = this.contacts.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    const other = [...this.contacts.entries()].find(([id]) => id !== event.pointerId)?.[1];
    let zoom = 0;
    if (other) {
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
      if (before > 8 && after > 8) zoom = Math.log(after / before);
    }
    const dragScale = other ? 0.5 : 1;
    this.state.addViewGesture(
      (-dx / Math.max(1, this.element.clientWidth)) * Math.PI * 2 * dragScale,
      (dy / Math.max(1, this.element.clientHeight)) * Math.PI * dragScale,
      zoom,
    );
    previous.x = event.clientX;
    previous.y = event.clientY;
  };

  private onEnd = (event: PointerEvent): void => {
    this.contacts.delete(event.pointerId);
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    // Normalize wheel devices that report pixels, lines, or pages.
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 240 : 1;
    this.state.addViewGesture(0, 0, Math.max(-0.3, Math.min(0.3, -event.deltaY * unit * 0.001)));
  };

  private release = (): void => {
    for (const id of this.contacts.keys()) {
      if (this.element.hasPointerCapture(id)) this.element.releasePointerCapture(id);
    }
    this.contacts.clear();
    this.state.clearViewGestures();
  };
}
