export const DRUMS = [
  {
    id: 'crash',
    name: 'Crash',
    voice: 'cymbal',
    frequency: 6500,
    decay: 0.75,
    color: '#f3ce78',
    key: '1',
    sound: 'Tsssh',
  },
  {
    id: 'high-tom',
    name: 'High tom',
    voice: 'tom',
    frequency: 210,
    decay: 0.24,
    color: '#aad9d0',
    key: '2',
    sound: 'Dum',
  },
  {
    id: 'low-tom',
    name: 'Low tom',
    voice: 'tom',
    frequency: 155,
    decay: 0.3,
    color: '#aad9d0',
    key: '3',
    sound: 'Dom',
  },
  {
    id: 'ride',
    name: 'Ride',
    voice: 'cymbal',
    frequency: 8500,
    decay: 0.42,
    color: '#f3ce78',
    key: '4',
    sound: 'Ting',
  },
  {
    id: 'hi-hat',
    name: 'Hi-hat',
    voice: 'cymbal',
    frequency: 9000,
    decay: 0.075,
    color: '#f3ce78',
    key: '5',
    sound: 'Tss',
  },
  {
    id: 'snare',
    name: 'Snare',
    voice: 'snare',
    frequency: 180,
    decay: 0.16,
    color: '#c4c0e9',
    key: '6',
    sound: 'Tak',
  },
  {
    id: 'kick',
    name: 'Kick',
    voice: 'kick',
    frequency: 125,
    decay: 0.3,
    color: '#edb39e',
    key: '7',
    sound: 'Boom',
  },
  {
    id: 'floor-tom',
    name: 'Floor tom',
    voice: 'tom',
    frequency: 105,
    decay: 0.36,
    color: '#aad9d0',
    key: '8',
    sound: 'Doom',
  },
] as const;

export type Drum = (typeof DRUMS)[number];
export type DrumId = Drum['id'];

export interface Rhythm {
  id: string;
  name: string;
  steps: readonly DrumId[];
}

/** Original, untimed practice patterns. Every strike still sounds during practice. */
export const RHYTHMS: readonly Rhythm[] = [
  { id: 'first-beat', name: 'First beat', steps: ['kick', 'snare', 'kick', 'snare'] },
  {
    id: 'hat-dance',
    name: 'Hat dance',
    steps: ['kick', 'hi-hat', 'snare', 'hi-hat', 'kick', 'hi-hat', 'snare', 'hi-hat'],
  },
  {
    id: 'tom-trail',
    name: 'Tom trail',
    steps: [
      'high-tom',
      'high-tom',
      'low-tom',
      'low-tom',
      'floor-tom',
      'floor-tom',
      'kick',
      'crash',
    ],
  },
];

export interface RhythmProgress {
  played: number;
  complete: boolean;
}

export function startRhythm(): RhythmProgress {
  return { played: 0, complete: false };
}

export function strikeRhythm(
  rhythm: Rhythm,
  progress: RhythmProgress,
  drum: DrumId,
): RhythmProgress {
  if (progress.complete || rhythm.steps[progress.played] !== drum) return progress;
  const played = progress.played + 1;
  return { played, complete: played === rhythm.steps.length };
}
