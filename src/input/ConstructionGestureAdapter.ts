import type { ActionState } from './ActionState';

/** Single contact edits; two contacts always cancel edits and orbit/pinch. */
export class ConstructionGestureAdapter {
  orbit = false;
  private readonly contacts = new Map<number, { x: number; y: number }>();
  private readonly listeners = new AbortController();
  private multi = false;
  constructor(
    private readonly element: HTMLElement,
    private readonly state: ActionState,
  ) {
    const options = { signal: this.listeners.signal };
    element.addEventListener('pointerdown', this.down, options);
    element.addEventListener('pointermove', this.move, options);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      element.addEventListener(event, this.end as EventListener, options);
    element.addEventListener('wheel', this.wheel, { ...options, passive: false });
    window.addEventListener('blur', this.release, options);
    document.addEventListener('visibilitychange', this.release, options);
    this.state.clearBuildPointers();
    this.state.clearViewGestures();
  }
  private point(event: PointerEvent): { x: number; y: number } {
    const bounds = this.element.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1,
      y: 1 - ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2,
    };
  }
  private down = (event: PointerEvent): void => {
    if (event.button !== 0 || this.contacts.size >= 2) return;
    event.preventDefault();
    this.element.setPointerCapture(event.pointerId);
    this.contacts.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.contacts.size === 2) {
      this.multi = true;
      this.state.requestBuildPointer({ phase: 'cancel', ...this.point(event) });
    } else if (!this.orbit)
      this.state.requestBuildPointer({ phase: 'start', ...this.point(event) });
  };
  private move = (event: PointerEvent): void => {
    const previous = this.contacts.get(event.pointerId);
    if (!previous) return;
    const other = [...this.contacts.entries()].find(([id]) => id !== event.pointerId)?.[1];
    if (other || this.orbit) {
      let zoom = 0;
      if (other) {
        const before = Math.hypot(previous.x - other.x, previous.y - other.y),
          after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
        if (before > 8 && after > 8) zoom = Math.log(after / before);
      }
      this.state.addViewGesture(
        (-(event.clientX - previous.x) / Math.max(1, this.element.clientWidth)) * Math.PI,
        ((event.clientY - previous.y) / Math.max(1, this.element.clientHeight)) * Math.PI,
        zoom,
      );
    } else if (!this.multi) this.state.requestBuildPointer({ phase: 'move', ...this.point(event) });
    previous.x = event.clientX;
    previous.y = event.clientY;
  };
  private end = (event: PointerEvent): void => {
    if (!this.contacts.has(event.pointerId)) return;
    if (!this.multi && !this.orbit)
      this.state.requestBuildPointer({
        phase: event.type === 'pointerup' ? 'end' : 'cancel',
        ...this.point(event),
      });
    this.contacts.delete(event.pointerId);
    if (this.element.hasPointerCapture(event.pointerId))
      this.element.releasePointerCapture(event.pointerId);
    if (!this.contacts.size) this.multi = false;
  };
  private wheel = (event: WheelEvent): void => {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 240 : 1;
    this.state.addViewGesture(0, 0, Math.max(-0.3, Math.min(0.3, -event.deltaY * unit * 0.001)));
  };
  private release = (): void => {
    this.state.requestBuildPointer({ phase: 'cancel', x: 0, y: 0 });
    for (const id of this.contacts.keys())
      if (this.element.hasPointerCapture(id)) this.element.releasePointerCapture(id);
    this.contacts.clear();
    this.multi = false;
    this.state.clearViewGestures();
  };
  destroy(): void {
    this.release();
    this.listeners.abort();
    this.state.clearBuildPointers();
    this.state.clearViewGestures();
  }
}
