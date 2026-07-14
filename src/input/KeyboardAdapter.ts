import type { Action } from './actions';

const KEY_ACTIONS: Readonly<Record<string, Action>> = {
  ArrowLeft: 'moveLeft',
  KeyA: 'moveLeft',
  ArrowRight: 'moveRight',
  KeyD: 'moveRight',
  ArrowUp: 'moveUp',
  KeyW: 'moveUp',
  ArrowDown: 'moveDown',
  KeyS: 'moveDown',
  Enter: 'confirm',
  Space: 'primaryAction',
  Escape: 'cancel',
  KeyP: 'pause',
};

export class KeyboardAdapter {
  private held: Partial<Record<Action, boolean>> = {};

  constructor() {
    window.addEventListener('keydown', (event) => this.onKey(event, true));
    window.addEventListener('keyup', (event) => this.onKey(event, false));
    window.addEventListener('blur', () => (this.held = {}));
  }

  read(): Partial<Record<Action, boolean>> {
    return { ...this.held };
  }

  private onKey(event: KeyboardEvent, down: boolean): void {
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    event.preventDefault();
    this.held[action] = down;
    if (action === 'primaryAction') this.held.confirm = down;
  }
}
