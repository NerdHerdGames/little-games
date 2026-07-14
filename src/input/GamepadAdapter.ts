import type { Action } from './actions';

export class GamepadAdapter {
  connectedCount = 0;

  constructor(private readonly deadZone: number) {
    window.addEventListener('gamepadconnected', () => this.refreshCount());
    window.addEventListener('gamepaddisconnected', () => this.refreshCount());
  }

  read(): Partial<Record<Action, boolean>> {
    const result: Partial<Record<Action, boolean>> = {};
    const pads = navigator.getGamepads?.() ?? [];
    this.connectedCount = Array.from(pads).filter(Boolean).length;
    for (const pad of pads) {
      if (!pad?.connected) continue;
      const x = pad.axes[0] ?? 0;
      const y = pad.axes[1] ?? 0;
      result.moveLeft ||= x < -this.deadZone || Boolean(pad.buttons[14]?.pressed);
      result.moveRight ||= x > this.deadZone || Boolean(pad.buttons[15]?.pressed);
      result.moveUp ||= y < -this.deadZone || Boolean(pad.buttons[12]?.pressed);
      result.moveDown ||= y > this.deadZone || Boolean(pad.buttons[13]?.pressed);
      result.confirm ||= Boolean(pad.buttons[0]?.pressed);
      result.primaryAction ||= Boolean(pad.buttons[0]?.pressed);
      result.cancel ||= Boolean(pad.buttons[1]?.pressed);
      result.pause ||= Boolean(pad.buttons[9]?.pressed);
    }
    return result;
  }

  private refreshCount(): void {
    this.connectedCount = Array.from(navigator.getGamepads?.() ?? []).filter(Boolean).length;
  }
}
