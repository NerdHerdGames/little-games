import type { Piece, Point } from './types';
import { clamp } from './types';
import { transform } from './connections';
import { getDefinition } from './registry';
export class CameraController {
  x = 470;
  y = 350;
  zoom = 1;
  width = 1000;
  height = 680;
  world(point: Point): Point {
    return {
      x: (point.x - this.width / 2) / this.zoom + this.x,
      y: (point.y - this.height / 2) / this.zoom + this.y,
    };
  }
  screen(point: Point): Point {
    return {
      x: (point.x - this.x) * this.zoom + this.width / 2,
      y: (point.y - this.y) * this.zoom + this.height / 2,
    };
  }
  pan(dx: number, dy: number): void {
    this.x = clamp(this.x - dx / this.zoom, -5500, 5500);
    this.y = clamp(this.y - dy / this.zoom, -5500, 5500);
  }
  zoomAt(amount: number, point: Point = { x: this.width / 2, y: this.height / 2 }): void {
    const before = this.world(point);
    this.zoom = clamp(this.zoom * Math.exp(amount), 0.2, 2.5);
    const after = this.world(point);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
  }
  fit(pieces: readonly Piece[]): void {
    const points = pieces.flatMap((p) => [
      ...getDefinition(p.type)
        .paths.flat()
        .map((v) => transform(v, p)),
      { x: p.x - 65, y: p.y - 90 },
      { x: p.x + 65, y: p.y + 90 },
    ]);
    if (!points.length) {
      this.x = 470;
      this.y = 350;
      this.zoom = Math.min(this.width / 1000, this.height / 680);
      return;
    }
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y),
      x0 = Math.min(...xs),
      x1 = Math.max(...xs),
      y0 = Math.min(...ys),
      y1 = Math.max(...ys);
    this.x = (x0 + x1) / 2;
    this.y = (y0 + y1) / 2;
    this.zoom = clamp(
      Math.min(this.width / (x1 - x0 + 100), this.height / (y1 - y0 + 100)),
      0.2,
      1.5,
    );
  }
}
