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
      const filteredX = applyDeadZone(x, this.deadZone);
      const filteredY = applyDeadZone(y, this.deadZone);
      result.moveLeft ||= filteredX < 0 || Boolean(pad.buttons[14]?.pressed);
      result.moveRight ||= filteredX > 0 || Boolean(pad.buttons[15]?.pressed);
      result.moveUp ||= filteredY < 0 || Boolean(pad.buttons[12]?.pressed);
      result.moveDown ||= filteredY > 0 || Boolean(pad.buttons[13]?.pressed);
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

export const applyDeadZone = (value: number, deadZone: number): number => {
  if (deadZone < 0 || deadZone >= 1)
    throw new Error('Gamepad dead zone must be at least 0 and less than 1.');
  if (Math.abs(value) <= deadZone) return 0;
  return Math.sign(value) * ((Math.abs(value) - deadZone) / (1 - deadZone));
};
