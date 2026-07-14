export const ACTIONS = [
  'moveLeft',
  'moveRight',
  'moveUp',
  'moveDown',
  'confirm',
  'cancel',
  'primaryAction',
  'pause',
] as const;

export type Action = (typeof ACTIONS)[number];
export type InputMethod = 'touch' | 'keyboard' | 'gamepad';

export interface ActionSnapshot {
  held: boolean;
  pressed: boolean;
  released: boolean;
}
