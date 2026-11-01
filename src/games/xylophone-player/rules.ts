export const BARS = [
  { id: 'c', name: 'Low C', label: 'C', midi: 72, key: '1', color: '#ee9b8d', length: 100 },
  { id: 'd', name: 'D', label: 'D', midi: 74, key: '2', color: '#efb477', length: 94 },
  { id: 'e', name: 'E', label: 'E', midi: 76, key: '3', color: '#edce79', length: 88 },
  { id: 'f', name: 'F', label: 'F', midi: 77, key: '4', color: '#a8cf98', length: 82 },
  { id: 'g', name: 'G', label: 'G', midi: 79, key: '5', color: '#8dc9c1', length: 76 },
  { id: 'a', name: 'A', label: 'A', midi: 81, key: '6', color: '#94bedb', length: 70 },
  { id: 'b', name: 'B', label: 'B', midi: 83, key: '7', color: '#b7afe0', length: 64 },
  { id: 'high-c', name: 'High C', label: 'C', midi: 84, key: '8', color: '#dfacd0', length: 58 },
] as const;

export type BarId = (typeof BARS)[number]['id'];

export interface Tune {
  id: string;
  name: string;
  rows: readonly (readonly BarId[])[];
}

/** Untimed tunes: three originals and the user-supplied Jurassic Park excerpt. */
export const TUNES: readonly Tune[] = [
  {
    id: 'rainbow-walk',
    name: 'Rainbow walk',
    rows: [['c', 'd', 'e', 'f', 'g', 'a', 'b', 'high-c']],
  },
  {
    id: 'raindrops',
    name: 'Raindrops',
    rows: [
      ['e', 'e', 'd', 'c'],
      ['d', 'd', 'e', 'c'],
    ],
  },
  {
    id: 'little-dance',
    name: 'Little dance',
    rows: [
      ['c', 'e', 'g', 'e'],
      ['d', 'f', 'a', 'g', 'c'],
    ],
  },
  {
    id: 'jurassic-park',
    name: 'Jurassic Park',
    rows: [
      ['high-c', 'b', 'high-c', 'g', 'f'],
      ['high-c', 'b', 'high-c', 'g', 'f'],
      ['high-c', 'b', 'high-c', 'g', 'f'],
      ['a', 'g', 'a', 'b', 'high-c'],
    ],
  },
];

export interface TuneProgress {
  row: number;
  note: number;
  played: number;
  complete: boolean;
}

export const startTune = (): TuneProgress => ({ row: 0, note: 0, played: 0, complete: false });

/** Every bar can sound; exploring another note leaves practice progress intact. */
export function strikeNote(tune: Tune, progress: TuneProgress, note: BarId): TuneProgress {
  if (progress.complete || tune.rows[progress.row]?.[progress.note] !== note) return progress;
  const played = progress.played + 1;
  if (progress.note + 1 < tune.rows[progress.row]!.length)
    return { ...progress, note: progress.note + 1, played };
  if (progress.row + 1 < tune.rows.length)
    return { row: progress.row + 1, note: 0, played, complete: false };
  return { ...progress, note: progress.note + 1, played, complete: true };
}
