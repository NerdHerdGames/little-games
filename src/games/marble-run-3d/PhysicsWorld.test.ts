import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { initializePhysics, PhysicsWorld } from './PhysicsWorld';
import { TrackPieceFactory } from './TrackPieceFactory';
import { example } from './examples';
import { emptyConstruction } from './ConstructionController3D';
import { alignPiece, createPiece } from './ConnectionSystem3D';
import { definition } from './TrackPieceRegistry';

let physics: PhysicsWorld | undefined;
let factory: TrackPieceFactory | undefined;
beforeAll(async () => {
  await initializePhysics();
});
afterEach(() => {
  physics?.dispose();
  factory?.dispose();
  physics = undefined;
  factory = undefined;
});
function world(index = 0): PhysicsWorld {
  factory = new TrackPieceFactory();
  physics = new PhysicsWorld(example(index), factory);
  return physics;
}
function advance(p: PhysicsWorld, seconds: number): void {
  for (let i = 0; i < seconds * 60; i++) p.advance(1 / 60);
}
describe('real Rapier marble runs', () => {
  it('rolls a marble through a descending track into a finish sensor', () => {
    const state = emptyConstruction();
    let prev = createPiece('dispenser', [0, 4, 0]);
    state.pieces.push(prev);
    for (const type of ['gentle', 'medium', 'finish']) {
      const p = alignPiece(
        createPiece(type),
        definition(type).connectors[0]!,
        prev,
        definition(prev.type).connectors[1]!,
      );
      state.pieces.push(p);
      prev = p;
    }
    factory = new TrackPieceFactory();
    physics = new PhysicsWorld(state, factory);
    physics.release(1);
    advance(physics, 15);
    expect(physics.results).toHaveLength(1);
    expect(physics.marbles[0]!.body.isCcdEnabled()).toBe(true);
  });
  it.each([0, 1, 2, 3])('the %i built-in ride reaches its finish using only physics', (index) => {
    const p = world(index);
    p.release(1);
    advance(p, 35);
    expect(p.results.length).toBeGreaterThanOrEqual(index === 2 ? 2 : 1);
  });
  it('pauses without advancing bodies and resets/reuses pooled marbles', () => {
    const p = world();
    p.release(5);
    advance(p, 3);
    const poolSize = p.marbles.length;
    expect(p.activeCount).toBeGreaterThan(1);
    p.playing = false;
    const before = p.marbles[0]!.body.translation();
    advance(p, 2);
    expect(p.marbles[0]!.body.translation()).toEqual(before);
    p.reset();
    expect(p.activeCount).toBe(0);
    expect(p.results).toHaveLength(0);
    p.release(1);
    advance(p, 0.1);
    expect(p.marbles).toHaveLength(poolSize);
    expect(p.activeCount).toBe(1);
  });
  it('caps continuous releases and keeps the simulation finite', () => {
    const p = world();
    p.continuous = true;
    advance(p, 20);
    expect(p.marbles.length).toBeLessThanOrEqual(40);
    expect(p.activeCount).toBeLessThanOrEqual(40);
    for (const m of p.marbles)
      expect(Object.values(m.body.translation()).every(Number.isFinite)).toBe(true);
  });
  it('pressure-plate links open the physical gate in the chain example', () => {
    const p = world(5);
    const gate = [...p.pieces.values()].find((r) => r.piece.type === 'gate')!;
    expect(gate.enabled).toBe(false);
    p.release(1);
    advance(p, 8);
    expect(gate.enabled).toBe(true);
  });
  it('sorts matching colors into the correct collector', () => {
    const p = world(4);
    p.release(1);
    advance(p, 12);
    expect(p.collected).toBe(1);
    expect(p.sorted).toBe(1);
  });
  it('gives a marble wheel real kinematic paddles and keeps dynamic dominoes on track colliders', () => {
    const state = emptyConstruction();
    const wheel = createPiece('wheel', [0, 3, 0]);
    const domino = createPiece('domino', [4, 3, 0]);
    state.pieces.push(wheel, domino);
    factory = new TrackPieceFactory();
    physics = new PhysicsWorld(state, factory);
    const rotor = physics.pieces.get(wheel.id)!.dynamic!;
    const tile = physics.pieces.get(domino.id)!.dynamic!;
    const initial = rotor.rotation();
    advance(physics, 3);
    expect(rotor.numColliders()).toBe(8);
    expect(rotor.rotation()).not.toEqual(initial);
    expect(tile.translation().y).toBeGreaterThan(2.5);
  });
  it('drops through a funnel throat into an aligned vertical tube', () => {
    const state = emptyConstruction();
    const funnel = createPiece('small-funnel', [0, 7, 0]);
    const tube = alignPiece(
      createPiece('drop'),
      definition('drop').connectors[0]!,
      funnel,
      definition('small-funnel').connectors[1]!,
    );
    state.pieces.push(funnel, tube);
    factory = new TrackPieceFactory();
    physics = new PhysicsWorld(state, factory);
    physics.release(1, funnel.id);
    advance(physics, 4);
    const pos = physics.marbles[0]!.body.translation();
    expect(pos.y).toBeLessThan(2);
    expect(Math.abs(pos.z)).toBeLessThan(1.2);
  });
  it('CCD catches a fast marble on a thin track surface', () => {
    const state = emptyConstruction();
    state.pieces.push(createPiece('flat', [0, 4, 0]));
    factory = new TrackPieceFactory();
    physics = new PhysicsWorld(state, factory);
    physics.release(1);
    advance(physics, 0.05);
    const m = physics.marbles[0]!;
    m.body.setTranslation({ x: 0, y: 6, z: 0.7 }, true);
    m.body.setLinvel({ x: 0, y: -100, z: 0 }, true);
    advance(physics, 0.2);
    expect(m.body.translation().y).toBeGreaterThan(4.12);
  });
});
