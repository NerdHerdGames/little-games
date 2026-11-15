import { Matrix4, Quaternion, Vector3 } from 'three';
import type { Behavior, Category, Connector, PathSample, PieceDefinition, Vec3 } from './types';

const up = new Vector3(0, 1, 0);
/** Upright toy channels; optional parallel transport keeps vertical loop frames continuous. */
export function samplePath(fn: (t: number) => Vec3, count = 32, transport = false): PathSample[] {
  let normal = up.clone();
  let previous: Vector3 | undefined;
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count;
    const p = new Vector3(...fn(t));
    const tangent = new Vector3(...fn(Math.min(1, t + 0.0001)))
      .sub(new Vector3(...fn(Math.max(0, t - 0.0001))))
      .normalize();
    if (previous && transport)
      normal.applyQuaternion(new Quaternion().setFromUnitVectors(previous, tangent));
    if (!transport) normal = up.clone();
    if (Math.abs(normal.dot(tangent)) > 0.99) normal = new Vector3(0, 0, -1);
    const right = normal.clone().cross(tangent).normalize();
    normal = tangent.clone().cross(right).normalize();
    previous = tangent;
    return {
      position: p.toArray(),
      rotation: new Quaternion()
        .setFromRotationMatrix(new Matrix4().makeBasis(right, normal, tangent))
        .toArray(),
    };
  });
}
const ease = (t: number): number => t * t * (3 - 2 * t);
const straight = (length: number, drop = 0): PathSample[] =>
  samplePath((t) => [0, -ease(t) * drop, t * length], 24);
const turn = (angle: number, drop = 0.45): PathSample[] =>
  samplePath(
    (t) => [2 * (1 - Math.cos(t * angle)), -ease(t) * drop, 2 * Math.sin(t * angle)],
    Math.ceil(Math.abs(angle) * 22),
  );
