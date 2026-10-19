export const PIANO_KEYS = [
  { id: 'A', midi: 57, label: 'A', color: '#c966ed', white: 0 },
  { id: 'Bb', midi: 58, label: 'B♭ / A♯', color: '#d57ba7', after: 0 },
  { id: 'B', midi: 59, label: 'B', color: '#f78ac4', white: 1 },
  { id: 'C', midi: 60, label: 'C', color: '#f47686', white: 2 },
  { id: 'Db', midi: 61, label: 'D♭ / C♯', color: '#f7aa87', after: 2 },
  { id: 'D', midi: 62, label: 'D', color: '#ffb776', white: 3 },
  { id: 'Eb', midi: 63, label: 'E♭ / D♯', color: '#e3ce83', after: 3 },
  { id: 'E', midi: 64, label: 'E', color: '#e2e97c', white: 4 },
  { id: 'F', midi: 65, label: 'F', color: '#89d99b', white: 5 },
  { id: 'Fs', midi: 66, label: 'F♯ / G♭', color: '#69b493', after: 5 },
  { id: 'G', midi: 67, label: 'G', color: '#65c4df', white: 6 },
  { id: 'Ab', midi: 68, label: 'A♭ / G♯', color: '#9e9ade', after: 6 },
] as const;

export type NoteId = (typeof PIANO_KEYS)[number]['id'];
export interface SongNote {
  key: NoteId;
  syllable?: string;
  finger?: string;
}
export interface Song {
  id: string;
  title: string;
  source: string;
  rows: readonly (readonly SongNote[])[];
}
export interface SongProgress {
  row: number;
  note: number;
  played: number;
  complete: boolean;
}

export const startSong = (): SongProgress => ({ row: 0, note: 0, played: 0, complete: false });

/** Incorrect notes are free to explore; only the next matching key advances the song. */
export function playNote(song: Song, state: SongProgress, key: NoteId): SongProgress {
  if (state.complete || song.rows[state.row]?.[state.note]?.key !== key) return state;
  const played = state.played + 1;
  if (state.note + 1 < song.rows[state.row]!.length)
    return { ...state, note: state.note + 1, played };
  if (state.row + 1 < song.rows.length)
    return { row: state.row + 1, note: 0, played, complete: false };
  return { ...state, note: state.note + 1, played, complete: true };
}

export const noteFrequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
