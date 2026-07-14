import { describe, expect, it } from 'vitest';
import type { KeyValueStorage } from '../core/Preferences';
import { ProgressStore } from './ProgressStore';

describe('ProgressStore', () => {
  it('unlocks and persists a badge without points or counters', () => {
    const values = new Map<string, string>();
    const storage: KeyValueStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
    const progress = new ProgressStore(storage);
    progress.unlock('ceres');
    expect(progress.isUnlocked('ceres')).toBe(true);
    expect(new ProgressStore(storage).isUnlocked('ceres')).toBe(true);
    expect(progress.isUnlocked('pluto')).toBe(false);
  });

  it('unlocks Pluto without removing existing Ceres progress', () => {
    const values = new Map<string, string>();
    const storage: KeyValueStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
    const progress = new ProgressStore(storage);
    progress.unlock('ceres');
    progress.unlock('pluto');
    const restored = new ProgressStore(storage);
    expect(restored.isUnlocked('ceres')).toBe(true);
    expect(restored.isUnlocked('pluto')).toBe(true);
  });

  it('unlocks Haumea while preserving Ceres and Pluto badges', () => {
    const values = new Map<string, string>();
    const storage: KeyValueStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
    const progress = new ProgressStore(storage);
    progress.unlock('ceres');
    progress.unlock('pluto');
    progress.unlock('haumea');
    const restored = new ProgressStore(storage);
    expect(restored.isUnlocked('ceres')).toBe(true);
    expect(restored.isUnlocked('pluto')).toBe(true);
    expect(restored.isUnlocked('haumea')).toBe(true);
  });

  it('unlocks Makemake while preserving all earlier badges', () => {
    const values = new Map<string, string>();
    const storage: KeyValueStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
    const progress = new ProgressStore(storage);
    for (const planet of ['ceres', 'pluto', 'haumea', 'makemake'] as const) progress.unlock(planet);
    const restored = new ProgressStore(storage);
    expect(restored.isUnlocked('ceres')).toBe(true);
    expect(restored.isUnlocked('pluto')).toBe(true);
    expect(restored.isUnlocked('haumea')).toBe(true);
    expect(restored.isUnlocked('makemake')).toBe(true);
  });

  it('detects all five badges only after Eris unlocks', () => {
    const values = new Map<string, string>();
    const storage: KeyValueStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
    const progress = new ProgressStore(storage);
    for (const planet of ['ceres', 'pluto', 'haumea', 'makemake'] as const) progress.unlock(planet);
    expect(progress.areAllUnlocked()).toBe(false);
    progress.unlock('eris');
    expect(progress.areAllUnlocked()).toBe(true);
  });

  it('resets progress locally', () => {
    const values = new Map<string, string>();
    const storage: KeyValueStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
    const progress = new ProgressStore(storage);
    progress.unlock('ceres');
    progress.unlock('eris');
    progress.reset();
    expect(progress.unlockedIds).toEqual([]);
    expect(new ProgressStore(storage).unlockedIds).toEqual([]);
  });

  it('uses safe defaults for malformed data and migrates object-shaped saved data', () => {
    const malformed: KeyValueStorage = { getItem: () => '{bad json', setItem: () => undefined };
    expect(new ProgressStore(malformed).unlockedIds).toEqual([]);
    const migrated: KeyValueStorage = {
      getItem: () => JSON.stringify({ unlocked: ['ceres', 'pluto', 'unknown'] }),
      setItem: () => undefined,
    };
    expect(new ProgressStore(migrated).unlockedIds).toEqual(['ceres', 'pluto']);
  });
});
