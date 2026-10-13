import { describe, expect, it } from 'vitest';
import { PLANET_SPRITES } from '../../data/planetSprites';
import {
  createRocket,
  cyclePart,
  DESTINATIONS,
  getRocketStats,
  PART_SLOTS,
  planFlight,
  ROCKET_PARTS,
  sampleFlight,
} from './rules';

const mars = DESTINATIONS.find(({ id }) => id === 'mars')!;

describe('rocket workshop rules', () => {
  it('wraps piece choices in both directions without changing the original build', () => {
    const build = createRocket();
    for (const slot of PART_SLOTS) {
      let next = build;
      for (let count = 0; count < ROCKET_PARTS[slot].length; count += 1) {
        next = cyclePart(next, slot, 1);
      }
      expect(next).toEqual(build);
      expect(cyclePart(cyclePart(build, slot, -1), slot, 1)).toEqual(build);
    }
    expect(build).toEqual({ nose: 0, cabin: 1, fins: 0, engine: 0 });
  });

  it('offers all eight planets and five dwarf planets using the existing art', () => {
    expect(DESTINATIONS).toHaveLength(13);
    expect(new Set(DESTINATIONS.map(({ id }) => id)).size).toBe(13);
    for (const destination of DESTINATIONS) {
      expect(destination.spritePath).toBe(PLANET_SPRITES[destination.id].path);
    }
  });

  it('gives each piece a different physical effect', () => {
    for (const slot of PART_SLOTS) {
      const stats = ROCKET_PARTS[slot].map((_part, index) =>
        JSON.stringify(getRocketStats({ ...createRocket(), [slot]: index })),
      );
      expect(new Set(stats).size).toBe(3);
    }
    const base = createRocket();
    expect(planFlight({ ...base, engine: 2 }, mars).duration).toBeLessThan(
      planFlight({ ...base, engine: 1 }, mars).duration,
    );
    expect(getRocketStats({ ...base, cabin: 2 }).launchSeconds).toBeGreaterThan(
      getRocketStats({ ...base, cabin: 0 }).launchSeconds,
    );
    expect(getRocketStats({ ...base, fins: 1 }).wobble).toBeLessThan(
      getRocketStats({ ...base, fins: 2 }).wobble,
    );
    expect(planFlight(base, DESTINATIONS.at(-1)!).duration).toBeGreaterThan(
      planFlight(base, mars).duration,
    );
  });

  it('accelerates, cruises, slows down, and stops in orbit without progress jumps', () => {
    const plan = planFlight(createRocket(), mars);
    const launchEnd = plan.stats.launchSeconds;
    const cruiseEnd = launchEnd + plan.cruiseSeconds;
    expect(sampleFlight(plan, 0)).toMatchObject({ progress: 0, velocity: 0, phase: 'launch' });
    expect(sampleFlight(plan, launchEnd).phase).toBe('cruise');
    expect(sampleFlight(plan, cruiseEnd).phase).toBe('approach');
    expect(sampleFlight(plan, launchEnd / 2).velocity).toBeLessThan(plan.stats.speed);
    expect(sampleFlight(plan, plan.duration - 1).velocity).toBeLessThan(plan.stats.speed);
    for (const boundary of [launchEnd, cruiseEnd, plan.duration]) {
      expect(
        Math.abs(
          sampleFlight(plan, boundary).progress - sampleFlight(plan, boundary - 0.0001).progress,
        ),
      ).toBeLessThan(0.001);
    }
    expect(sampleFlight(plan, plan.duration + 100)).toEqual({
      phase: 'arrived',
      progress: 1,
      velocity: 0,
      wobble: 0,
    });
  });

  it('keeps every build safe and playable for every destination', () => {
    for (let nose = 0; nose < 3; nose += 1) {
      for (let cabin = 0; cabin < 3; cabin += 1) {
        for (let fins = 0; fins < 3; fins += 1) {
          for (let engine = 0; engine < 3; engine += 1) {
            for (const destination of DESTINATIONS) {
              const plan = planFlight({ nose, cabin, fins, engine }, destination);
              expect(plan.cruiseSeconds).toBeGreaterThan(0);
              expect(plan.duration).toBeGreaterThan(7);
              expect(plan.duration).toBeLessThan(30);
              let progress = 0;
              for (let time = 0; time <= plan.duration; time += 0.5) {
                const sample = sampleFlight(plan, time);
                expect(sample.progress).toBeGreaterThanOrEqual(progress);
                expect(sample.progress).toBeLessThanOrEqual(1);
                expect(sample.velocity).toBeGreaterThanOrEqual(0);
                progress = sample.progress;
              }
              expect(sampleFlight(plan, plan.duration).phase).toBe('arrived');
            }
          }
        }
      }
    }
  });

  it('samples by elapsed time rather than frame count and handles invalid times gently', () => {
    const plan = planFlight(createRocket(), mars);
    const timeAt60fps = Array.from({ length: 300 }).reduce<number>((time) => time + 1 / 60, 0);
    const timeAt30fps = Array.from({ length: 150 }).reduce<number>((time) => time + 1 / 30, 0);
    expect(sampleFlight(plan, timeAt60fps).progress).toBeCloseTo(
      sampleFlight(plan, timeAt30fps).progress,
      10,
    );
    expect(sampleFlight(plan, -20).progress).toBe(0);
    expect(sampleFlight(plan, NaN).progress).toBe(0);
  });
});
