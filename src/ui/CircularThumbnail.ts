import type Phaser from 'phaser';

/** Cache a centered cover crop with transparent circular edges for either Phaser renderer. */
export const addCircularThumbnail = (
  scene: Phaser.Scene,
  sourceKey: string,
  x: number,
  y: number,
  diameter = 135,
): Phaser.GameObjects.Image => {
  const key = `circular-thumbnail:${sourceKey}:${diameter}`;
  if (!scene.textures.exists(key)) {
    const source = scene.textures.get(sourceKey).getSourceImage();
    if (!(source instanceof HTMLImageElement || source instanceof HTMLCanvasElement))
      throw new Error(`Thumbnail ${sourceKey} requires a local image or canvas.`);

    // Draw at twice the display size so the circular edge remains smooth when a card grows.
    const size = diameter * 2;
    const texture = scene.textures.createCanvas(key, size, size);
    if (!texture) throw new Error(`Could not create thumbnail ${sourceKey}.`);
    const context = texture.getContext();
    const scale = Math.max(size / source.width, size / source.height);
    const width = source.width * scale;
    const height = source.height * scale;
    context.save();
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.clip();
    context.drawImage(source, (size - width) / 2, (size - height) / 2, width, height);
    context.restore();
    texture.refresh();
  }
  return scene.add.image(x, y, key).setDisplaySize(diameter, diameter);
};
