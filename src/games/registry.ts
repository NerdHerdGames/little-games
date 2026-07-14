export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  sceneKey: string;
}

export const GAMES: readonly GameDefinition[] = [
  {
    id: 'ceres',
    title: 'Ceres Bright Spot Search',
    description: 'Guide a rover to three bright areas.',
    sceneKey: 'CeresMission',
  },
  {
    id: 'pluto',
    title: "Pluto's Heart Puzzle",
    description: "Build Pluto's large heart-shaped region.",
    sceneKey: 'PlutoMission',
  },
  {
    id: 'haumea',
    title: "Haumea's Speedy Spin",
    description: 'Match five shapes as they orbit fast-spinning Haumea.',
    sceneKey: 'HaumeaMission',
  },
  {
    id: 'makemake',
    title: 'Makemake Moon Search',
    description: 'Use a telescope to find Makemake and its small moon.',
    sceneKey: 'MakemakeMission',
  },
  {
    id: 'eris',
    title: 'Journey to Eris',
    description: 'Guide a probe through five deep-space checkpoints.',
    sceneKey: 'ErisMission',
  },
];
