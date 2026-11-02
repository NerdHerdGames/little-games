type PlaySound = (context: AudioContext) => void;

/** Browser audio activation and recovery only; gameplay continues to use logical actions. */
export class AudioSession {
  private context: AudioContext | undefined;
  private readonly listeners = new AbortController();
  private pending: { play: PlaySound; time: number }[] = [];
  private resuming: Promise<void> | undefined;
  private rebuild = false;
  private destroyed = false;
  private retriedByGesture = false;

  constructor(
    root: EventTarget,
    private readonly muted: () => boolean,
    private readonly initialize: (context: AudioContext) => void = () => {},
    private readonly stopVoices: () => void = () => {},
  ) {
    const options = { capture: true, signal: this.listeners.signal };
    const gesture = (event: Event): void => {
      this.retriedByGesture = false;
      if (
        event.type === 'click' &&
        (event.target as Element | null)?.closest?.('[data-action="sound-retry"]')
      ) {
        this.reset();
        this.retriedByGesture = true;
      }
      this.unlock();
    };
    // Touch activation can be granted at release rather than pointerdown.
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'click'])
      root.addEventListener(type, gesture, options);
    window.addEventListener('keydown', gesture, options);
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.silence();
        else this.wake();
      },
      { signal: this.listeners.signal },
    );
    window.addEventListener('pagehide', () => this.silence(), options);
    window.addEventListener('pageshow', () => this.wake(), options);
    window.addEventListener('focus', () => this.wake(), options);
    window.addEventListener(
      'preferenceschange',
      () => {
        if (this.muted()) this.silence();
        else this.wake();
      },
      options,
    );
  }

  private get allowed(): boolean {
    return !this.destroyed && !this.muted() && !document.hidden;
  }

  private unlock(): void {
    if (!this.allowed) return;
    if (this.rebuild || this.context?.state === 'closed') this.reset();
    if (!this.context) {
      const Context =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      try {
        const context = new Context({ latencyHint: 'interactive' });
        this.context = context;
        this.initialize(context);
        context.addEventListener(
          'statechange',
          () => {
            if (context !== this.context) return;
            if (context.state === 'running') this.flush(context);
            else this.stopVoices();
          },
          { signal: this.listeners.signal },
        );
      } catch {
        this.reset();
        return;
      }
    }
    // Retry inside every real gesture, even if a previous resume is still pending.
    if (this.context.state !== 'running') this.resume(this.context, true);
  }

  private wake(): void {
    if (this.allowed && this.context && this.context.state !== 'closed')
      // Also enqueue after an in-flight suspend when returning quickly to the page.
      this.resume(this.context, true);
  }

  private resume(context: AudioContext, force = false): void {
    if (this.resuming && !force) return;
    try {
      const attempt = context
        .resume()
        .then(() => this.flush(context))
        .catch(() => {
          if (context === this.context && context.state !== 'running') {
            this.rebuild = true;
            this.pending = [];
          }
        })
        .finally(() => {
          if (this.resuming === attempt) this.resuming = undefined;
        });
      this.resuming = attempt;
    } catch {
      this.rebuild = true;
      this.pending = [];
    }
  }

  private flush(context: AudioContext): void {
    if (context !== this.context || !this.allowed || context.state !== 'running') return;
    const pending = this.pending;
    this.pending = [];
    // Preserve a first tap during startup without replaying an old tune after an interruption.
    for (const sound of pending) if (performance.now() - sound.time < 250) sound.play(context);
  }

  play(play: PlaySound): void {
    if (!this.allowed || !this.context || this.context.state === 'closed') return;
    if (this.context.state === 'running') play(this.context);
    else {
      this.pending.push({ play, time: performance.now() });
      if (this.pending.length > 24) this.pending.shift();
      this.resume(this.context);
    }
  }

  /** The touch/click listener recreates the context while browser activation is available. */
  retry(): void {
    if (this.retriedByGesture) {
      this.retriedByGesture = false;
      return;
    }
    this.reset();
    this.unlock();
  }

  silence(): void {
    this.pending = [];
    this.stopVoices();
    if (this.context && this.context.state !== 'closed')
      void this.context.suspend().catch(() => {});
  }

  private reset(): void {
    this.pending = [];
    this.resuming = undefined;
    this.stopVoices();
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
    this.context = undefined;
    this.rebuild = false;
  }

  destroy(): void {
    this.destroyed = true;
    this.listeners.abort();
    this.reset();
  }
}
