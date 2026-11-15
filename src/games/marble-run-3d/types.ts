export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];
export type BuildMode = 'snap' | 'free';
export type GameMode = 'creative' | 'race' | 'music' | 'sorting' | 'chain';
export type Category =
  | 'Tracks'
  | 'Curves'
  | 'Tubes'
  | 'Spirals'
  | 'Obstacles'
  | 'Machines'
  | 'Interactive'
  | 'Supports'
  | 'Decorations';
export type Behavior =
  | 'dispenser'
  | 'collector'
  | 'finish'
  | 'bell'
  | 'drum'
  | 'bumper'
  | 'spring'
  | 'trampoline'
  | 'rotate'
  | 'seesaw'
  | 'pendulum'
  | 'moving'
  | 'conveyor'
  | 'elevator'
  | 'wheel'
  | 'magnet'
  | 'teleporter'
  | 'gate'
  | 'sorter'
  | 'switch'
  | 'counter'
  | 'domino'
  | 'trigger';
export interface Connector {
  id: string;
  position: Vec3;
  /** Local outward frame: +Z out of the piece, +Y track up. */
  rotation: Quat;
  type: 'channel' | 'tube' | 'support';
  accepts: readonly Connector['type'][];
  flow: 'in' | 'out' | 'structure';
  elevation: number;
}
export interface PathSample {
  position: Vec3;
  rotation: Quat;
}
export interface PieceDefinition {
  id: string;
  name: string;
  icon: string;
  category: Category;
  color: number;
  paths: PathSample[][];
  connectors: Connector[];
  shape: 'channel' | 'tube' | 'funnel' | 'box' | 'pillar' | 'obstacle';
  dimensions?: Vec3;
  behavior?: Behavior;
  scalable?: boolean;
}
export interface PieceSettings {
  note: number;
  strength: number;
  enabled: boolean;
  color: string;
  link: string;
}
export interface TrackPiece {
  id: string;
  type: string;
  position: Vec3;
  rotation: Quat;
  scale: number;
  settings: PieceSettings;
}
export interface Connection {
  a: string;
  portA: string;
  b: string;
  portB: string;
}
export interface MarbleConfig {
  appearance: string;
  size: number;
  mass: number;
  bounce: number;
  trails: boolean;
  glow: boolean;
  limit: number;
}
export interface CameraPreferences {
  yaw: number;
  pitch: number;
  distance: number;
  target: Vec3;
}
export interface Construction {
  version: 1;
  pieces: TrackPiece[];
  connections: Connection[];
  buildMode: BuildMode;
  gameMode: GameMode;
  marble: MarbleConfig;
  physics: string;
  camera: CameraPreferences;
}
export const DEFAULT_MARBLE: MarbleConfig = {
  appearance: 'rainbow',
  size: 0.18,
  mass: 1,
  bounce: 0.12,
  trails: false,
  glow: false,
  limit: 40,
};
export const PHYSICS = {
  Normal: { gravity: 9.81, friction: 0.22, bounce: 1, mass: 1 },
  'Low Gravity': { gravity: 3.5, friction: 0.22, bounce: 1, mass: 1 },
  'High Gravity': { gravity: 17, friction: 0.22, bounce: 1, mass: 1 },
  'Bouncy Marbles': { gravity: 9.81, friction: 0.18, bounce: 3.5, mass: 1 },
  'Heavy Marbles': { gravity: 9.81, friction: 0.3, bounce: 0.5, mass: 4 },
  'Low Friction': { gravity: 9.81, friction: 0.015, bounce: 1, mass: 1 },
} as const;
export const APPEARANCES = [
  'red',
  'blue',
  'green',
  'yellow',
  'orange',
  'purple',
  'rainbow',
  'glass',
  'metallic',
  'swirled',
  'glow',
] as const;
export const CATEGORIES: Category[] = [
  'Tracks',
  'Curves',
  'Tubes',
  'Spirals',
  'Obstacles',
  'Machines',
  'Interactive',
  'Supports',
  'Decorations',
];
