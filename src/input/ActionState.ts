import { ACTIONS, type Action, type ActionSnapshot, type InputMethod } from './actions';

const emptyActions = (): Record<Action, boolean> =>
  Object.fromEntries(ACTIONS.map((action) => [action, false])) as Record<Action, boolean>;

export class ActionState {
  private current = emptyActions();
  private previous = emptyActions();
  private sources = new Map<InputMethod, Partial<Record<Action, boolean>>>();
  private lastMethod: InputMethod = 'touch';

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
