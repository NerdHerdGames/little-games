import { INPUT_DEAD_ZONE } from '../config/settings';
import type { ActionState } from './ActionState';
import { GamepadAdapter } from './GamepadAdapter';
import { KeyboardAdapter } from './KeyboardAdapter';
import { TouchControls } from './TouchControls';

export class InputCoordinator {
  readonly touch = new TouchControls();
  readonly keyboard = new KeyboardAdapter();
  readonly gamepad = new GamepadAdapter(INPUT_DEAD_ZONE);

  constructor(private readonly state: ActionState) {}

  update(): void {
    this.state.setSource('touch', this.touch.read());
    this.state.setSource('keyboard', this.keyboard.read());
    this.state.setSource('gamepad', this.gamepad.read());
    this.state.update();
  }
}
