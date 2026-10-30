import { describe, expect, it } from 'vitest';
import { Painting, SAMPLE_SIZE } from './rules';
import { CATEGORIES, COLORS, PICTURES, thumbnail } from './art';
import { PLANETS } from '../../data/planets';

const segment = (x1: number, y1: number, x2 = x1, y2 = y1) => ({
  from: { x: x1, y: y1 },
  to: { x: x2, y: y2 },
});

describe('number-matched brush coverage', () => {
  it('leaves a mismatching section and the background untouched', () => {
    const painting = new Painting(new Int16Array([0, 1, -1, 0]), 4, [1, 2], 10);
    painting.stroke(segment(0, 5, 40, 5), 1, 8);
    expect([...painting.painted]).toEqual([1, 0, 0, 1]);
    expect([...painting.complete]).toEqual([0]);
  });
  it('colors only the dragged area rather than flooding a section on tap', () => {
    const painting = new Painting(new Int16Array(100).fill(0), 10, [2], 10);
    painting.stroke(segment(5, 5), 2, 6);
    expect(painting.counts[0]).toBe(1);
    expect(painting.complete.size).toBe(0);
  });
  it('connects fast movements continuously across matching sections', () => {
    const painting = new Painting(new Int16Array([0, 0, 1, 1, 2, 2]), 6, [3, 1, 3], 10);
    painting.stroke(segment(0, 5, 60, 5), 3, 6);
    expect([...painting.painted]).toEqual([1, 1, 0, 0, 1, 1]);
    expect(painting.progress).toBeCloseTo(2 / 3);
  });
  it('finishes once at 88% coverage, allowing a small boundary margin', () => {
    const painting = new Painting(new Int16Array(100).fill(0), 10, [1], 10);
    for (let y = 5; y <= 85; y += 10) painting.stroke(segment(5, y, 95, y), 1, 5);
    expect(painting.complete.has(0)).toBe(true);
    expect(painting.progress).toBe(1);
    expect(painting.stroke(segment(0, 0, 100, 100), 1, 100)).toEqual([]);
  });
  it('ignores fully hidden sections and invalid coordinates', () => {
    const painting = new Painting(new Int16Array([1]), 1, [1, 2], 10);
    expect(painting.visibleRegions).toEqual([1]);
    expect(painting.stroke(segment(NaN, 5), 2, 6)).toEqual([]);
    expect(painting.stroke(segment(5, 5), 2, -1)).toEqual([]);
    painting.stroke(segment(5, 5), 2, 6);
    expect(painting.progress).toBe(1);
  });
});

describe('original picture catalogue', () => {
  it('includes all requested pictures and an animal collection', () => {
    expect(PICTURES).toHaveLength(33);
    expect(new Set(PICTURES.map((p) => p.id)).size).toBe(33);
    expect(CATEGORIES.map((c) => PICTURES.filter((p) => p.category === c.id).length)).toEqual([
      14, 8, 6, 5,
    ]);
    expect(PICTURES.filter((p) => p.category === 'space').map((p) => p.id)).toEqual([
      'solar-system',
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      ...PLANETS.map((planet) => planet.id),
    ]);
  });
  it('gives every picture local closed geometry and valid numbered colors', () => {
    for (const p of PICTURES) {
      expect(p.width).toBeGreaterThan(0);
      expect(p.width % SAMPLE_SIZE).toBe(0);
      expect(p.height).toBeGreaterThan(0);
      expect(p.regions.length).toBeGreaterThan(3);
      for (const region of p.regions) {
        expect(region.path).toMatch(/^M .+ Z$/);
        expect(region.color).toBeGreaterThan(0);
        expect(region.color).toBeLessThanOrEqual(COLORS.length);
        expect(Number.isFinite(region.x) && Number.isFinite(region.y)).toBe(true);
      }
    }
  });
  it('fits the wide Solar System bodies and labels without clipping or overlaps', () => {
    const p = PICTURES.find((entry) => entry.id === 'solar-system')!;
    const bodies = p.regions.slice(0, 9).map((region) => {
      const [, left, y, radius] = region.path.match(/^M ([\d.]+) ([\d.]+) a ([\d.]+)/)!;
      return { x: Number(left) + Number(radius), y: Number(y), radius: Number(radius) };
    });
    expect(bodies).toHaveLength(9);
    for (const [index, body] of bodies.entries()) {
      expect(body.x - body.radius).toBeGreaterThan(3);
      expect(body.x + body.radius).toBeLessThan(p.width - 3);
      expect(body.y - body.radius).toBeGreaterThan(3);
      expect(body.y + body.radius).toBeLessThan(p.height - 3);
      for (const other of bodies.slice(index + 1))
        expect(Math.hypot(body.x - other.x, body.y - other.y)).toBeGreaterThan(
          body.radius + other.radius + 8,
        );
    }
    const labels = [...p.details.join('').matchAll(/<text x="(\d+)" y="(\d+)">([^<]+)<\/text>/g)];
    expect(labels).toHaveLength(9);
    for (const [, x, y, name] of labels) {
      // Conservative text bounds include the label's outline and room for wide letters.
      const halfWidth = name!.length * 8;
      const left = Number(x) - halfWidth;
      const right = Number(x) + halfWidth;
      const top = Number(y) - 24;
      const bottom = Number(y) + 6;
      expect(left).toBeGreaterThan(0);
      expect(right).toBeLessThan(p.width);
      expect(bottom).toBeLessThan(p.height);
      for (const body of bodies) {
        const nearX = Math.max(left, Math.min(body.x, right));
        const nearY = Math.max(top, Math.min(body.y, bottom));
        expect(Math.hypot(body.x - nearX, body.y - nearY)).toBeGreaterThan(body.radius + 3);
      }
    }
    expect(thumbnail(p)).toContain(`viewBox="0 0 ${p.width} ${p.height}"`);
  });
});
