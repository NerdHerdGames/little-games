import type { KeyValueStorage } from '../core/Preferences';

export const PLANET_IDS = ['ceres', 'pluto', 'haumea', 'makemake', 'eris'] as const;
export type PlanetId = (typeof PLANET_IDS)[number];
const KEY = 'dwarf-planet-progress-v1';

export class ProgressStore {
  private unlocked: Set<PlanetId>;

  constructor(private readonly storage: KeyValueStorage = localStorage) {
    try {
      const saved = JSON.parse(storage.getItem(KEY) ?? '[]') as unknown;
      const values = Array.isArray(saved) ? saved : isProgressObject(saved) ? saved.unlocked : [];
      this.unlocked = new Set(values.filter(isPlanetId));
    } catch {
      this.unlocked = new Set();
    }
  }

  unlock(id: PlanetId): void {
    this.unlocked.add(id);
    this.storage.setItem(KEY, JSON.stringify([...this.unlocked]));
  }

  isUnlocked(id: PlanetId): boolean {
    return this.unlocked.has(id);
  }

  areAllUnlocked(): boolean {
    return PLANET_IDS.every((id) => this.unlocked.has(id));
  }

  get unlockedIds(): readonly PlanetId[] {
    return PLANET_IDS.filter((id) => this.unlocked.has(id));
  }

  reset(): void {
    this.unlocked.clear();
    this.storage.setItem(KEY, '[]');
  }
}

const isPlanetId = (value: unknown): value is PlanetId =>
  typeof value === 'string' && (PLANET_IDS as readonly string[]).includes(value);

const isProgressObject = (value: unknown): value is { unlocked: unknown[] } =>
  typeof value === 'object' &&
  value !== null &&
  'unlocked' in value &&
  Array.isArray(value.unlocked);
