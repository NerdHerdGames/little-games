export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  sceneKey: string;
}

export const GAMES: readonly GameDefinition[] = [
  {
    id: 'star-collector',
    title: 'Star Collector',
    description: 'Gather all five friendly stars!',
    sceneKey: 'StarCollector',
  },
];
