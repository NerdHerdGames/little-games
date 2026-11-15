import { afterEach, describe, expect, it, vi } from 'vitest';
import Matter from './matter';
import { MarblePhysics, type PhysicsFeedback } from './physics';
import { createPiece } from './registry';
import { defaultDocument, type Piece } from './types';
import { example } from './examples';
const worlds: MarblePhysics[] = [];
afterEach(() => {
  for (const w of worlds) w.destroy();
  worlds.length = 0;
});
const setup = (pieces: Piece[], feedback: (event: PhysicsFeedback) => void = () => {}) => {
  const d = defaultDocument();
  d.pieces = pieces;
  const w = new MarblePhysics(feedback);
  w.rebuild(d);
  worlds.push(w);
  return { w, d };
};
const advance = (w: MarblePhysics, ms: number) => {
  for (let t = 0; t < ms; t += 1000 / 60) w.step(1000 / 60);
};

describe('fixed-step Matter marble simulation', () => {
  it('accelerates with gravity and rolls through connected ramps into the basket', () => {
    const doc = example('first'),
      w = new MarblePhysics();
    worlds.push(w);
    w.rebuild(doc);
    w.dispense(1);
    const start = w.marbles[0]!.body.position.y;
    advance(w, 100);
    expect(w.marbles[0]!.body.position.y).toBeGreaterThan(start);
    advance(w, 15000);
    expect(w.counts.get(doc.pieces.find((p) => p.type === 'collector')!.id) ?? 0).toBe(1);
  });
  it('uses stable substeps for a fast marble striking a thin platform', () => {
    const { w, d } = setup([createPiece('dispenser', 0, -100), createPiece('platform', 0, 100)]);
    d.marbles.speed = 0;
    d.marbles.bounce = 0;
    w.dispense(1);
    Matter.Body.setVelocity(w.marbles[0]!.body, { x: 0, y: 18 });
    advance(w, 1200);
    expect(w.marbles[0]!.body.position.y).toBeLessThan(95);
    expect(w.marbles[0]!.body.position.y).toBeGreaterThan(65);
  });
  it('keeps batched and continuous marbles finite within the safety cap', () => {
    const { w } = setup([createPiece('dispenser', 0, -100), createPiece('bowl', 0, 100)]);
    w.stream = true;
    for (let i = 0; i < 30; i++) w.dispense(5);
    advance(w, 3000);
    expect(w.marbles.length).toBeLessThanOrEqual(100);
    expect(w.marbles.length).toBeGreaterThan(10);
    for (const m of w.marbles) {
      expect(Number.isFinite(m.body.position.x)).toBe(true);
      expect(Math.hypot(m.body.velocity.x, m.body.velocity.y)).toBeLessThanOrEqual(18.01);
    }
    w.clear();
    expect(w.marbles).toHaveLength(0);
    expect(w.queued).toBe(0);
    expect(w.stream).toBe(false);
  });
  it('does not fast-forward after a hidden-tab-sized frame', () => {
    const { w } = setup([createPiece('dispenser', 0, 0)]);
    w.dispense(1);
    w.step(30000);
    expect(w.time).toBeLessThanOrEqual(51);
  });
  it('launches marbles upward on a spring and produces musical collision feedback', () => {
    const events: PhysicsFeedback[] = [],
      spring = createPiece('trampoline', 0, 100),
      bell = createPiece('bell', 250, 100);
    const { w, d } = setup([createPiece('dispenser', 0, 0), spring, bell], (e) => events.push(e));
    d.marbles.speed = 0;
    w.dispense(1);
    let launched = false;
    for (let i = 0; i < 60; i++) {
      w.step(1000 / 60);
      if (w.marbles[0]!.body.velocity.y < -5) launched = true;
    }
    expect(launched).toBe(true);
    Matter.Body.setPosition(w.marbles[0]!.body, { x: 250, y: 50 });
    Matter.Body.setVelocity(w.marbles[0]!.body, { x: 0, y: 4 });
    advance(w, 500);
    expect(events.some((e) => e.kind === 'note')).toBe(true);
  });
  it('passes matching colors through a color gate and blocks other colors', () => {
    const gate = createPiece('color-gate', 100, 0);
    gate.props.color = '#ee6470';
    const { w, d } = setup([createPiece('dispenser', 0, -22), gate]);
    d.gravity = 0.3;
    d.marbles.speed = 8;
    d.marbles.color = '#ee6470';
    w.dispense(1);
    advance(w, 250);
    expect(w.marbles[0]!.body.position.x).toBeGreaterThan(100);
    w.clear();
    d.marbles.color = '#408cdd';
    w.dispense(1);
    advance(w, 250);
    expect(w.marbles[0]!.body.position.x).toBeLessThan(100);
  });
  it('pairs portals by color and preserves velocity with a cooldown', () => {
    const { w, d } = setup([
      createPiece('dispenser', 0, -60),
      createPiece('teleporter', 0, 0),
      createPiece('teleporter', 300, 0),
    ]);
    d.marbles.speed = 0;
    w.dispense(1);
    advance(w, 300);
    expect(w.marbles[0]!.body.position.x).toBeCloseTo(300);
    expect(w.marbles[0]!.lastPortal).toBeGreaterThan(0);
  });
  it('moves platforms, pivots seesaws, and lets dominoes fall', () => {
    const moving = createPiece('moving', 0, 300),
      seesaw = createPiece('seesaw', 200, 300),
      domino = createPiece('domino', 400, 100);
    const { w } = setup([moving, seesaw, domino]);
    advance(w, 1000);
    expect(w.position(moving).x).toBeGreaterThan(20);
    expect(Math.abs(w.position(seesaw).y - 300)).toBeLessThan(2);
    expect(w.position(domino).y).toBeGreaterThan(200);
  });
  it('switch plates change gate collision behavior', () => {
    const gate = createPiece('gate', 200, 100),
      plate = createPiece('plate', 0, 100);
    const { w, d } = setup([createPiece('dispenser', 0, 0), gate, plate]);
    d.marbles.speed = 0;
    expect(w.gateOpen(gate.id)).toBe(false);
    w.dispense(1);
    advance(w, 700);
    expect(w.gateOpen(gate.id)).toBe(true);
  });
  it('attractors and repellers apply opposite forces to nearby marbles', () => {
    for (const type of ['magnet', 'repeller']) {
      const { w, d } = setup([createPiece('dispenser', 0, -22), createPiece(type, 150, 0)]);
      d.marbles.speed = 0;
      w.dispense(1);
      advance(w, 200);
      expect(Math.sign(w.marbles[0]!.body.position.x)).toBe(type === 'magnet' ? 1 : -1);
    }
  });
  it('rainbow dispensers produce valid colors in races and sorting', () => {
    const start = createPiece('dispenser', 0, 0);
    start.props.color = 'rainbow';
    const { w, d } = setup([start]);
    d.experience = 'race';
    w.dispense(5);
    advance(w, 800);
    expect(w.marbles).toHaveLength(5);
    expect(w.marbles.every((m) => /^#[a-f0-9]{6}$/.test(m.color))).toBe(true);
  });
  it('records the first race finisher and clears race state on restart', () => {
    const events: PhysicsFeedback[] = [],
      finish = createPiece('finish', 0, 100);
    const { w, d } = setup([createPiece('dispenser', 0, -40), finish], (e) => events.push(e));
    d.marbles.speed = 0;
    w.dispense(5);
    advance(w, 1500);
    expect(w.winner).toBeDefined();
    expect(events.filter((e) => e.kind === 'finish')).toHaveLength(1);
    w.rebuild(d);
    expect(w.winner).toBeUndefined();
  });
});

// Use the same installed Matter runtime without loading Phaser's DOM renderer in Node.
vi.mock('./matter', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const entry = require
    .resolve('phaser/package.json')
    .replace('package.json', 'src/physics/matter-js/CustomMain.js');
  return { default: require(entry) as unknown };
});
