export const PLANET_SPRITES = {
  sun: { key: 'pixel-planet-sun', path: 'assets/pixel-planets/individual/sun.png' },
  mercury: { key: 'pixel-planet-mercury', path: 'assets/pixel-planets/individual/mercury.png' },
  venus: { key: 'pixel-planet-venus', path: 'assets/pixel-planets/individual/venus.png' },
  earth: { key: 'pixel-planet-earth', path: 'assets/pixel-planets/individual/earth.png' },
  mars: { key: 'pixel-planet-mars', path: 'assets/pixel-planets/individual/mars.png' },
  jupiter: { key: 'pixel-planet-jupiter', path: 'assets/pixel-planets/individual/jupiter.png' },
  saturn: { key: 'pixel-planet-saturn', path: 'assets/pixel-planets/individual/saturn.png' },
  uranus: { key: 'pixel-planet-uranus', path: 'assets/pixel-planets/individual/uranus.png' },
  neptune: { key: 'pixel-planet-neptune', path: 'assets/pixel-planets/individual/neptune.png' },
  pluto: { key: 'pixel-planet-pluto', path: 'assets/pixel-planets/individual/pluto.png' },
  ceres: { key: 'pixel-planet-ceres', path: 'assets/pixel-planets/individual/ceres.png' },
  haumea: { key: 'pixel-planet-haumea', path: 'assets/pixel-planets/individual/haumea.png' },
  makemake: { key: 'pixel-planet-makemake', path: 'assets/pixel-planets/individual/makemake.png' },
  eris: { key: 'pixel-planet-eris', path: 'assets/pixel-planets/individual/eris.png' },
} as const;

export type PlanetSpriteId = keyof typeof PLANET_SPRITES;

export const PLANET_SPRITE_IDS = Object.keys(PLANET_SPRITES) as PlanetSpriteId[];
