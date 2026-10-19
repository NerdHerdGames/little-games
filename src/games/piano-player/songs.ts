import type { NoteId, Song, SongNote } from './rules';

const notes = (keys: readonly NoteId[]): SongNote[] => keys.map((key) => ({ key }));
const excerptRow = (keys: readonly NoteId[], words: string[], fingers: string[]): SongNote[] =>
  keys.map((key, i) => ({ key, syllable: words[i] ?? '', finger: fingers[i] ?? '' }));

export const SONGS: readonly Song[] = [
  {
    id: 'halloween',
    title: 'This Is Halloween',
    source: 'Practice excerpt transcribed from your supplied sheet. Play at your own pace.',
    rows: [
      excerptRow(
        ['E', 'E', 'E', 'E', 'E', 'F', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'],
        [
          'Boys',
          'and',
          'girls',
          'of',
          'ev-',
          'e-',
          'ry',
          'age.',
          'Would-',
          'n’t',
          'you',
          'like',
          'to',
          'see',
        ],
        ['3', '3', '3', '3', '3', '4', '2', '2', '2', '2', '2', '2', '2', '2'],
      ),
      excerptRow(
        ['D', 'E', 'F', 'E', 'E', 'E', 'E', 'E', 'G', 'F', 'E', 'D'],
        ['so-', 'me-', 'thing', 'strange?', 'Come', 'with', 'us', 'and', 'you', 'wi-', 'll', 'see'],
        ['2', '3', '4', '3', '3', '3', '3', '3', '5', '4', '3', '2'],
      ),
      excerptRow(
        ['D', 'D', 'D', 'F', 'E', 'C', 'B', 'E'],
        ['This,', 'our', 'town', 'of', 'Ha-', 'llow-', 'e-', 'en'],
        ['2', '2', '2', '4', '3', '1', '', '3'],
      ),
      excerptRow(
        ['G', 'G', 'G', 'Fs', 'E', 'G', 'G', 'G', 'Fs', 'E'],
        ['This', 'is', 'Hall-', 'ow-', 'een', 'this', 'is', 'hall-', 'ow-', 'een'],
        ['5', '5', '5', '4', '3', '5', '5', '5', '4', '3'],
      ),
      excerptRow(
        ['G', 'D', 'D', 'C', 'Bb', 'A', 'E', 'F'],
        ['Pump-', 'kins', 'scream', 'in', 'the', 'dead', 'of', 'night.'],
        ['5', '2', '2', '1', 'LH1', 'LH2', '3', '4'],
      ),
    ],
  },
  {
    id: 'ode',
    title: 'Ode to Joy',
    source: 'Beethoven · Simplified public-domain melody. Play at your own pace.',
    rows: [
      notes(['E', 'E', 'F', 'G', 'G', 'F', 'E', 'D']),
      notes(['C', 'C', 'D', 'E', 'E', 'D', 'D']),
      notes(['E', 'E', 'F', 'G', 'G', 'F', 'E', 'D']),
      notes(['C', 'C', 'D', 'E', 'D', 'C', 'C']),
    ],
  },
  {
    id: 'mary',
    title: 'Mary Had a Little Lamb',
    source: 'Traditional melody · Play at your own pace.',
    rows: [
      notes(['E', 'D', 'C', 'D', 'E', 'E', 'E']),
      notes(['D', 'D', 'D', 'E', 'G', 'G']),
      notes(['E', 'D', 'C', 'D', 'E', 'E', 'E', 'E']),
      notes(['D', 'D', 'E', 'D', 'C']),
    ],
  },
];
