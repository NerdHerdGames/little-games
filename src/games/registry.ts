export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  sceneKey: string;
  accentColor: number;
  symbol: string;
  icon?: { key: string; path: string };
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
    description: 'Discover the Sun, eight planets, and five little worlds.',
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
  {
    id: 'planet-fact-match',
    title: 'Planet Fact Match',
    description: 'Drag each planet to the fact it matches and earn eight stars.',
    sceneKey: 'PlanetFactMatch',
    accentColor: 0x7d8fe8,
    symbol: '🪐',
  },
  {
    id: 'dwarf-planet-fact-match',
    title: 'Dwarf Planet Fact Match',
    description: 'Match five little worlds with their space facts.',
    sceneKey: 'DwarfFactMatch',
    accentColor: 0xb9a58d,
    symbol: '●',
  },
  {
    id: 'solar-system-order',
    title: 'Solar System Order',
    description: 'Place the Sun, planets, and little worlds in distance order.',
    sceneKey: 'SolarSystemOrder',
    accentColor: 0xffb84d,
    symbol: '↗',
  },
  {
    id: 'fish-shape-match',
    title: 'Fish Shape Match',
    description: 'Find circle, square, and triangle fish in three bright colors.',
    sceneKey: 'FishShapeMatch',
    accentColor: 0x55ace8,
    symbol: '△',
  },
  {
    id: 'shape-flip-match',
    title: 'Shape Flip Match',
    description: 'Flip cards and match colorful circles, squares, and triangles.',
    sceneKey: 'ShapeFlipMatch',
    accentColor: 0x5b73a8,
    symbol: '?',
  },
  {
    id: 'tractor-trailer-trip',
    title: 'Tractor Trailer Trip',
    description: 'Drive a tractor and help three farm animals climb aboard.',
    sceneKey: 'TractorTrailer',
    accentColor: 0x74b85a,
    symbol: 'T',
    icon: {
      key: 'tractor-trailer-icon',
      path: 'assets/games/tractor-trailer/tractor-icon.png',
    },
  },
];