function ports(paths: PathSample[][], tube: boolean): Connector[] {
  const entry = paths[0]![0]!;
  const flip = new Quaternion().setFromAxisAngle(up, Math.PI);
  return [
    {
      id: 'in',
      position: entry.position,
      rotation: new Quaternion(...entry.rotation).multiply(flip).toArray(),
      type: tube ? 'tube' : 'channel',
      accepts: ['channel', 'tube'],
      flow: 'in',
      elevation: entry.position[1],
    },
    ...paths.map((path, i): Connector => {
      const end = path.at(-1)!;
      return {
        id: `out${i}`,
        position: end.position,
        rotation: end.rotation,
        type: tube ? 'tube' : 'channel',
        accepts: ['channel', 'tube'],
        flow: 'out',
        elevation: end.position[1],
      };
    }),
  ];
}
const definitions: PieceDefinition[] = [];
function track(
  id: string,
  name: string,
  icon: string,
  category: Category,
  path: PathSample[] | PathSample[][],
  color: number,
  behavior?: Behavior,
  tube = false,
): void {
  const paths = Array.isArray(path[0]) ? (path as PathSample[][]) : [path as PathSample[]];
  definitions.push({
    id,
    name,
    icon,
    category,
    paths,
    color,
    shape: tube ? 'tube' : 'channel',
    connectors: ports(paths, tube),
    ...(behavior ? { behavior } : {}),
  });
}
track('short', 'Short track', '━', 'Tracks', straight(1.5, 0.2), 0xffb82e);
track('medium', 'Medium track', '━━', 'Tracks', straight(3, 0.4), 0xffb82e);
track('long', 'Long track', '━━━', 'Tracks', straight(5, 0.65), 0xf6ba35);
track('flat', 'Flat channel', '═', 'Tracks', straight(3), 0xffcc52);
track('gentle', 'Gentle slope', '╲', 'Tracks', straight(3, 0.8), 0xff8b42);
track('steep', 'Steep slope', '↘', 'Tracks', straight(3, 2), 0xf1744a);
track('connector', 'Track connector', '⇄', 'Tracks', straight(0.65), 0xead7b4);
track('turn45', '45° turn', '⤴', 'Curves', turn(Math.PI / 4), 0x35bba4);
track('turn90', '90° turn', '↱', 'Curves', turn(Math.PI / 2), 0x30b7a2);
track('uturn', 'U-turn', '∩', 'Curves', turn(Math.PI, 0.75), 0x50bdaa);
track(
  'ramp',
  'Curved ramp',
  '⌁',
  'Curves',
  samplePath((t) => [Math.sin(t * Math.PI) * 0.7, -t * t * 1.5, t * 4]),
  0x53b5d6,
);
track('tube', 'Enclosed tube', '▰', 'Tubes', straight(3, 0.4), 0x80cde8, undefined, true);
track('clear-tube', 'Clear tube', '◯', 'Tubes', straight(3, 0.4), 0xa5e8ed, undefined, true);
track(
  'drop',
  'Vertical drop',
  '⇣',
  'Tubes',
  samplePath((t) => [0, -4 * t, 0]),
  0x80cee6,
  undefined,
  true,
);
track(
  'elbow',
  'Tube elbow',
  '⤵',
  'Tubes',
  samplePath((t) => [0, 2 * (Math.cos((t * Math.PI) / 2) - 1), 2 * Math.sin((t * Math.PI) / 2)]),
  0x93d7df,
  undefined,
  true,
);
track(
  'helix',
  'Helical ramp',
  '↻',
  'Spirals',
  samplePath(
    (t) => [2 * (1 - Math.cos(t * Math.PI * 2)), -3 * ease(t), 2 * Math.sin(t * Math.PI * 2)],
    96,
  ),
  0xa78ad5,
);
track(
  'spiral',
  'Spiral tower',
  '◎',
  'Spirals',
  samplePath(
    (t) => [2 * (1 - Math.cos(t * Math.PI * 4)), -6 * ease(t), 2 * Math.sin(t * Math.PI * 4)],
    160,
  ),
  0x9975ce,
);
track(
  'loop',
  'Loop-the-loop',
  '◉',
  'Spirals',
  samplePath(
    (t) => [
      0,
      2 * (1 - Math.cos(t * Math.PI * 2)) - t * 0.5,
      t * 1.5 + 2 * Math.sin(t * Math.PI * 2),
    ],
    100,
    true,
  ),
  0xf18aa1,
  undefined,
  true,
);
track(
  'corkscrew',
  'Corkscrew',
  '∿',
  'Spirals',
  samplePath(
    (t) => [Math.sin(t * Math.PI * 2), 1 - Math.cos(t * Math.PI * 2) - t, t * 6],
    80,
    true,
  ),
  0xdf94c6,
  undefined,
  true,
);
for (const [id, name, size] of [
  ['small-funnel', 'Small funnel', 1.4],
  ['funnel', 'Large funnel', 2.4],
] as const) {
  const paths = [samplePath((t) => [0, -t * size, 0])];
  definitions.push({
    id,
    name,
    icon: '▽',
    category: 'Spirals',
    color: 0xec7b91,
    shape: 'funnel',
    paths,
    connectors: ports(paths, true).map((port) => ({
      ...port,
      position: [port.position[0], port.position[1], port.position[2] + 0.58],
    })),
    dimensions: [size, size, size],
  });
}
const fork = (side: number): PathSample[] =>
  samplePath((t) => [side * (1 - Math.cos((t * Math.PI) / 2)) * 1.5, -ease(t) * 0.4, t * 3]);
track('splitter', 'Two-way splitter', '⑂', 'Tracks', [fork(-1), fork(1)], 0x4cb7b1);
track(
  'junction',
  'Three-way junction',
  '⋔',
  'Tracks',
  [fork(-1), straight(3, 0.4), fork(1)],
  0x54bc94,
);
track('gate', 'Switchable gate', '⚑', 'Machines', straight(2, 0.3), 0xe76e67, 'gate');
track('sorter', 'Color sorting gate', '◇', 'Machines', [fork(-1), fork(1)], 0x70c29b, 'sorter');
track(
  'jump',
  'Jump ramp',
  '↗',
  'Obstacles',
  samplePath((t) => [0, -Math.sin(t * Math.PI) * 0.65, t * 3]),
  0xfc9a47,
);
const machines: [string, string, string, Behavior, number][] = [
  ['spring', 'Spring launcher', '↟', 'spring', 0xff9b4f],
  ['bumper', 'Rubber bumper', '●', 'bumper', 0xe87b89],
  ['trampoline', 'Trampoline', '⌒', 'trampoline', 0x79c7cf],
  ['rotating', 'Rotating platform', '↻', 'rotate', 0x95b95b],
  ['seesaw', 'Seesaw', '⚖', 'seesaw', 0xe1ac64],
  ['pendulum', 'Pendulum', '◴', 'pendulum', 0xeda4bf],
  ['moving', 'Moving platform', '↔', 'moving', 0x69b7d4],
  ['conveyor', 'Conveyor belt', '»', 'conveyor', 0x8a9bb4],
  ['elevator', 'Elevator', '⇧', 'elevator', 0x82b3d6],
  ['lift', 'Lift', '⇈', 'elevator', 0x85c8af],
  ['wheel', 'Marble wheel', '☸', 'wheel', 0xe9be63],
  ['magnet', 'Magnet', '∪', 'magnet', 0xe97975],
  ['teleporter', 'Teleporter', '✧', 'teleporter', 0xa38ad8],
];
for (const [id, name, icon, behavior, color] of machines)
  track(
    id,
    name,
    icon,
    ['bumper', 'trampoline', 'pendulum'].includes(id) ? 'Obstacles' : 'Machines',
    straight(2.4, 0.25),
    color,
    behavior,
  );
