export interface Point {
  x: number;
  y: number;
}
export type BuildMode = 'snap' | 'free';
export type Experience = 'sandbox' | 'race' | 'music' | 'sorting' | 'chain';
export interface Port extends Point {
  id: string;
  angle: number;
  type: 'rail';
  accepts: readonly string[];
}
export interface PieceDefinition {
  type: string;
  name: string;
  category: 'Tracks' | 'Movers' | 'Play';
  color: string;
  icon: string;
  paths: Point[][];
  ports: Port[];
  mechanic?:
    | 'dispenser'
    | 'collector'
    | 'finish'
    | 'bell'
    | 'drum'
    | 'counter'
    | 'gate'
    | 'color-gate'
    | 'plate'
    | 'bumper'
    | 'spring'
    | 'conveyor'
    | 'moving'
    | 'elevator'
    | 'seesaw'
    | 'wheel'
    | 'pendulum'
    | 'domino'
    | 'magnet'
    | 'repeller'
    | 'teleporter';
  scalable?: boolean;
}
export interface Piece {
  id: string;
  type: string;
  x: number;
  y: number;
  angle: number;
  scale: number;
  props: { color: string; note: number; power: number; open: boolean };
}
export interface Connection {
  a: string;
  portA: string;
  b: string;
  portB: string;
}
export const COLORS = [
  '#ee6470',
  '#408cdd',
  '#3aa67b',
  '#edb937',
  '#9566d6',
  '#f18b43',
  'rainbow',
] as const;
export interface MarbleSettings {
  color: string;
  size: number;
  weight: number;
  bounce: number;
  speed: number;
  finish: 'glossy' | 'metal' | 'glass' | 'stripe';
  trails: boolean;
}
export interface RunDocument {
  version: 1;
  pieces: Piece[];
  connections: Connection[];
  mode: BuildMode;
  experience: Experience;
  gravity: number;
  grid: boolean;
  marbles: MarbleSettings;
}
export const defaultDocument = (): RunDocument => ({
  version: 1,
  pieces: [],
  connections: [],
  mode: 'snap',
  experience: 'sandbox',
  gravity: 1,
  grid: true,
  marbles: {
    color: COLORS[0],
    size: 11,
    weight: 1,
    bounce: 0.25,
    speed: 2,
    finish: 'glossy',
    trails: true,
  },
});
export const copy = <T>(value: T): T => structuredClone(value);
export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
export const uid = (): string => globalThis.crypto.randomUUID();
