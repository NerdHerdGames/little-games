import type Phaser from 'phaser';

export const addButton = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onPress: () => void,
  width = 300,
): Phaser.GameObjects.Container => {
  const background = scene.add.rectangle(0, 0, width, 76, 0xffd65a).setStrokeStyle(4, 0x17324d);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      color: '#17324d',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  const container = scene.add
    .container(x, y, [background, text])
    .setSize(width, 76)
    .setInteractive({ useHandCursor: true });
  container.on('pointerdown', () => background.setFillStyle(0xffbd3d));
  container.on('pointerout', () => background.setFillStyle(0xffd65a));
  container.on('pointerup', () => {
    background.setFillStyle(0xffd65a);
    onPress();
  });
  return container;
};
