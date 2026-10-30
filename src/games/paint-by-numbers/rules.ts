export interface PaintPoint {
  x: number;
  y: number;
}
export interface PaintSegment {
  from: PaintPoint;
  to: PaintPoint;
}
export const SAMPLE_SIZE = 8;
export const DEFAULT_BRUSH_RADIUS = 30;

/** Coverage is computed from visible section samples, independent of canvas or input devices. */
export class Painting {
  readonly painted: Uint8Array;
  readonly totals: number[];
  readonly counts: number[];
  readonly complete = new Set<number>();
  constructor(
    readonly owners: Int16Array,
    readonly columns: number,
    readonly colors: readonly number[],
    readonly sampleSize = SAMPLE_SIZE,
  ) {
    this.painted = new Uint8Array(owners.length);
    this.totals = colors.map(() => 0);
    this.counts = colors.map(() => 0);
    for (const owner of owners) if (owner >= 0) this.totals[owner]!++;
  }

  get visibleRegions(): number[] {
    return this.totals.flatMap((total, id) => (total > 0 ? [id] : []));
  }
  get progress(): number {
    const visible = this.visibleRegions;
    return visible.length ? this.complete.size / visible.length : 1;
  }

  stroke(segment: PaintSegment, color: number, radius: number): number[] {
    if (
      ![segment.from.x, segment.from.y, segment.to.x, segment.to.y, radius].every(
        Number.isFinite,
      ) ||
      radius <= 0
    )
      return [];
    const { from, to } = segment;
    const minX = Math.max(0, Math.floor((Math.min(from.x, to.x) - radius) / this.sampleSize));
    const maxX = Math.min(
      this.columns - 1,
      Math.floor((Math.max(from.x, to.x) + radius) / this.sampleSize),
    );
    const rows = Math.ceil(this.owners.length / this.columns);
    const minY = Math.max(0, Math.floor((Math.min(from.y, to.y) - radius) / this.sampleSize));
    const maxY = Math.min(
      rows - 1,
      Math.floor((Math.max(from.y, to.y) + radius) / this.sampleSize),
    );
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthSquared = dx * dx + dy * dy;
    const touched = new Set<number>();
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const index = y * this.columns + x;
        const owner = this.owners[index]!;
        if (
          owner < 0 ||
          this.colors[owner] !== color ||
          this.painted[index] ||
          this.complete.has(owner)
        )
          continue;
        const px = (x + 0.5) * this.sampleSize;
        const py = (y + 0.5) * this.sampleSize;
        const t = lengthSquared
          ? Math.max(0, Math.min(1, ((px - from.x) * dx + (py - from.y) * dy) / lengthSquared))
          : 0;
        if (Math.hypot(px - from.x - t * dx, py - from.y - t * dy) > radius) continue;
        this.painted[index] = 1;
        this.counts[owner]!++;
        touched.add(owner);
      }
    const finished: number[] = [];
    for (const owner of touched) {
      if (this.counts[owner]! / this.totals[owner]! >= 0.88) {
        this.complete.add(owner);
        finished.push(owner);
      }
    }
    return finished;
  }
}
