export interface PreferencesValue {
  muted: boolean;
  reducedMotion: boolean;
}

const KEY = 'little-games-preferences-v1';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class Preferences {
  private value: PreferencesValue;

  constructor(
    private readonly storage: KeyValueStorage = localStorage,
    systemReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  ) {
    try {
      const saved = JSON.parse(this.storage.getItem(KEY) ?? '{}') as Partial<PreferencesValue>;
      this.value = {
        muted: saved.muted ?? false,
        reducedMotion: saved.reducedMotion ?? systemReduced,
      };
    } catch {
      this.value = { muted: false, reducedMotion: systemReduced };
    }
  }

  get current(): Readonly<PreferencesValue> {
    return this.value;
  }

  toggleMute(): void {
    this.update({ muted: !this.value.muted });
  }

  toggleReducedMotion(): void {
    this.update({ reducedMotion: !this.value.reducedMotion });
  }

  private update(next: Partial<PreferencesValue>): void {
    this.value = { ...this.value, ...next };
    this.storage.setItem(KEY, JSON.stringify(this.value));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('preferenceschange'));
  }
}
