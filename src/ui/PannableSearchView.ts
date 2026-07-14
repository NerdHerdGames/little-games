import type Phaser from 'phaser';

export interface PannableViewCallbacks {
  onPan: (deltaX: number, deltaY: number) => void;
  onTap: (x: number, y: number) => void;
}

export const enablePannableSearchView = (
  scene: Phaser.Scene,
  zone: Phaser.GameObjects.Zone,
  callbacks: PannableViewCallbacks,
): (() => void) => {
  zone.setInteractive({ useHandCursor: true });
  let lastX = 0;
  let lastY = 0;
  let moved = false;
  const down = (pointer: Phaser.Input.Pointer): void => {
    lastX = pointer.x;
    lastY = pointer.y;
    moved = false;
  };
  const move = (pointer: Phaser.Input.Pointer): void => {
    if (!pointer.isDown) return;
    const deltaX = pointer.x - lastX;
    const deltaY = pointer.y - lastY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 2) moved = true;
    callbacks.onPan(deltaX, deltaY);
    lastX = pointer.x;
    lastY = pointer.y;
  };
  const up = (pointer: Phaser.Input.Pointer): void => {
    if (!moved) callbacks.onTap(pointer.x, pointer.y);
  };
  zone.on('pointerdown', down);
  zone.on('pointermove', move);
  zone.on('pointerup', up);
  return () => {
    zone.off('pointerdown', down);
    zone.off('pointermove', move);
    zone.off('pointerup', up);
    scene.input.disable(zone);
  };
};
