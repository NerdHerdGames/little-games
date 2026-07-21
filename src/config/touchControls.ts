import { GAMES } from '../games/registry';
import type { TouchControlProfile } from '../input/TouchControlProfile';

const DWARF_PLANET_SCENES = new Set([
  'MainMenu',
  'PlanetSelect',
  'CeresMission',
  'PlutoMission',
  'HaumeaMission',
  'MakemakeMission',
  'ErisMission',
  'FactCard',
  'BadgeCollection',
  'AllWorldsCelebration',
  'FreeExplore',
  'Settings',
  'ParentInfo',
]);

/** Returns the touch layout owned by the active top-level game. */
export function getTouchControlProfile(sceneKey: string): TouchControlProfile {
  const game = GAMES.find((candidate) => candidate.sceneKey === sceneKey);
  if (game) return game.touchControls;
  if (DWARF_PLANET_SCENES.has(sceneKey)) return 'full';
  return 'none';
}
