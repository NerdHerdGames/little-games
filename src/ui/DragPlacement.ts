import type Phaser from 'phaser';

export interface DragPlacementCallbacks {
  onDrop: (x: number, y: number) => void;
  onSelect: () => void;
  onTap?: () => void;
}

export const enableDragPlacement = (
  scene: Phaser.Scene,
  piece: Phaser.GameObjects.Container,
  callbacks: DragPlacementCallbacks,
): (() => void) => {
  piece.setInteractive({ draggable: true, useHandCursor: true });
  let active = true;
  let moved = false;
  const select = (): void => {
    moved = false;
    callbacks.onSelect();
  };
  const drag = (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void => {
    if (Math.abs(dragX - piece.x) + Math.abs(dragY - piece.y) > 2) moved = true;
    piece.setPosition(dragX, dragY);
  };
  const drop = (): void => callbacks.onDrop(piece.x, piece.y);
  const tap = (): void => {
    if (!moved) callbacks.onTap?.();
  };
  piece.on('pointerdown', select);
  piece.on('pointerup', tap);
  piece.on('drag', drag);
  piece.on('dragend', drop);
  return () => {
    if (!active) return;
    active = false;
    piece.off('pointerdown', select);
    piece.off('pointerup', tap);
    piece.off('drag', drag);
    piece.off('dragend', drop);
    if (piece.input) scene.input.setDraggable(piece, false);
  };
};
