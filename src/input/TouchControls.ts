import type { Action } from './actions';
import { getTouchControlVisibility, type TouchControlProfile } from './TouchControlProfile';

const BUTTONS: ReadonlyArray<{ action: Action; label: string; className: string }> = [
  { action: 'moveUp', label: 'Up', className: 'up' },
  { action: 'moveLeft', label: 'Left', className: 'left' },
  { action: 'moveRight', label: 'Right', className: 'right' },
  { action: 'moveDown', label: 'Down', className: 'down' },
];

export class TouchControls {
  private held: Partial<Record<Action, boolean>> = {};
  private readonly root: HTMLDivElement;
  private readonly pad: HTMLDivElement;
  private readonly actionButton: HTMLButtonElement;

  constructor() {
    const root = document.querySelector<HTMLDivElement>('#touch-controls');
    if (!root) throw new Error('Touch controls container #touch-controls was not found.');
    this.root = root;
    this.pad = document.createElement('div');
    this.pad.className = 'dpad';
    for (const item of BUTTONS)
      this.pad.append(this.makeButton(item.action, item.label, item.className));
    this.actionButton = this.makeButton('primaryAction', 'Go!', 'action-button');
    this.root.append(this.pad, this.actionButton);
  }

  read(): Partial<Record<Action, boolean>> {
    return { ...this.held, confirm: Boolean(this.held.primaryAction) };
  }

  setVisible(visible: boolean): void {
    this.root.classList.toggle('hidden', !visible);
  }

  setProfile(profile: TouchControlProfile): void {
    const visibility = getTouchControlVisibility(profile);
    this.releaseAll();
    this.pad.hidden = !visibility.directions;
    this.actionButton.hidden = !visibility.action;
    this.setVisible(visibility.directions || visibility.action);
  }

  private releaseAll(): void {
    this.held = {};
    for (const button of this.root.querySelectorAll('.touch-button.active'))
      button.classList.remove('active');
  }

  private makeButton(action: Action, label: string, className: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `touch-button ${className}`;
    button.textContent = label;
    button.setAttribute('aria-label', label);
    const set = (value: boolean): void => {
      this.held[action] = value;
      button.classList.toggle('active', value);
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      set(true);
    });
    for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(eventName, () => set(false));
    }
    return button;
  }
}
