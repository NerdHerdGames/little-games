import type { ActionState } from './ActionState';

interface Drag {
  pointerId: number;
  pieceId: string;
  startX: number;
  startY: number;
  moved: boolean;
  ghost: HTMLElement | undefined;
  source: HTMLElement;
}

/** Pointer capture, drag artwork, and SVG coordinate conversion stay outside gameplay. */
export class MapPlacementAdapter {
  private readonly listeners = new AbortController();
  private drag: Drag | undefined;
  private suppressClick = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly state: ActionState,
  ) {
    const options = { signal: this.listeners.signal };
    root.addEventListener('pointerdown', this.onDown, options);
    root.addEventListener('pointermove', this.onMove, options);
    root.addEventListener('pointerup', this.onUp, options);
    root.addEventListener('pointercancel', this.release, options);
    root.addEventListener('lostpointercapture', this.release, options);
    root.addEventListener('click', this.onClick, { ...options, capture: true });
    window.addEventListener('blur', this.release, options);
    document.addEventListener('visibilitychange', this.release, options);
    state.clearPlacements();
  }

  destroy(): void {
    this.listeners.abort();
    this.release();
    this.state.clearPlacements();
  }

  private onDown = (event: PointerEvent): void => {
    const source = (event.target as Element).closest<HTMLElement>('[data-piece]');
    if (!source || this.drag || event.button !== 0) return;
    this.suppressClick = false;
    this.drag = {
      pointerId: event.pointerId,
      pieceId: source.dataset.piece!,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      ghost: undefined,
      source,
    };
    source.setPointerCapture(event.pointerId);
  };

  private onMove = (event: PointerEvent): void => {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8)
      return;
    event.preventDefault();
    if (!drag.ghost) {
      drag.moved = true;
      drag.ghost = drag.source.cloneNode(true) as HTMLElement;
      drag.ghost.removeAttribute('data-action');
      drag.ghost.removeAttribute('data-piece');
      drag.ghost.setAttribute('aria-hidden', 'true');
      drag.ghost.classList.add('map-drag-ghost');
      drag.ghost.style.width = `${Math.min(180, drag.source.clientWidth)}px`;
      drag.source.style.opacity = '0.35';
      this.root.append(drag.ghost);
    }
    drag.ghost.style.left = `${event.clientX}px`;
    drag.ghost.style.top = `${event.clientY}px`;
  };

  private onUp = (event: PointerEvent): void => {
    const drag = this.drag;
    if (drag && drag.pointerId !== event.pointerId) return;
    const map = this.root.querySelector<SVGSVGElement>('[data-placement-map]');
    const target = event.target as Element;
    if (map && (drag?.moved || map.contains(target))) {
      const matrix = map.getScreenCTM();
      const pieceId = drag?.pieceId ?? map.dataset.currentPiece;
      // Report every completed drag, even outside the map, so gameplay can offer help.
      if (matrix && pieceId) {
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
        this.state.requestPlacement({
          pieceId,
          x: point.x,
          y: point.y,
          tolerance: 48 / Math.abs(matrix.a),
        });
      }
    }
    this.suppressClick = drag?.moved ?? false;
    this.release();
  };

  private onClick = (event: MouseEvent): void => {
    if (!this.suppressClick) return;
    this.suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private release = (): void => {
    const drag = this.drag;
    this.drag = undefined;
    if (!drag) return;
    drag.ghost?.remove();
    drag.source.style.opacity = '';
    if (drag.source.hasPointerCapture(drag.pointerId))
      drag.source.releasePointerCapture(drag.pointerId);
  };
}
