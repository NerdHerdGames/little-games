import { PLANETS } from '../../data/planets';
import { SOLAR_SYSTEM_OBJECTS } from '../../data/solarSystem';
import snapshot from './moon-catalogue.json';

export type SystemId = keyof typeof snapshot.worlds;
export interface MoonData {
  id: string;
  name: string;
  designation: string;
  radiusKm: number | null;
}
export interface MoonSystem {
  id: SystemId;
  name: string;
  color: number;
  spritePath: string;
  dwarf: boolean;
  radiusKm: number;
  moons: readonly MoonData[];
}

export const CATALOGUE_DATE = snapshot.verifiedOn;
export const CATALOGUE_SOURCES = snapshot.sources;
export const MOONS_PER_PAGE = 8;
const RADII: Record<SystemId, number> = {
  earth: 6371,
  mars: 3389.5,
  jupiter: 69911,
  saturn: 58232,
  uranus: 25362,
  neptune: 24622,
  pluto: 1188.3,
  haumea: 780,
  makemake: 715,
  eris: 1163,
};
export const isSystemId = (id: string): id is SystemId => Object.hasOwn(snapshot.worlds, id);

export const MOON_SYSTEMS: readonly MoonSystem[] = SOLAR_SYSTEM_OBJECTS.flatMap((world) => {
  if (!isSystemId(world.id)) return [];
  const moons = [...snapshot.worlds[world.id]].sort(
    (a, b) => (b.radiusKm ?? 0) - (a.radiusKm ?? 0),
  );
  return [
    {
      id: world.id,
      name: world.name,
      color: world.color,
      spritePath: world.spritePath,
      dwarf: PLANETS.some(({ id }) => id === world.id),
      radiusKm: RADII[world.id],
      moons,
    },
  ];
});

export const getSystem = (id: SystemId): MoonSystem => {
  const system = MOON_SYSTEMS.find((world) => world.id === id);
  if (!system) throw new Error(`Unknown moon system ${id}.`);
  return system;
};

export const getMoon = (system: MoonSystem, id: string): MoonData | undefined =>
  system.moons.find((moon) => moon.id === id);

export const moonPage = (system: MoonSystem, page: number): readonly MoonData[] => {
  const safe = Math.max(
    0,
    Math.min(Math.ceil(system.moons.length / MOONS_PER_PAGE) - 1, Math.floor(page)),
  );
  return system.moons.slice(safe * MOONS_PER_PAGE, (safe + 1) * MOONS_PER_PAGE);
};

export const systemFact = (system: MoonSystem): string => {
  if (system.id === 'earth') return 'Our Moon reflects sunlight and travels around Earth.';
  if (system.id === 'mars') return 'Phobos and Deimos are the two small moons of Mars.';
  if (system.id === 'pluto') return 'Charon is the largest of Pluto’s five moons.';
  if (system.id === 'haumea')
    return 'Haumea is a stretched dwarf planet with two moons: Hi’iaka and Namaka.';
  if (system.id === 'makemake') return 'Makemake’s little moon is nicknamed MK 2.';
  if (system.id === 'eris') return 'Dysnomia travels around the distant dwarf planet Eris.';
  return `${system.name} has ${system.moons.length} moons in our catalogue. Explore the named moons and those still known by their discovery designations.`;
};

export const moonFact = (system: MoonSystem, moon: MoonData): string => {
  const designation =
    moon.designation && moon.designation !== moon.name
      ? ` Its discovery designation is ${moon.designation}.`
      : '';
  return `${moon.name} is a moon of ${system.name}.${designation} ${
    moon.radiusKm === null
      ? 'Its size is shown symbolically in this explorer.'
      : `Its mean radius is about ${Math.round(moon.radiusKm).toLocaleString('en-US')} kilometers. Small moons are enlarged in the overview.`
  }`;
};
