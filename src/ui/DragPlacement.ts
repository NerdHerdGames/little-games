import type Phaser from 'phaser';

export interface DragPlacementCallbacks {
  onDrop: (x: number, y: number) => void;
  onSelect: () => void;
}

export const enableDragPlacement = (
  scene: Phaser.Scene,
  piece: Phaser.GameObjects.Container,
  callbacks: DragPlacementCallbacks,
): (() => void) => {
  piece.setInteractive({ draggable: true, useHandCursor: true });
  const select = (): void => callbacks.onSelect();
  const drag = (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void => {
    piece.setPosition(dragX, dragY);
  };
  const drop = (): void => callbacks.onDrop(piece.x, piece.y);
  piece.on('pointerdown', select);
  piece.on('drag', drag);
  piece.on('dragend', drop);
  return () => {
    piece.off('pointerdown', select);
    piece.off('drag', drag);
    piece.off('dragend', drop);
    scene.input.setDraggable(piece, false);
  };
};
