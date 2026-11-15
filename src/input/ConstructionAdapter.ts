import type { ActionState, ConstructionAction } from './ActionState';
interface Contact {
  x: number;
  y: number;
}
/** Pointer capture and all device event handling for a 2D construction surface. */
export class ConstructionAdapter {
  private listeners = new AbortController();
  private contacts = new Map<number, Contact>();
  private source: string | undefined;
  private moved = false;
  private pinching = false;
  private suppress = false;
  private start: Contact = { x: 0, y: 0 };
  constructor(
    private readonly root: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly state: ActionState,
  ) {
    const options = { signal: this.listeners.signal };
    root.addEventListener('pointerdown', this.down, options);
    root.addEventListener('pointermove', this.move, options);
    root.addEventListener('pointerup', this.up, options);
    root.addEventListener('pointercancel', this.cancel, options);
    root.addEventListener('lostpointercapture', this.lost, options);
    root.addEventListener('wheel', this.wheel, { ...options, passive: false });
    root.addEventListener('click', this.click, { ...options, capture: true });
    root.addEventListener('input', this.value, options);
    root.addEventListener('change', this.value, options);
    window.addEventListener('blur', this.cancel, options);
    document.addEventListener('visibilitychange', this.cancel, options);
    state.clearConstruction();
  }
  private point(x: number, y: number): Contact {
    const rect = this.canvas.getBoundingClientRect();
    return { x: x - rect.left, y: y - rect.top };
  }
  private send(phase: ConstructionAction['phase'], p: Contact, dx = 0, dy = 0): void {
    const point = this.point(p.x, p.y);
    this.state.requestConstruction({
      phase,
      ...point,
      dx,
      dy,
      ...(this.source ? { source: this.source } : {}),
    });
  }
  private down = (e: PointerEvent): void => {
    const target = e.target as Element;
    const palette = target.closest<HTMLElement>('[data-build-piece]');
    if (e.button !== 0 || (target !== this.canvas && !palette) || this.contacts.size >= 2) return;
    e.preventDefault();
    this.suppress = false;
    const p = { x: e.clientX, y: e.clientY };
    if (this.contacts.size === 0) {
      this.source = palette?.dataset.buildPiece;
      this.start = p;
      this.moved = false;
      this.pinching = false;
      this.send('start', p);
    } else {
      this.send('cancel', p);
      this.pinching = true;
      this.source = undefined;
    }
    this.contacts.set(e.pointerId, p);
    this.root.setPointerCapture(e.pointerId);
  };
  private move = (e: PointerEvent): void => {
    const previous = this.contacts.get(e.pointerId);
    if (!previous) return;
    e.preventDefault();
    const p = { x: e.clientX, y: e.clientY };
    if (Math.hypot(p.x - this.start.x, p.y - this.start.y) > 7) this.moved = true;
    const other = [...this.contacts.entries()].find(([id]) => id !== e.pointerId)?.[1];
    if (other) {
      const before = Math.hypot(previous.x - other.x, previous.y - other.y),
        after = Math.hypot(p.x - other.x, p.y - other.y);
      const center = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
      if (before > 8 && after > 8) this.send('zoom', center, Math.log(after / before));
      this.send('pan', center, (p.x - previous.x) / 2, (p.y - previous.y) / 2);
    } else if (!this.pinching) this.send('move', p, p.x - previous.x, p.y - previous.y);
    this.contacts.set(e.pointerId, p);
  };
  private up = (e: PointerEvent): void => {
    if (!this.contacts.has(e.pointerId)) return;
    const p = { x: e.clientX, y: e.clientY },
      point = this.point(p.x, p.y);
    const inside =
      point.x >= 0 &&
      point.y >= 0 &&
      point.x <= this.canvas.clientWidth &&
      point.y <= this.canvas.clientHeight;
    if (!this.pinching) this.send(inside ? 'end' : 'cancel', p);
    const paletteSource = this.source;
    this.contacts.delete(e.pointerId);
    if (this.root.hasPointerCapture(e.pointerId)) this.root.releasePointerCapture(e.pointerId);
    if (this.contacts.size === 0) {
      this.suppress = this.moved;
      this.source = undefined;
      this.pinching = false;
      // Captured pointer taps are converted to the same logical palette action as a click.
      if (paletteSource && !this.moved) {
        this.state.requestActivation(`choose:${paletteSource}`);
        this.suppress = true;
      }
    }
  };
  private lost = (e: PointerEvent): void => {
    if (this.contacts.has(e.pointerId)) this.cancel();
  };
  private cancel = (): void => {
    if (this.contacts.size) this.send('cancel', this.start);
    const ids = [...this.contacts.keys()];
    this.contacts.clear();
    for (const id of ids) if (this.root.hasPointerCapture(id)) this.root.releasePointerCapture(id);
    this.source = undefined;
    this.pinching = false;
  };
  private wheel = (e: WheelEvent): void => {
    if (e.target !== this.canvas) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 240 : 1;
    this.send(
      'zoom',
      { x: e.clientX, y: e.clientY },
      Math.max(-0.3, Math.min(0.3, -e.deltaY * unit * 0.001)),
    );
  };
  private click = (e: MouseEvent): void => {
    if (!this.suppress) return;
    this.suppress = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  private value = (e: Event): void => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    if (!target.dataset.setting) return;
    const continuous =
      target instanceof HTMLInputElement && (target.type === 'range' || target.type === 'text');
    if ((e.type === 'input' && !continuous) || (e.type === 'change' && continuous)) return;
    const value =
      target instanceof HTMLInputElement && target.type === 'checkbox'
        ? String(target.checked)
        : target.value;
    this.state.requestActivation(`value:${target.dataset.setting}:${encodeURIComponent(value)}`);
  };
  destroy(): void {
    this.cancel();
    this.listeners.abort();
    this.state.clearConstruction();
  }
}
