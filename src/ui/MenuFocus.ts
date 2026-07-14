export class MenuFocus {
  private index = 0;

  constructor(private readonly count: number) {
    if (count < 1) throw new Error('Menu focus requires at least one item.');
  }

  get current(): number {
    return this.index;
  }
  set(value: number): void {
    this.index = Math.max(0, Math.min(this.count - 1, value));
  }
  next(): void {
    this.index = (this.index + 1) % this.count;
  }
  previous(): void {
    this.index = (this.index - 1 + this.count) % this.count;
  }
}
