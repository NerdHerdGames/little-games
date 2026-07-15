import type Phaser from 'phaser';

export const enableTapSelection = (
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Container | Phaser.GameObjects.Text,
  onTap: () => void,
): (() => void) => {
  target.setInteractive({ useHandCursor: true });
  let active = true;
  const tap = (): void => onTap();
  target.on('pointerup', tap);
  return () => {
    if (!active) return;
    active = false;
    target.off('pointerup', tap);
    if (target.input) scene.input.disable(target);
  };
};
