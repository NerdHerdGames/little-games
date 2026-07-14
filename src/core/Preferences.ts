export interface PreferencesValue {
  muted: boolean;
  reducedMotion: boolean;
}

const KEY = 'little-games-preferences-v1';

export class Preferences {
  private value: PreferencesValue;

  constructor() {
    const systemReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<PreferencesValue>;
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
    localStorage.setItem(KEY, JSON.stringify(this.value));
    window.dispatchEvent(new CustomEvent('preferenceschange'));
  }
}
