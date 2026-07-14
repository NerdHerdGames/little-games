import { describe, expect, it } from 'vitest';
import { Preferences, type KeyValueStorage } from './Preferences';

const memoryStorage = (): KeyValueStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};

describe('Preferences', () => {
  it('persists mute and reduced-motion choices', () => {
    const storage = memoryStorage();
    const first = new Preferences(storage, false);
    first.toggleMute();
    first.toggleReducedMotion();
    expect(new Preferences(storage, false).current).toEqual({ muted: true, reducedMotion: true });
  });

  it('uses the system motion preference when no setting exists', () => {
    expect(new Preferences(memoryStorage(), true).current.reducedMotion).toBe(true);
  });
});
