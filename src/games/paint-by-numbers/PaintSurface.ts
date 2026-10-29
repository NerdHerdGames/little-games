import { ART_HEIGHT, ART_WIDTH, COLORS, type Picture } from './art';
import { Painting, SAMPLE_SIZE, type PaintSegment } from './rules';

function surface(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ART_WIDTH;
  canvas.height = ART_HEIGHT;
  return canvas;
}
function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('A 2D drawing surface is unavailable.');
  return ctx;
}

/** Local vector geometry creates both precise visible ownership masks and the line art. */
export class PaintSurface {
  readonly painting: Painting;
  private readonly ink = surface();
  private readonly outlines = surface();
  private readonly scratch = surface();
  private readonly mask = surface();
  private readonly ownerPixels: Uint8ClampedArray;
  private maskKey = '';
  private readonly labels: { x: number; y: number }[];
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly picture: Picture,
  ) {
    const hit = surface();
    const hitCtx = context(hit);
    const outline = context(this.outlines);
    picture.regions.forEach((region, id) => {
      const path = new Path2D(region.path);
      hitCtx.fillStyle = `rgb(${id + 1},0,0)`;
      hitCtx.fill(path);
      outline.globalCompositeOperation = 'destination-out';
      outline.fill(path);
      outline.globalCompositeOperation = 'source-over';
      outline.strokeStyle = '#344757';
      outline.lineWidth = 3;
      outline.lineJoin = 'round';
      outline.stroke(path);
    });
    this.ownerPixels = hitCtx.getImageData(0, 0, ART_WIDTH, ART_HEIGHT).data;
    const columns = ART_WIDTH / SAMPLE_SIZE;
    const rows = Math.ceil(ART_HEIGHT / SAMPLE_SIZE);
    const owners = new Int16Array(columns * rows).fill(-1);
    const candidates: { x: number; y: number }[][] = picture.regions.map(() => []);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < columns; x++) {
        const px = (x + 0.5) * SAMPLE_SIZE;
        const py = (y + 0.5) * SAMPLE_SIZE;
        const offset = (Math.floor(py) * ART_WIDTH + Math.floor(px)) * 4;
        const owner = this.ownerPixels[offset + 3] === 255 ? this.ownerPixels[offset]! - 1 : -1;
        if (owner >= 0 && owner < picture.regions.length) {
          owners[y * columns + x] = owner;
          candidates[owner]!.push({ x: px, y: py });
        }
      }
    this.painting = new Painting(
      owners,
      columns,
      picture.regions.map((r) => r.color),
    );
    this.labels = picture.regions.map((region, id) => {
      // Keep labels inside the exposed part of overlapping sections, away from edges.
      let best = { x: region.x, y: region.y };
      let score = Infinity;
      for (const point of candidates[id]!) {
        const gx = Math.floor(point.x / SAMPLE_SIZE);
        const gy = Math.floor(point.y / SAMPLE_SIZE);
        const inset = [
          [-2, 0],
          [2, 0],
          [0, -2],
          [0, 2],
        ].every(([dx, dy]) => {
          const x = gx + dx!;
          const y = gy + dy!;
          return x >= 0 && x < columns && y >= 0 && y < rows && owners[y * columns + x] === id;
        });
        const distance = Math.hypot(point.x - region.x, point.y - region.y) + (inset ? 0 : 2000);
        if (distance < score) {
          score = distance;
          best = point;
        }
      }
      return best;
    });
    this.draw();
  }

  private makeMask(key: string, matches: (owner: number) => boolean): void {
    if (this.maskKey === key) return;
    const ctx = context(this.mask);
    const pixels = ctx.createImageData(ART_WIDTH, ART_HEIGHT);
    for (let i = 0; i < this.ownerPixels.length; i += 4) {
      if (this.ownerPixels[i + 3]! > 0 && matches(this.ownerPixels[i]! - 1))
        pixels.data[i + 3] = this.ownerPixels[i + 3]!;
    }
    ctx.putImageData(pixels, 0, 0);
    this.maskKey = key;
  }

  stroke(segment: PaintSegment, color: number, radius: number): number[] {
    const finished = this.painting.stroke(segment, color, radius);
    this.makeMask(`color-${color}`, (owner) => this.picture.regions[owner]?.color === color);
    const scratch = context(this.scratch);
    scratch.clearRect(0, 0, ART_WIDTH, ART_HEIGHT);
    scratch.globalCompositeOperation = 'source-over';
    scratch.strokeStyle = COLORS[color - 1]!.hex;
    scratch.fillStyle = COLORS[color - 1]!.hex;
    scratch.lineWidth = radius * 2;
    scratch.lineCap = 'round';
    scratch.beginPath();
    scratch.moveTo(segment.from.x, segment.from.y);
    scratch.lineTo(segment.to.x, segment.to.y);
    scratch.stroke();
    scratch.beginPath();
    scratch.arc(segment.to.x, segment.to.y, radius, 0, Math.PI * 2);
    scratch.fill();
    scratch.globalCompositeOperation = 'destination-in';
    scratch.drawImage(this.mask, 0, 0);
    context(this.ink).drawImage(this.scratch, 0, 0);
    for (const id of finished) {
      this.makeMask(`region-${id}`, (owner) => owner === id);
      scratch.globalCompositeOperation = 'source-over';
      scratch.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
      scratch.globalCompositeOperation = 'destination-in';
      scratch.drawImage(this.mask, 0, 0);
      context(this.ink).drawImage(this.scratch, 0, 0);
    }
    return finished;
  }

  draw(): void {
    const ctx = context(this.canvas);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
    ctx.drawImage(this.ink, 0, 0);
    ctx.drawImage(this.outlines, 0, 0);
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const id of this.painting.visibleRegions) {
      if (this.painting.complete.has(id)) continue;
      const { x, y } = this.labels[id]!;
      ctx.fillStyle = '#ffffffed';
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#344757';
      ctx.fillText(String(this.picture.regions[id]!.color), x, y + 1);
    }
  }
}
