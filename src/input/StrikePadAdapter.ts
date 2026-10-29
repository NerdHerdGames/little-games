import type { ActionState } from './ActionState';

/** Immediate, independent pad strikes; native menu activation remains available to assistive tech. */
export class StrikePadAdapter {
  private readonly listeners = new AbortController();

  constructor(root: HTMLElement, state: ActionState) {
    const padFor = (target: EventTarget | null): HTMLButtonElement | null => {
      const pad = (target as Element | null)?.closest<HTMLButtonElement>('button[data-strike]');
      return pad && !pad.disabled && root.contains(pad) ? pad : null;
    };
    root.addEventListener(
      'pointerdown',
      (event) => {
        const pad = padFor(event.target);
        if (!pad || event.button !== 0) return;
        event.preventDefault();
        pad.focus({ preventScroll: true });
        state.requestActivation(pad.dataset.action!);
      },
      { signal: this.listeners.signal },
    );
    root.addEventListener(
      'click',
      (event) => {
        if (event.detail > 0 && padFor(event.target)) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { capture: true, signal: this.listeners.signal },
    );
    window.addEventListener(
      'keydown',
      (event) => {
        if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
        const key = /^(?:Digit|Numpad)([1-8])$/.exec(event.code)?.[1];
        if (!key) return;
        const pad = root.querySelector<HTMLButtonElement>(`button[data-strike="${key}"]`);
        if (!pad || pad.disabled) return;
        event.preventDefault();
        pad.focus({ preventScroll: true });
        state.requestActivation(pad.dataset.action!);
      },
      { signal: this.listeners.signal },
    );
  }

  destroy(): void {
    this.listeners.abort();
  }
}
