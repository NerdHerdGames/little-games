import type { Piece, PieceDefinition, Point, Port } from './types';
import { uid } from './types';
const p = (x: number, y: number): Point => ({ x, y });
const arc = (
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
  steps = 24,
): Point[] =>
  Array.from({ length: steps + 1 }, (_, i) =>
    p(
      cx + Math.cos(start + ((end - start) * i) / steps) * radius,
      cy + Math.sin(start + ((end - start) * i) / steps) * radius,
    ),
  );
const port = (id: string, point: Point, angle: number): Port => ({
  ...point,
  id,
  angle,
  type: 'rail',
  accepts: ['rail'],
});
function track(
  type: string,
  name: string,
  color: string,
  icon: string,
  paths: Point[][],
  scalable = false,
): PieceDefinition {
  const path = paths[0]!;
  const a = path[0]!,
    b = path[1]!,
    c = path.at(-2)!,
    d = path.at(-1)!;
  return {
    type,
    name,
    color,
    icon,
    category: 'Tracks',
    paths,
    scalable,
    ports: [
      port('in', a, Math.atan2(a.y - b.y, a.x - b.x)),
      port('out', d, Math.atan2(d.y - c.y, d.x - c.x)),
    ],
  };
}
function toy(
  type: string,
  name: string,
  color: string,
  icon: string,
  mechanic: NonNullable<PieceDefinition['mechanic']>,
  paths: Point[][] = [[p(-55, 0), p(55, 0)]],
): PieceDefinition {
  return {
    type,
    name,
    color,
    icon,
    mechanic,
    paths,
    ports: [],
    category: [
      'moving',
      'elevator',
      'conveyor',
      'seesaw',
      'wheel',
      'pendulum',
      'domino',
      'spring',
      'magnet',
      'repeller',
      'teleporter',
    ].includes(mechanic)
      ? 'Movers'
      : 'Play',
  };
}
export const PIECES: readonly PieceDefinition[] = [
  track('ramp', 'Ramp', '#ea9a52', '╲', [[p(-90, -24), p(90, 24)]], true),
  track('short', 'Short ramp', '#eeb65f', '╲', [[p(-50, -15), p(50, 15)]]),
  track('long', 'Long ramp', '#df9150', '╲', [[p(-140, -36), p(140, 36)]], true),
  track('flat', 'Flat track', '#4faeab', '━', [[p(-90, 0), p(90, 0)]], true),
  track('curve', 'Curved ramp', '#9d80d4', '⌒', [arc(-60, 60, 90, -Math.PI / 2, 0)]),
  track('quarter', 'Quarter turn', '#779bda', '◜', [arc(45, 45, 90, Math.PI, Math.PI / 2)]),
  track('bowl', 'Half pipe', '#6bafd2', '∪', [arc(0, -45, 90, Math.PI, 0)]),
  track('drop', 'Vertical drop', '#5dadb6', '│', [[p(0, -90), p(0, 90)]]),
  track('platform', 'Platform', '#7bb88c', '▬', [[p(-120, 0), p(120, 0)]], true),
  track('wall', 'Wall', '#a5a8b7', '┃', [[p(0, -70), p(0, 70)]]),
  track('loop', 'Loop', '#b287c6', '◯', [
    [
      p(-130, 65),
      p(-85, 65),
      ...arc(0, 0, 85, Math.PI / 2, Math.PI / 2 - Math.PI * 2, 48),
      p(130, 85),
    ],
  ]),
  {
    ...track('funnel', 'Funnel', '#e3a15b', '▽', [
      [p(-95, -60), p(-24, 55)],
      [p(95, -60), p(24, 55)],
    ]),
    ports: [],
  },
  {
    ...track('splitter', 'Splitter', '#77b99f', '⋔', [
      [p(-100, -35), p(0, 0), p(100, 35)],
      [p(0, 0), p(50, -50)],
    ]),
    ports: [
      port('in', p(-100, -35), Math.atan2(-35, -100)),
      port('out', p(100, 35), Math.atan2(35, 100)),
      port('branch', p(50, -50), -Math.PI / 4),
    ],
  },
  toy('dispenser', 'Start', '#5c9e88', '●', 'dispenser', []),
  toy('collector', 'Basket', '#d9a956', '▱', 'collector', [
    [p(-55, -30), p(-45, 30), p(45, 30), p(55, -30)],
  ]),
  toy('finish', 'Finish', '#698bb8', '⚑', 'finish', []),
  toy('bell', 'Bell', '#e2ba55', '♬', 'bell'),
  toy('xylophone', 'Note bar', '#bb86c6', '♫', 'bell'),
  toy('drum', 'Drum', '#df8778', '◉', 'drum'),
  toy('counter', 'Counter', '#6eacb6', '123', 'counter', []),
  toy('gate', 'Gate', '#b890b9', '⊣', 'gate', [[p(0, -55), p(0, 55)]]),
  toy('color-gate', 'Color gate', '#e0849d', '◈', 'color-gate', [[p(0, -55), p(0, 55)]]),
  toy('plate', 'Switch plate', '#8eada1', '⊟', 'plate'),
  toy('bumper', 'Bumper', '#ed8673', '✳', 'bumper', []),
  toy('trampoline', 'Trampoline', '#b189d0', '⌁', 'spring'),
  toy('launcher', 'Launcher', '#dba25b', '↗', 'spring', [[p(-45, 15), p(45, -15)]]),
  toy('conveyor', 'Conveyor', '#79a2b3', '»', 'conveyor'),
  toy('moving', 'Moving shelf', '#6caca2', '↔', 'moving'),
  toy('elevator', 'Elevator', '#86a8ca', '↕', 'elevator'),
  toy('seesaw', 'Seesaw', '#d59f68', '⚖', 'seesaw'),
  toy('wheel', 'Wheel', '#cc9e65', '✣', 'wheel', [
    [p(-60, 0), p(60, 0)],
    [p(0, -60), p(0, 60)],
  ]),
  toy('pendulum', 'Pendulum', '#b5a0c4', '◕', 'pendulum', []),
  toy('domino', 'Domino', '#81accc', '▥', 'domino', [[p(0, -40), p(0, 40)]]),
  toy('magnet', 'Magnet +', '#d67b88', '+', 'magnet', []),
  toy('repeller', 'Magnet −', '#799aca', '−', 'repeller', []),
  toy('teleporter', 'Portal', '#9e89cd', '◎', 'teleporter', []),
];
export const getDefinition = (type: string): PieceDefinition => {
  const found = PIECES.find((piece) => piece.type === type);
  if (!found) throw new Error(`Unknown marble run piece: ${type}`);
  return found;
};
export const createPiece = (type: string, x: number, y: number): Piece => ({
  id: uid(),
  type,
  x,
  y,
  angle: 0,
  scale: 1,
  props: { color: '#ee6470', note: 0, power: 1, open: false },
});
