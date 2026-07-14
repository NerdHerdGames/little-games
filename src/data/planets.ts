import type { PlanetId } from '../storage/ProgressStore';

export interface PlanetData {
  id: PlanetId;
  name: string;
  subtitle: string;
  color: number;
  playable: boolean;
  missionScene?: string;
}

export const PLANETS: readonly PlanetData[] = [
  {
    id: 'ceres',
    name: 'Ceres',
    subtitle: 'Asteroid Belt',
    color: 0xb9a58d,
    playable: true,
    missionScene: 'CeresMission',
  },
  {
    id: 'pluto',
    name: 'Pluto',
    subtitle: 'Kuiper Belt',
    color: 0xd6b38a,
    playable: true,
    missionScene: 'PlutoMission',
  },
  {
    id: 'haumea',
    name: 'Haumea',
    subtitle: 'Fast and oval',
    color: 0xcfe9ef,
    playable: true,
    missionScene: 'HaumeaMission',
  },
  {
    id: 'makemake',
    name: 'Makemake',
    subtitle: 'Reddish world',
    color: 0xc67c5a,
    playable: true,
    missionScene: 'MakemakeMission',
  },
  {
    id: 'eris',
    name: 'Eris',
    subtitle: 'Faraway world',
    color: 0xe8edf1,
    playable: true,
    missionScene: 'ErisMission',
  },
];

export const CERES_FACTS = [
  'Ceres is in the asteroid belt.',
  'It is located between Mars and Jupiter.',
  'Ceres has bright areas inside some of its craters.',
] as const;

export const PLUTO_FACTS = [
  'Pluto has a large heart-shaped region.',
  'Pluto is located beyond Neptune.',
  'Pluto’s largest moon is named Charon.',
] as const;

export const HAUMEA_FACTS = [
  'Haumea has a stretched shape.',
  'Haumea spins very quickly.',
  'Haumea has a ring and two known moons.',
] as const;

export const MAKEMAKE_FACTS = [
  'Makemake is located beyond Neptune.',
  'Makemake is part of the Kuiper Belt.',
  'Makemake has a small known moon.',
] as const;

export const ERIS_FACTS = [
  'Eris is very far from the Sun.',
  'Eris is similar in size to Pluto.',
  'Eris has a moon named Dysnomia.',
] as const;

export const FACTS_BY_PLANET = {
  ceres: CERES_FACTS,
  pluto: PLUTO_FACTS,
  haumea: HAUMEA_FACTS,
  makemake: MAKEMAKE_FACTS,
  eris: ERIS_FACTS,
} as const;
