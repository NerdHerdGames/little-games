import type Phaser from 'phaser';

export const enableSwipeSpinControl = (
  scene: Phaser.Scene,
  zone: Phaser.GameObjects.Zone,
  onSpin: (distance: number) => void,
): (() => void) => {
  zone.setInteractive({ useHandCursor: true });
  let lastX = 0;
  let lastY = 0;

  const down = (pointer: Phaser.Input.Pointer): void => {
    lastX = pointer.x;
    lastY = pointer.y;
  };
  const move = (pointer: Phaser.Input.Pointer): void => {
    if (!pointer.isDown) return;
    const deltaX = pointer.x - lastX;
    const deltaY = pointer.y - lastY;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance > 0) onSpin(distance);
    lastX = pointer.x;
    lastY = pointer.y;
  };

  zone.on('pointerdown', down);
  zone.on('pointermove', move);
  return () => {
    zone.off('pointerdown', down);
    zone.off('pointermove', move);
    scene.input.disable(zone);
  };
};
