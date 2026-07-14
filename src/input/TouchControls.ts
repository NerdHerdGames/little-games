import type { Action } from './actions';

const BUTTONS: ReadonlyArray<{ action: Action; label: string; className: string }> = [
  { action: 'moveUp', label: 'Up', className: 'up' },
  { action: 'moveLeft', label: 'Left', className: 'left' },
  { action: 'moveRight', label: 'Right', className: 'right' },
  { action: 'moveDown', label: 'Down', className: 'down' },
];

export class TouchControls {
  private held: Partial<Record<Action, boolean>> = {};
  private root = document.querySelector<HTMLDivElement>('#touch-controls');

  constructor() {
    if (!this.root) throw new Error('Touch controls container #touch-controls was not found.');
    const pad = document.createElement('div');
    pad.className = 'dpad';
    for (const item of BUTTONS)
      pad.append(this.makeButton(item.action, item.label, item.className));
    this.root.append(pad);
    this.root.append(this.makeButton('primaryAction', 'Go!', 'action-button'));
  }

  read(): Partial<Record<Action, boolean>> {
    return { ...this.held, confirm: Boolean(this.held.primaryAction) };
  }

  setVisible(visible: boolean): void {
    this.root?.classList.toggle('hidden', !visible);
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
