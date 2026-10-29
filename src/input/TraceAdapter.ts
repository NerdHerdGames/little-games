import type { ActionState, TraceAction } from './ActionState';

/** Translate a captured finger/stylus/mouse into logical SVG-space tracing actions. */
export class TraceAdapter {
  private readonly listeners = new AbortController();
  private pointer: number | undefined;
  private surface: SVGSVGElement | undefined;

  constructor(
    root: HTMLElement,
    private readonly state: ActionState,
  ) {
    const options = { signal: this.listeners.signal };
    root.addEventListener('pointerdown', this.down, options);
    root.addEventListener('pointermove', this.move, options);
    root.addEventListener('pointerup', this.up, options);
    root.addEventListener('pointercancel', this.cancel, options);
    root.addEventListener('lostpointercapture', this.cancel, options);
    window.addEventListener('blur', this.cancel, options);
    document.addEventListener('visibilitychange', this.cancel, options);
    this.state.clearTraces();
  }

  reset(): void {
    this.cancel();
    this.state.clearTraces();
  }

  destroy(): void {
    this.listeners.abort();
    this.reset();
  }

  private send(event: PointerEvent, phase: TraceAction['phase']): void {
    const matrix = this.surface?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    this.state.requestTrace({ phase, x: point.x, y: point.y });
  }

  private down = (event: PointerEvent): void => {
    const surface = (event.target as Element).closest<SVGSVGElement>('[data-trace-surface]');
    if (!surface || this.pointer !== undefined || event.button !== 0) return;
    event.preventDefault();
    this.pointer = event.pointerId;
    this.surface = surface;
    surface.setPointerCapture(event.pointerId);
    this.send(event, 'start');
  };

  private move = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointer) return;
    event.preventDefault();
    const events = event.getCoalescedEvents?.() ?? [];
    for (const sample of events.length ? events : [event]) this.send(sample, 'move');
  };

  private up = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointer) return;
    this.send(event, 'move');
    this.cancel();
  };

  private cancel = (): void => {
    const pointer = this.pointer;
    const surface = this.surface;
    this.pointer = undefined;
    this.surface = undefined;
    if (pointer === undefined) return;
    this.state.requestTrace({ phase: 'end', x: 0, y: 0 });
    if (surface?.hasPointerCapture(pointer)) surface.releasePointerCapture(pointer);
  };
}
