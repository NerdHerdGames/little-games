import { ACTIONS, type Action, type ActionSnapshot, type InputMethod } from './actions';

const emptyActions = (): Record<Action, boolean> =>
  Object.fromEntries(ACTIONS.map((action) => [action, false])) as Record<Action, boolean>;

export interface ViewGesture {
  rotateX: number;
  rotateY: number;
  zoom: number;
}

export interface PlacementAction {
  pieceId: string;
  x: number;
  y: number;
  tolerance: number;
}

export interface PaintAction {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export class ActionState {
  private current = emptyActions();
  private previous = emptyActions();
  private sources = new Map<InputMethod, Partial<Record<Action, boolean>>>();
  private lastMethod: InputMethod = 'touch';
  private activations: string[] = [];
  private placements: PlacementAction[] = [];
  private paint: PaintAction[] = [];

  requestPaint(segment: PaintAction): void {
    if ([segment.from.x, segment.from.y, segment.to.x, segment.to.y].every(Number.isFinite)) {
      this.paint.push(segment);
    }
  }

  consumePaint(): PaintAction[] {
    const segments = this.paint;
    this.paint = [];
    return segments;
  }

  clearPaint(): void {
    this.paint.length = 0;
  }
  private viewGesture: ViewGesture = { rotateX: 0, rotateY: 0, zoom: 0 };

  /** Accumulate device-independent view changes; device events stay in input adapters. */
  addViewGesture(rotateX: number, rotateY: number, zoom = 0): void {
    if (![rotateX, rotateY, zoom].every(Number.isFinite)) return;
    this.viewGesture.rotateX += rotateX;
    this.viewGesture.rotateY += rotateY;
    this.viewGesture.zoom += zoom;
  }

  consumeViewGesture(): ViewGesture | undefined {
    const { rotateX, rotateY, zoom } = this.viewGesture;
    if (rotateX === 0 && rotateY === 0 && zoom === 0) return undefined;
    this.clearViewGestures();
    return { rotateX, rotateY, zoom };
  }

  clearViewGestures(): void {
    this.viewGesture.rotateX = 0;
    this.viewGesture.rotateY = 0;
    this.viewGesture.zoom = 0;
  }

  /** Queue a logical menu choice without exposing DOM or pointer events to gameplay. */
  requestActivation(id: string): void {
    this.activations.push(id);
  }

  consumeActivation(): string | undefined {
    return this.activations.shift();
  }

  clearActivations(): void {
    this.activations.length = 0;
  }

  requestPlacement(placement: PlacementAction): void {
    if ([placement.x, placement.y, placement.tolerance].every(Number.isFinite)) {
      this.placements.push(placement);
    }
  }

  consumePlacement(): PlacementAction | undefined {
    return this.placements.shift();
  }

  clearPlacements(): void {
    this.placements.length = 0;
  }

  setSource(method: InputMethod, actions: Partial<Record<Action, boolean>>): void {
    this.sources.set(method, actions);
  }

  removeSource(method: InputMethod): void {
    this.sources.delete(method);
  }

  update(): void {
    this.previous = this.current;
    const next = emptyActions();

    for (const [method, values] of this.sources) {
      let used = false;
      for (const action of ACTIONS) {
        if (values[action]) {
          next[action] = true;
          used = true;
        }
      }
      if (used && ACTIONS.some((action) => !this.current[action] && Boolean(values[action]))) {
        this.lastMethod = method;
      }
    }
    this.current = next;
  }

  get(action: Action): ActionSnapshot {
    return {
      held: this.current[action],
      pressed: this.current[action] && !this.previous[action],
      released: !this.current[action] && this.previous[action],
    };
  }

  isHeld(action: Action): boolean {
    return this.current[action];
  }

  wasPressed(action: Action): boolean {
    return this.current[action] && !this.previous[action];
  }

  get lastInputMethod(): InputMethod {
    return this.lastMethod;
  }
}
