import type Phaser from 'phaser';
import { PLANET_SPRITES, type PlanetSpriteId, PLANET_SPRITE_IDS } from '../data/planetSprites';

export const PLANET_ART_IDS = PLANET_SPRITE_IDS;
export type PlanetArtId = PlanetSpriteId;

export const isPlanetArtId = (id: string): id is PlanetArtId => id in PLANET_SPRITES;

/** Queue the requested shared pixel-art planets in a scene's preload phase. */
export const preloadPlanetArt = (
  scene: Phaser.Scene,
  ids: readonly PlanetArtId[] = PLANET_ART_IDS,
): void => {
  for (const id of ids) {
    const sprite = PLANET_SPRITES[id];
    if (!scene.textures.exists(sprite.key)) scene.load.image(sprite.key, sprite.path);
  }
};

interface PlanetArtOptions {
  radius?: number;
  maxWidth?: number;
  maxHeight?: number;
}

/** Create a centered, aspect-ratio-preserving shared pixel-art illustration. */
export const createPlanetArt = (
  scene: Phaser.Scene,
  id: PlanetArtId,
  x: number,
  y: number,
  { radius = 40, maxWidth, maxHeight }: PlanetArtOptions = {},
): Phaser.GameObjects.Container => {
  const image = scene.add.image(0, 0, PLANET_SPRITES[id].key);
  const widthLimit = maxWidth ?? radius * (id === 'saturn' ? 3 : 2);
  const heightLimit = maxHeight ?? radius * 2;
  const scale = Math.min(widthLimit / image.width, heightLimit / image.height);
  image.setScale(scale);
  return scene.add
    .container(x, y, [image])
    .setSize(Math.max(64, widthLimit), Math.max(64, heightLimit));
};
