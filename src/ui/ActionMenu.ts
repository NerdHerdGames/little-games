import type { ActionState } from '../input/ActionState';
import { MenuFocus } from './MenuFocus';

/** Accessible native menus that send logical activations through the shared input service. */
export class ActionMenu {
  readonly root = document.createElement('section');
  private buttons: HTMLButtonElement[] = [];
  private focus = new MenuFocus(1);
  private readonly listeners = new AbortController();

  constructor(
    private readonly state: ActionState,
    className: string,
    label: string,
  ) {
    this.root.className = className;
    this.root.setAttribute('aria-label', label);
    this.root.addEventListener('click', this.onClick, { signal: this.listeners.signal });
    this.root.addEventListener('focusin', this.onFocus, { signal: this.listeners.signal });
    document.querySelector('#app')?.append(this.root);
    this.state.clearActivations();
  }

  setContent(html: string): void {
    this.state.clearActivations();
    this.root.innerHTML = html;
    this.buttons = [...this.root.querySelectorAll<HTMLButtonElement>('button[data-action]')];
    this.focus = new MenuFocus(Math.max(1, this.buttons.length));
  }

  /** Touch, native keyboard activation, and logical keyboard/controller actions share one path. */
  readActivation(): string | undefined {
    const queued = this.state.consumeActivation();
    if (queued) return queued;
    if (this.state.wasPressed('moveDown') || this.state.wasPressed('moveRight')) {
      this.focus.next();
      this.buttons[this.focus.current]?.focus({ preventScroll: false });
    }
    if (this.state.wasPressed('moveUp') || this.state.wasPressed('moveLeft')) {
      this.focus.previous();
      this.buttons[this.focus.current]?.focus({ preventScroll: false });
    }
    if (this.state.wasPressed('confirm') || this.state.wasPressed('primaryAction')) {
      const button = this.buttons[this.focus.current];
      if (button && !button.disabled) return button.dataset.action;
    }
    return undefined;
  }

  destroy(): void {
    this.listeners.abort();
    this.root.remove();
    this.state.clearActivations();
  }

  private onClick = (event: Event): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
    if (button && !button.disabled && this.root.contains(button)) {
      this.state.requestActivation(button.dataset.action!);
    }
  };

  private onFocus = (event: Event): void => {
    const index = this.buttons.indexOf(event.target as HTMLButtonElement);
    if (index >= 0) this.focus.set(index);
  };
}
