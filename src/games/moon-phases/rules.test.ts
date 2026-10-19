import { describe, expect, it } from 'vitest';
import { moonLightPath } from './art';
import { createMoonPuzzle, MOON_PHASES, moonSlot, moonSlotAtPoint, placeMoonPhase } from './rules';

describe('Moon Phases Puzzle', () => {
  it('provides eight phases in lunar cycle order, with unique ids and names', () => {
    expect(MOON_PHASES.map(({ id }) => id)).toEqual([
      'new',
      'waxing-crescent',
      'first-quarter',
      'waxing-gibbous',
      'full',
      'waning-gibbous',
      'last-quarter',
      'waning-crescent',
    ]);
    expect(new Set(MOON_PHASES.map(({ name }) => name)).size).toBe(8);
  });

  it('shuffles a complete set and starts a fresh puzzle on replay', () => {
    const first = createMoonPuzzle(() => 0);
    const second = createMoonPuzzle(() => 0.99);
    expect(first.order).not.toEqual(second.order);
    expect([...first.order].sort()).toEqual(MOON_PHASES.map(({ id }) => id).sort());
    expect(first.current).toBe(first.order[0]);
    expect(first.placed).toEqual([]);
    expect(first.complete).toBe(false);
  });

  it('returns wrong, outside, stale, and invalid drops without losing any progress', () => {
    const initial = createMoonPuzzle(() => 0);
    const puzzle = placeMoonPhase(initial, initial.current!, initial.current).puzzle;
    for (const [piece, slot] of [
      [puzzle.current, initial.current],
      [puzzle.current, undefined],
      [initial.current, initial.current],
      ['unknown', 'unknown'],
    ]) {
      const result = placeMoonPhase(puzzle, piece!, slot);
      expect(result.correct).toBe(false);
      expect(result.puzzle).toBe(puzzle);
    }
    expect(initial.placed).toHaveLength(0);
  });

  it('snaps each phase once, completes only after all eight, and resets for replay', () => {
    let puzzle = createMoonPuzzle(() => 0.5);
    for (let count = 1; count <= 8; count++) {
      const id = puzzle.current!;
      const result = placeMoonPhase(puzzle, id, id);
      expect(result.correct).toBe(true);
      expect(puzzle.placed).toHaveLength(count - 1);
      puzzle = result.puzzle;
      expect(puzzle.placed).toHaveLength(count);
      expect(puzzle.complete).toBe(count === 8);
      expect(placeMoonPhase(puzzle, id, id).correct).toBe(false);
    }
    expect(puzzle.current).toBeUndefined();
    expect(new Set(puzzle.placed).size).toBe(8);
    expect(createMoonPuzzle().placed).toEqual([]);
  });

  it('matches every slot and accepts nearby drops without overlapping neighbors', () => {
    MOON_PHASES.forEach(({ id }, index) => {
      const slot = moonSlot(index);
      expect(moonSlotAtPoint(slot)).toBe(id);
      expect(moonSlotAtPoint({ x: slot.x + 92, y: slot.y }, 20)).toBe(id);
      const next = moonSlot((index + 1) % 8);
      expect(
        moonSlotAtPoint({ x: (slot.x + next.x) / 2, y: (slot.y + next.y) / 2 }, 1000),
      ).toBeUndefined();
    });
    expect(moonSlotAtPoint({ x: -200, y: 10 })).toBeUndefined();
    expect(moonSlotAtPoint({ x: 600, y: 450 }, 1000)).toBeUndefined();
    expect(moonSlotAtPoint({ x: NaN, y: 10 })).toBeUndefined();
    expect(moonSlotAtPoint({ x: 125, y: 120 }, Infinity)).toBeUndefined();
  });

  it('matches the reference orientation around Earth with no overlapping drop regions', () => {
    expect(moonSlot(0).x).toBeCloseTo(310);
    expect(moonSlot(0).y).toBeCloseTo(450);
    expect(moonSlot(2).y).toBeCloseTo(740);
    expect(moonSlot(4).x).toBeCloseTo(890);
    expect(moonSlot(6).y).toBeCloseTo(160);
    for (let i = 0; i < 8; i++) {
      const a = moonSlot(i);
      expect(Math.hypot(a.x - 600, a.y - 450)).toBeCloseTo(290);
      for (let j = i + 1; j < 8; j++) {
        const b = moonSlot(j);
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(196);
      }
    }
  });

  it('draws growing right-hand phases and shrinking left-hand phases with correct lit areas', () => {
    expect(moonLightPath('new')).toBe('');
    const areaAndCenter = (id: (typeof MOON_PHASES)[number]['id']) => {
      const points = [...moonLightPath(id).matchAll(/(-?\d+\.\d+),(-?\d+\.\d+)/g)].map((match) => ({
        x: Number(match[1]),
        y: Number(match[2]),
      }));
      let area = 0;
      let center = 0;
      points.forEach((p, index) => {
        const next = points[(index + 1) % points.length]!;
        const cross = p.x * next.y - next.x * p.y;
        area += cross;
        center += (p.x + next.x) * cross;
      });
      return { fraction: Math.abs(area / 2) / (Math.PI * 42 ** 2), x: center / (3 * area) };
    };
    MOON_PHASES.slice(1).forEach(({ id }, index) => {
      const result = areaAndCenter(id);
      expect(result.fraction).toBeCloseTo((1 - Math.cos(((index + 1) * Math.PI) / 4)) / 2, 2);
      if (index < 3) expect(result.x).toBeGreaterThan(0);
      if (index > 3) expect(result.x).toBeLessThan(0);
    });
  });
});
