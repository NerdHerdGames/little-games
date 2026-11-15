import Matter from './matter';
import { getDefinition } from './registry';
import { transform } from './connections';
import { MAX_MARBLES } from './document';
import {
  COLORS,
  clamp,
  type MarbleSettings,
  type Piece,
  type Point,
  type RunDocument,
} from './types';
export interface Marble {
  body: MatterJS.BodyType;
  color: string;
  finish: MarbleSettings['finish'];
  radius: number;
  trail: Point[];
  born: number;
  lastPortal: number;
}
interface Fixture {
  piece: Piece;
  body: MatterJS.BodyType;
  origin: Point;
}
export interface PhysicsFeedback {
  kind: 'hit' | 'roll' | 'note' | 'drum' | 'finish' | 'collect' | 'switch';
  piece?: Piece;
  marble?: Marble;
}
const NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
export const noteFrequency = (note: number): number => NOTES[note] ?? NOTES[0]!;
const colorCategory = (color: string): number =>
  1 << (COLORS.indexOf(color as (typeof COLORS)[number]) + 2);
/** Standalone Matter world; fixed 120Hz updates are independent of viewport size. */
export class MarblePhysics {
  readonly engine = Matter.Engine.create({
    enableSleeping: false,
    positionIterations: 8,
    velocityIterations: 8,
  });
  readonly marbles: Marble[] = [];
  readonly fixtures: Fixture[] = [];
  readonly counts = new Map<string, number>();
  winner: Marble | undefined;
  time = 0;
  stream = false;
  private accumulator = 0;
  private streamClock = 0;
  private document!: RunDocument;
  private pending: { at: number; piece: Piece; index: number }[] = [];
  private cooldown = new Map<string, number>();
  constructor(private readonly feedback: (event: PhysicsFeedback) => void = () => {}) {
    Matter.Events.on(this.engine, 'collisionStart', this.onCollision);
    Matter.Events.on(this.engine, 'collisionActive', this.onRolling);
  }
  private onCollision = (event: MatterJS.IEventCollision<MatterJS.Engine>): void =>
    this.collisions(event.pairs);
  private onRolling = (event: MatterJS.IEventCollision<MatterJS.Engine>): void => {
    for (const pair of event.pairs) {
      const a = pair.bodyA as unknown as MatterJS.BodyType,
        b = pair.bodyB as unknown as MatterJS.BodyType;
      if (a.isSensor || b.isSensor) continue;
      const marble = this.marbles.find((m) => m.body === a.parent || m.body === b.parent);
      if (marble && Math.hypot(marble.body.velocity.x, marble.body.velocity.y) > 0.5) {
        this.feedback({ kind: 'roll', marble });
        return;
      }
    }
  };
  rebuild(document: RunDocument): void {
    this.clear();
    this.document = document;
    this.fixtures.length = 0;
    Matter.Composite.clear(this.engine.world, false);
    Matter.Engine.clear(this.engine);
    this.engine.gravity.y = document.gravity;
    for (const piece of document.pieces) this.addPiece(piece);
  }
  private addPiece(piece: Piece): void {
    const def = getDefinition(piece.type),
      m = def.mechanic;
    if (m === 'dispenser' || m === 'magnet' || m === 'repeller') return;
    const dynamic = ['seesaw', 'domino', 'pendulum'].includes(m ?? '');
    const sensor = ['finish', 'counter', 'teleporter'].includes(m ?? '');
    const options: MatterJS.IBodyDefinition = {
      isStatic: !dynamic,
      isSensor: sensor || (m === 'gate' && piece.props.open),
      friction: 0.015,
      frictionStatic: 0.02,
      restitution: m === 'bumper' ? 1.1 : 0.12,
      angle: piece.angle,
      label: piece.id,
    };
    if (m === 'color-gate')
      options.collisionFilter = {
        group: 0,
        category: 1,
        mask: piece.props.color === 'rainbow' ? 0 : 0x7fffffff ^ colorCategory(piece.props.color),
      };
    let body: MatterJS.BodyType;
    if (m === 'bumper') body = Matter.Bodies.circle(piece.x, piece.y, 29 * piece.scale, options);
    else if (m === 'pendulum')
      body = Matter.Bodies.circle(piece.x, piece.y + 85 * piece.scale, 24 * piece.scale, {
        ...options,
        density: 0.015,
      });
    else if (sensor)
      body = Matter.Bodies.rectangle(
        piece.x,
        piece.y,
        m === 'finish' ? 20 : 64,
        m === 'finish' ? 180 * piece.scale : 70 * piece.scale,
        options,
      );
    else {
      const parts = def.paths.flatMap((path) =>
        path.slice(1).map((b, i) => {
          const a = transform(path[i]!, piece),
            end = transform(b, piece);
          return Matter.Bodies.rectangle(
            (a.x + end.x) / 2,
            (a.y + end.y) / 2,
            Math.hypot(end.x - a.x, end.y - a.y) + 1,
            14 * piece.scale,
            { ...options, angle: Math.atan2(end.y - a.y, end.x - a.x) },
          );
        }),
      );
      if (!parts.length) return;
      body = parts.length === 1 ? parts[0]! : Matter.Body.create({ ...options, angle: 0, parts });
      // A compound's center of mass can differ from the piece's drawing origin.
    }
    Matter.Composite.add(this.engine.world, body);
    this.fixtures.push({ piece, body, origin: { ...body.position } });
    if (m === 'seesaw' || m === 'pendulum')
      Matter.Composite.add(
        this.engine.world,
        Matter.Constraint.create({
          bodyA: body,
          pointA: { x: 0, y: 0 },
          pointB: { x: piece.x, y: piece.y },
          length: m === 'pendulum' ? 85 * piece.scale : 0,
          stiffness: 0.95,
          damping: 0.06,
        }),
      );
  }
  /** Release from every start together; five-marble batches are spaced to avoid overlap. */
  dispense(count: number): void {
    const starts = this.document.pieces.filter((p) => p.type === 'dispenser');
    const sources = starts.length
      ? starts
      : [
          {
            id: 'default',
            type: 'dispenser',
            x: 135,
            y: 80,
            angle: 0,
            scale: 1,
            props: { color: this.document.marbles.color, note: 0, power: 1, open: false },
          } satisfies Piece,
        ];
    for (const piece of sources)
      for (let i = 0; i < count; i++)
        if (this.pending.length + this.marbles.length < MAX_MARBLES)
          this.pending.push({ at: this.time + i * 180, piece, index: i });
    this.releasePending();
  }
  private releasePending(): void {
    const ready = this.pending.filter((p) => p.at <= this.time);
    this.pending = this.pending.filter((p) => p.at > this.time);
    for (const { piece, index } of ready) {
      if (this.marbles.length >= MAX_MARBLES) break;
      const s = this.document.marbles;
      const requested =
        this.document.experience === 'race' || this.document.experience === 'sorting'
          ? piece.props.color
          : s.color;
      const color =
        requested === 'rainbow' ? COLORS[(this.marbles.length + index) % 6]! : requested;
      const radius = s.size;
      const body = Matter.Bodies.circle(piece.x, piece.y + 22, radius, {
        restitution: s.bounce,
        friction: 0.006,
        frictionStatic: 0.015,
        frictionAir: 0.0015,
        density: 0.002 * s.weight,
        label: 'marble',
        collisionFilter: { group: 0, category: colorCategory(color), mask: 0x7fffffff },
      });
      Matter.Body.setVelocity(body, {
        x: Math.cos(piece.angle) * s.speed * piece.props.power,
        y: Math.sin(piece.angle) * s.speed,
      });
      Matter.Composite.add(this.engine.world, body);
      this.marbles.push({
        body,
        color,
        finish: s.finish,
        radius,
        trail: [],
        born: this.time,
        lastPortal: -2000,
      });
    }
  }
  step(delta: number): void {
    this.engine.gravity.y = this.document.gravity;
    this.accumulator += Math.min(delta, 50);
    const dt = 1000 / 120;
    while (this.accumulator >= dt) {
      this.time += dt;
      this.accumulator -= dt;
      this.releasePending();
      if (this.stream) {
        this.streamClock += dt;
        if (this.streamClock >= 650) {
          this.streamClock = 0;
          this.dispense(1);
        }
      }
      this.mechanics();
      Matter.Engine.update(this.engine, dt);
      for (const marble of [...this.marbles]) {
        const b = marble.body,
          speed = Math.hypot(b.velocity.x, b.velocity.y);
        if (speed > 18)
          Matter.Body.setVelocity(b, {
            x: (b.velocity.x * 18) / speed,
            y: (b.velocity.y * 18) / speed,
          });
        if (
          Math.abs(b.position.x) > 6500 ||
          Math.abs(b.position.y) > 6500 ||
          this.time - marble.born > 90000
        )
          this.remove(marble);
      }
    }
    for (const m of this.marbles) {
      if (this.document.marbles.trails) {
        m.trail.push({ ...m.body.position });
        if (m.trail.length > 12) m.trail.shift();
      } else m.trail.length = 0;
    }
  }
  private mechanics(): void {
    for (const fixture of this.fixtures) {
      const { piece, body, origin } = fixture,
        m = getDefinition(piece.type).mechanic;
      if (m === 'moving' || m === 'elevator') {
        const offset = Math.sin(this.time / 1500) * 95 * piece.props.power;
        Matter.Body.setPosition(
          body,
          {
            x: origin.x + (m === 'moving' ? offset : 0),
            y: origin.y + (m === 'elevator' ? offset : 0),
          },
          true,
        );
      }
      if (m === 'wheel')
        Matter.Body.setAngle(body, piece.angle + (this.time / 1500) * piece.props.power, true);
      if (m === 'seesaw' && Math.abs(body.angle - piece.angle) > 0.65) {
        Matter.Body.setAngle(body, piece.angle + Math.sign(body.angle - piece.angle) * 0.65);
        Matter.Body.setAngularVelocity(body, 0);
      }
    }
    for (const piece of this.document.pieces) {
      const m = getDefinition(piece.type).mechanic;
      if (m !== 'magnet' && m !== 'repeller') continue;
      for (const marble of this.marbles) {
        const dx = piece.x - marble.body.position.x,
          dy = piece.y - marble.body.position.y,
          d = Math.hypot(dx, dy);
        if (d < 220 && d > 12) {
          const f =
            (m === 'repeller' ? -1 : 1) *
            0.00065 *
            piece.props.power *
            (1 - d / 220) *
            marble.body.mass;
          Matter.Body.applyForce(marble.body, marble.body.position, {
            x: (dx / d) * f,
            y: (dy / d) * f,
          });
        }
      }
    }
    // A conveyor applies tangential motion while a marble rests against its belt.
    for (const f of this.fixtures.filter((f) => f.piece.type === 'conveyor'))
      for (const marble of this.marbles) {
        const dx = marble.body.position.x - f.body.position.x,
          dy = marble.body.position.y - f.body.position.y;
        const along = dx * Math.cos(f.piece.angle) + dy * Math.sin(f.piece.angle),
          above = -dx * Math.sin(f.piece.angle) + dy * Math.cos(f.piece.angle);
        if (Math.abs(along) < 60 * f.piece.scale && above < 0 && above > -(marble.radius + 14))
          Matter.Body.applyForce(marble.body, marble.body.position, {
            x: Math.cos(f.piece.angle) * 0.001 * f.piece.props.power * marble.body.mass,
            y: Math.sin(f.piece.angle) * 0.001 * f.piece.props.power * marble.body.mass,
          });
      }
  }
  private collisions(pairs: MatterJS.IPair[]): void {
    for (const pair of pairs) {
      const bodyA = pair.bodyA as unknown as MatterJS.BodyType,
        bodyB = pair.bodyB as unknown as MatterJS.BodyType;
      const marble = this.marbles.find(
        (m) =>
          m.body === bodyA ||
          m.body === bodyB ||
          m.body === bodyA.parent ||
          m.body === bodyB.parent,
      );
      if (!marble) continue;
      const other = bodyA.parent === marble.body ? bodyB.parent : bodyA.parent;
      const fixture = this.fixtures.find((f) => f.body === other);
      if (!fixture) continue;
      const piece = fixture.piece,
        m = getDefinition(piece.type).mechanic;
      const key = `${marble.body.id}:${piece.id}`;
      if (this.time - (this.cooldown.get(key) ?? -2000) < 500) continue;
      this.cooldown.set(key, this.time);
      if (m === 'spring') {
        const a = piece.angle - Math.PI / 2;
        Matter.Body.setVelocity(marble.body, {
          x: Math.cos(a) * 13 * piece.props.power,
          y: Math.sin(a) * 13 * piece.props.power,
        });
      }
      if (m === 'plate') {
        for (const f of this.fixtures.filter((f) => f.piece.type === 'gate'))
          f.body.isSensor = !f.body.isSensor;
        this.feedback({ kind: 'switch', piece, marble });
      }
      if (m === 'teleporter' && this.time - marble.lastPortal > 1000) {
        const portals = this.fixtures.filter(
          (f) => f.piece.type === 'teleporter' && f.piece.props.color === piece.props.color,
        );
        const i = portals.indexOf(fixture),
          target = portals[(i + 1) % portals.length];
        if (target && target !== fixture) {
          Matter.Body.setPosition(marble.body, { x: target.piece.x, y: target.piece.y + 50 });
          marble.lastPortal = this.time;
          marble.trail = [];
        }
      }
      if (m === 'finish' && !this.winner) {
        this.winner = marble;
        this.feedback({ kind: 'finish', piece, marble });
      }
      if (m === 'counter') this.counts.set(piece.id, (this.counts.get(piece.id) ?? 0) + 1);
      if (
        m === 'collector' &&
        (this.document.experience !== 'sorting' ||
          piece.props.color === 'rainbow' ||
          marble.color === piece.props.color)
      ) {
        this.counts.set(piece.id, (this.counts.get(piece.id) ?? 0) + 1);
        this.remove(marble);
        this.feedback({ kind: 'collect', piece, marble });
      } else if (m === 'bell' || m === 'drum')
        this.feedback({ kind: m === 'bell' ? 'note' : 'drum', piece, marble });
      else if (Math.hypot(marble.body.velocity.x, marble.body.velocity.y) > 1)
        this.feedback({ kind: 'hit', piece, marble });
    }
  }
  position(piece: Piece): { x: number; y: number; angle: number } {
    const f = this.fixtures.find((f) => f.piece.id === piece.id);
    if (!f) return piece;
    const m = getDefinition(piece.type).mechanic;
    return {
      x: piece.x + f.body.position.x - f.origin.x,
      y: piece.y + f.body.position.y - f.origin.y,
      angle: ['wheel', 'seesaw', 'domino'].includes(m ?? '') ? f.body.angle : piece.angle,
    };
  }
  gateOpen(id: string): boolean {
    return this.fixtures.find((f) => f.piece.id === id)?.body.isSensor ?? false;
  }
  private remove(marble: Marble): void {
    const i = this.marbles.indexOf(marble);
    if (i < 0) return;
    Matter.Composite.remove(this.engine.world, marble.body);
    this.marbles.splice(i, 1);
  }
  clear(): void {
    for (const m of [...this.marbles]) this.remove(m);
    this.pending = [];
    this.counts.clear();
    this.cooldown.clear();
    this.winner = undefined;
    this.stream = false;
    this.streamClock = 0;
    this.accumulator = 0;
    this.time = 0;
  }
  destroy(): void {
    this.clear();
    Matter.Events.off(this.engine, 'collisionStart', this.onCollision);
    Matter.Events.off(this.engine, 'collisionActive', this.onRolling);
    Matter.Composite.clear(this.engine.world, false);
    Matter.Engine.clear(this.engine);
  }
  get queued(): number {
    return this.pending.length;
  }
  setGravity(value: number): void {
    this.engine.gravity.y = clamp(value, 0.3, 1.8);
  }
}
