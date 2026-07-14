import type Phaser from 'phaser';

export const addHoldButton = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  holdMs: number,
  onComplete: () => void,
  width = 430,
): Phaser.GameObjects.Container => {
  const background = scene.add.rectangle(0, 0, width, 82, 0xf4ddd8).setStrokeStyle(4, 0x7a3030);
  const fill = scene.add
    .rectangle(-width / 2 + 4, 0, width - 8, 74, 0xeaa29a, 0.75)
    .setOrigin(0, 0.5)
    .setScale(0, 1);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'Arial',
      fontSize: '26px',
      color: '#6a2020',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  const button = scene.add
    .container(x, y, [background, fill, text])
    .setSize(width, 82)
    .setInteractive({ useHandCursor: true });
  let timer: Phaser.Time.TimerEvent | undefined;
  let tween: Phaser.Tweens.Tween | undefined;
  const cancel = (): void => {
    timer?.remove();
    timer = undefined;
    tween?.stop();
    tween = undefined;
    fill.setScale(0, 1);
  };
  button.on('pointerdown', () => {
    cancel();
    tween = scene.tweens.add({ targets: fill, scaleX: 1, duration: holdMs });
    timer = scene.time.delayedCall(holdMs, () => {
      cancel();
      onComplete();
    });
  });
  button.on('pointerup', cancel);
  button.on('pointerout', cancel);
  button.on('pointercancel', cancel);
  scene.events.once('shutdown', cancel);
  return button;
};