const interactive: [string, string, string, Behavior][] = [
  ['dispenser', 'Marble dispenser', '⬇', 'dispenser'],
  ['collector', 'Marble collector', '▣', 'collector'],
  ['finish', 'Finish line', '⚑', 'finish'],
  ['bell', 'Bell', '♧', 'bell'],
  ['xylophone', 'Xylophone bar', '♫', 'bell'],
  ['drum', 'Drum', '◉', 'drum'],
  ['button', 'Button', '⊙', 'switch'],
  ['plate', 'Pressure plate', '▱', 'trigger'],
  ['switch', 'Mechanical switch', '☷', 'switch'],
  ['counter', 'Counter', '123', 'counter'],
  ['domino', 'Domino', '▥', 'domino'],
  ['trigger', 'Chain trigger', '⚡', 'trigger'],
  ['bin', 'Colored bin', '▣', 'collector'],
];
for (const [id, name, icon, behavior] of interactive)
  track(
    id,
    name,
    icon,
    'Interactive',
    straight(1.4, behavior === 'domino' ? 0 : 0.16),
    behavior === 'dispenser' ? 0x5c88cf : 0xe3ad53,
    behavior,
  );
for (const [id, name, icon, shape, dimensions] of [
  ['pillar', 'Support pillar', '▥', 'pillar', [0.4, 3, 0.4]],
  ['column', 'Adjustable column', '↕', 'pillar', [0.55, 2, 0.55]],
  ['base', 'Base', '▰', 'box', [3, 0.25, 3]],
  ['platform', 'Platform', '▱', 'box', [4, 0.25, 4]],
  ['bracket', 'Bracket', '⌞', 'box', [1.5, 0.3, 0.5]],
  ['tower', 'Tower', '♜', 'pillar', [0.8, 5, 0.8]],
  ['decoration', 'Toy block', '✿', 'box', [0.7, 0.7, 0.7]],
] as const) {
  definitions.push({
    id,
    name,
    icon,
    category: id === 'decoration' ? 'Decorations' : 'Supports',
    shape,
    dimensions: [...dimensions],
    paths: [],
    color: id === 'decoration' ? 0xd78cbf : 0xe4cda1,
    scalable: true,
    connectors: [
      {
        id: 'base',
        position: [0, 0, 0],
        rotation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2).toArray(),
        type: 'support',
        accepts: ['support'],
        flow: 'structure',
        elevation: 0,
      },
      {
        id: 'top',
        position: [0, dimensions[1], 0],
        rotation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2).toArray(),
        type: 'support',
        accepts: ['support'],
        flow: 'structure',
        elevation: dimensions[1],
      },
    ],
  });
}
export const PIECES: readonly PieceDefinition[] = definitions;
export const REGISTRY = new Map(PIECES.map((p) => [p.id, p]));
export function mechanismOffset(behavior: Behavior | undefined): Vec3 {
  return behavior === 'wheel'
    ? [0, 1.35, 1.2]
    : behavior === 'pendulum'
      ? [0, 1.4, 1.2]
      : [0, 0, 0];
}
export function definition(type: string): PieceDefinition {
  const result = REGISTRY.get(type);
  if (!result) throw new Error(`Unknown piece: ${type}`);
  return result;
}
