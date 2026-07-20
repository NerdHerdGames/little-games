import type Phaser from 'phaser';

export const PLANET_ART_IDS = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const;

export type PlanetArtId = (typeof PLANET_ART_IDS)[number];

export const PLANET_ART_COLORS: Readonly<Record<PlanetArtId, number>> = {
  mercury: 0xa9a49d,
  venus: 0xe2ad65,
  earth: 0x4e91d8,
  mars: 0xc96848,
  jupiter: 0xd6ae82,
  saturn: 0xe4cf8c,
  uranus: 0x8bd4d5,
  neptune: 0x4168c7,
};

export const isPlanetArtId = (id: string): id is PlanetArtId =>
  PLANET_ART_IDS.includes(id as PlanetArtId);

interface PlanetArtOptions {
  radius: number;
  strokeWidth?: number;
}

/** Create a consistently styled major-planet illustration at any required size. */
export const createPlanetArt = (
  scene: Phaser.Scene,
  id: PlanetArtId,
  x: number,
  y: number,
  { radius, strokeWidth = 4 }: PlanetArtOptions,
): Phaser.GameObjects.Container => {
  const parts: Phaser.GameObjects.GameObject[] = [];

  if (id === 'saturn') {
    parts.push(
      scene.add
        .ellipse(0, 0, radius * 3, radius * 0.85)
        .setStrokeStyle(Math.max(3, strokeWidth * 2), 0xf2e1a9)
        .setFillStyle(0, 0),
    );
  }

  parts.push(
    scene.add.circle(0, 0, radius, PLANET_ART_COLORS[id]).setStrokeStyle(strokeWidth, 0xffffff),
  );

  if (id === 'venus')
    parts.push(
      scene.add.ellipse(radius * 0.12, -radius * 0.16, radius * 1.4, radius * 0.32, 0xf4d38f, 0.75),
    );
  if (id === 'earth') {
    // Three differently positioned land shapes make Earth recognizable at small sizes.
    parts.push(
      scene.add.ellipse(-radius * 0.25, -radius * 0.1, radius * 0.78, radius * 0.44, 0x65b96f),
    );
    parts.push(
      scene.add.ellipse(radius * 0.3, radius * 0.3, radius * 0.42, radius * 0.26, 0x65b96f),
    );
    parts.push(
      scene.add.ellipse(radius * 0.24, -radius * 0.43, radius * 0.32, radius * 0.22, 0x65b96f),
    );
  }
  if (id === 'mars')
    parts.push(scene.add.circle(-radius * 0.28, -radius * 0.22, radius * 0.22, 0x9d493c));
  if (id === 'jupiter') {
    parts.push(scene.add.rectangle(0, -radius * 0.3, radius * 1.7, radius * 0.2, 0xf2d1aa));
    parts.push(scene.add.rectangle(0, radius * 0.34, radius * 1.8, radius * 0.18, 0xad745d));
  }

  return scene.add.container(x, y, parts);
};
