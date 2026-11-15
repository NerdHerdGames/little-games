import type { GameMode } from './types';
import type { PhysicsWorld } from './PhysicsWorld';

export const GAME_MODES: { id: GameMode; icon: string; title: string; description: string }[] = [
  {
    id: 'creative',
    icon: '✦',
    title: 'Creative sandbox',
    description: 'A toy box with no rules. Build, roll, and explore.',
  },
  {
    id: 'race',
    icon: '⚑',
    title: 'Marble racing',
    description: 'All dispensers release together. Finish lines record lane times.',
  },
  {
    id: 'music',
    icon: '♫',
    title: 'Musical marble run',
    description: 'Build a melody with bells, xylophone bars, and drums.',
  },
  {
    id: 'sorting',
    icon: '◇',
    title: 'Color sorting',
    description: 'Choose gate and bin colors. See how many marbles match.',
  },
  {
    id: 'chain',
    icon: '⚡',
    title: 'Chain reactions',
    description: 'Link pressure plates, buttons, and switches to machines.',
  },
];
export function raceReplay(physics: PhysicsWorld): void {
  physics.reset();
  physics.release(1);
}
