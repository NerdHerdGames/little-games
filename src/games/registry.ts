export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  sceneKey: string;
  accentColor: number;
  symbol: string;
}

export const GAMES: readonly GameDefinition[] = [
  {
    id: 'star-collector',
    title: 'Star Collector',
    description: 'Move around and collect five friendly stars.',
    sceneKey: 'StarCollector',
    accentColor: 0xffd65a,
    symbol: '★',
  },
  {
    id: 'dwarf-planet-explorer',
    title: 'Dwarf Planet Explorer',
    description: 'Explore five little worlds and earn planet badges.',
    sceneKey: 'MainMenu',
    accentColor: 0x8cc8e8,
    symbol: '●',
  },
  {
    id: 'solar-system-telescope',
    title: 'Solar System Telescope',
    description: 'Drag through space and discover the Sun and eight planets.',
    sceneKey: 'SolarSystemExplorer',
    accentColor: 0x557bdc,
    symbol: '☀',
  },
  {
    id: 'fish-tank-quiz',
    title: 'Fish Tank Quiz',
    description: 'Answer friendly questions and fill a swimming fish tank.',
    sceneKey: 'FishTankQuiz',
    accentColor: 0x65c8d0,
    symbol: '🐟',
  },
];
