/** Use an installed English voice, keeping speech local and honoring saved mute preferences. */
export class LetterSpeech {
  private readonly listeners = new AbortController();
  private voice: SpeechSynthesisVoice | undefined;
  private naming = false;
  private lastSound = -Infinity;
  private generation = 0;
  private pendingName: string | undefined;

  constructor(private readonly muted: () => boolean) {
    if (!('speechSynthesis' in window)) return;
    this.findVoice();
    window.speechSynthesis.addEventListener('voiceschanged', this.findVoice, {
      signal: this.listeners.signal,
    });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.stop();
      },
      { signal: this.listeners.signal },
    );
    window.addEventListener(
      'preferenceschange',
      () => {
        if (this.muted()) this.stop();
      },
      { signal: this.listeners.signal },
    );
  }

  get available(): boolean {
    return Boolean(this.voice);
  }

  name(text: string): void {
    this.stop();
    this.findVoice();
    if (!this.voice && !this.muted() && !document.hidden) this.pendingName = text;
    if (!this.canSpeak()) return;
    const generation = this.generation;
    const utterance = this.utterance(text);
    this.naming = true;
    const finish = (): void => {
      if (generation === this.generation) this.naming = false;
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  }

  sound(text: string, time: number): void {
    if (
      !this.canSpeak() ||
      this.naming ||
      time - this.lastSound < 1200 ||
      window.speechSynthesis.speaking
    )
      return;
    this.lastSound = time;
    window.speechSynthesis.speak(this.utterance(text));
  }

  stopSound(): void {
    if (!this.naming) this.stop();
  }

  stop(): void {
    this.generation++;
    this.pendingName = undefined;
    this.naming = false;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  destroy(): void {
    this.listeners.abort();
    this.stop();
  }

  private findVoice = (): void => {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis
      .getVoices()
      .filter((voice) => voice.localService && /^en\b/i.test(voice.lang));
    this.voice = voices.find((voice) => voice.lang === 'en-US') ?? voices[0];
    if (this.voice && this.pendingName) {
      const pending = this.pendingName;
      this.pendingName = undefined;
      this.name(pending);
    }
  };

  private canSpeak(): boolean {
    return !this.muted() && !document.hidden && Boolean(this.voice);
  }

  private utterance(text: string): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice ?? null;
    utterance.lang = this.voice?.lang ?? 'en-US';
    utterance.rate = 0.8;
    return utterance;
  }
}
