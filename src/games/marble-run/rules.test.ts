import { describe, expect, it } from 'vitest';
import { CameraController } from './camera';
import { disconnect, findSnap, hitPiece, validConnections, worldPorts } from './connections';
import { ConstructionController } from './construction';
import { History, parseDocument, SaveManager } from './document';
import { example, EXAMPLES } from './examples';
import { createPiece, PIECES } from './registry';
import { copy, defaultDocument } from './types';

describe('explicit track connections', () => {
  it('aligns rotated, scaled endpoints with opposite outward tangents', () => {
    const a = createPiece('ramp', 100, 120);
    a.angle = 0.7;
    a.scale = 1.7;
    const target = worldPorts(a)[1]!;
    const b = createPiece('flat', target.x + 90, target.y);
    const snap = findSnap(b, [a], [], 30)!;
    const source = worldPorts(snap.piece).find((p) => p.id === snap.connection.portB)!;
    expect(source.x).toBeCloseTo(target.x);
    expect(source.y).toBeCloseTo(target.y);
    expect(Math.cos(source.angle - target.angle)).toBeCloseTo(-1);
    expect(validConnections([a, snap.piece], [snap.connection])).toHaveLength(1);
  });
  it('does not use bounding boxes, self-connections or occupied endpoints', () => {
    const a = createPiece('flat', 0, 0),
      b = createPiece('flat', 180, 0);
    const snap = findSnap(b, [a], [], 10)!;
    expect(findSnap(createPiece('flat', 180, 0), [a], [snap.connection], 10)).toBeUndefined();
    expect(findSnap(a, [a], [], 1000)).toBeUndefined();
    expect(
      findSnap(createPiece('flat', 0, 0), [createPiece('wall', 0, 0)], [], 20),
    ).toBeUndefined();
  });
  it('supports curved and branching ports and removes broken links', () => {
    expect(PIECES.find((p) => p.type === 'splitter')!.ports).toHaveLength(3);
    const a = createPiece('curve', 0, 0),
      port = worldPorts(a)[1]!,
      b = createPiece('flat', port.x + 90, port.y);
    const result = findSnap(b, [a], [], 20)!;
    expect(result).toBeDefined();
    expect(validConnections([a, result.piece], [result.connection])).toHaveLength(1);
    result.piece.x += 10;
    expect(validConnections([a, result.piece], [result.connection])).toHaveLength(0);
    expect(disconnect([result.connection], a.id)).toEqual([]);
  });
  it('hits actual curve geometry and keeps the center open', () => {
    const bowl = createPiece('bowl', 100, 100);
    expect(hitPiece({ x: 100, y: 145 }, bowl)).toBe(true);
    expect(hitPiece({ x: 100, y: 75 }, bowl)).toBe(false);
  });
});

describe('construction and camera', () => {
  const setup = () =>
    new ConstructionController(
      defaultDocument(),
      new CameraController(),
      () => {},
      () => {},
    );
  it('commits a palette drag once; cancellation never changes the document', () => {
    const e = setup();
    e.handle({ phase: 'start', x: 100, y: 100, dx: 0, dy: 0, source: 'ramp' }, true);
    e.handle({ phase: 'move', x: 200, y: 200, dx: 100, dy: 100 }, true);
    expect(e.document.pieces).toHaveLength(0);
    e.handle({ phase: 'end', x: 200, y: 200, dx: 0, dy: 0 }, true);
    expect(e.document.pieces).toHaveLength(1);
    e.handle({ phase: 'start', x: 0, y: 0, dx: 0, dy: 0, source: 'flat' }, true);
    e.handle({ phase: 'cancel', x: 0, y: 0, dx: 0, dy: 0 }, true);
    expect(e.document.pieces).toHaveLength(1);
    e.undo();
    expect(e.document.pieces).toHaveLength(0);
    e.redo();
    expect(e.document.pieces).toHaveLength(1);
  });
  it('preserves the run across modes, allows free overlap and blocks editing during simulation', () => {
    const e = setup();
    e.document.mode = 'free';
    e.camera.x = 500;
    e.camera.y = 340;
    for (let i = 0; i < 2; i++) {
      e.handle({ phase: 'start', x: 111, y: 123, dx: 0, dy: 0, source: 'flat' }, true);
      e.handle({ phase: 'end', x: 111, y: 123, dx: 0, dy: 0 }, true);
    }
    expect(e.document.pieces[0]!.x).toBe(111);
    expect(e.document.pieces[0]!.x).toBe(e.document.pieces[1]!.x);
    const before = copy(e.document.pieces);
    e.document.mode = 'snap';
    expect(e.document.pieces).toEqual(before);
    e.handle({ phase: 'start', x: 10, y: 10, dx: 0, dy: 0, source: 'ramp' }, false);
    e.handle({ phase: 'end', x: 20, y: 20, dx: 0, dy: 0 }, false);
    expect(e.document.pieces).toEqual(before);
  });
  it('rotates a chosen piece before placement and disconnects after rotation', () => {
    const e = setup();
    e.document.mode = 'free';
    e.choose('ramp');
    e.rotate(1);
    e.handle({ phase: 'start', x: 100, y: 100, dx: 0, dy: 0 }, true);
    e.handle({ phase: 'end', x: 100, y: 100, dx: 0, dy: 0 }, true);
    expect(e.document.pieces[0]!.angle).toBeCloseTo(Math.PI / 12);
    e.rotate(-1);
    expect(e.document.pieces[0]!.angle).toBeCloseTo(0);
  });
  it('duplicates properties without cloning IDs or connection metadata', () => {
    const e = setup(),
      p = createPiece('bell', 100, 100);
    p.props.note = 5;
    e.document.pieces.push(p);
    e.selected = p.id;
    e.duplicate();
    expect(e.document.pieces).toHaveLength(2);
    expect(e.selection!.id).not.toBe(p.id);
    expect(e.selection!.props.note).toBe(5);
    e.selection!.props.note = 0;
    expect(p.props.note).toBe(5);
  });
  it('keeps the point under a pinch anchored and fits geometry after resizing', () => {
    const camera = new CameraController(),
      point = { x: 120, y: 450 },
      before = camera.world(point);
    camera.zoomAt(0.4, point);
    expect(camera.world(point).x).toBeCloseTo(before.x);
    expect(camera.world(point).y).toBeCloseTo(before.y);
    const piece = createPiece('long', 600, 800);
    camera.width = 400;
    camera.height = 300;
    camera.fit([piece]);
    expect(camera.screen(piece).x).toBeCloseTo(200);
    expect(camera.screen(piece).y).toBeCloseTo(150);
  });
  it('records independent undo/redo snapshots', () => {
    const history = new History(),
      doc = defaultDocument();
    history.push(doc);
    doc.pieces.push(createPiece('flat', 0, 0));
    const undone = history.undo(doc);
    expect(undone.pieces).toHaveLength(0);
    expect(history.redo(undone).pieces).toHaveLength(1);
  });
});

describe('versioned local saves', () => {
  it('round-trips every built-in run and every registered component', () => {
    for (const entry of EXAMPLES) {
      const doc = example(entry.id);
      expect(parseDocument(doc)).toEqual(doc);
    }
    const doc = defaultDocument();
    doc.pieces = PIECES.map((p) => createPiece(p.type, 100, 100));
    expect(parseDocument(doc)).toEqual(doc);
  });
  it('rejects nonfinite transforms, unknown types, versions and corrupted properties', () => {
    const doc = example('first');
    for (const bad of [
      { ...doc, version: 2 },
      { ...doc, pieces: [{ ...doc.pieces[0], x: Infinity }] },
      { ...doc, pieces: [{ ...doc.pieces[0], type: 'mystery' }] },
      { ...doc, marbles: { ...doc.marbles, size: 0 } },
      { ...doc, connections: [null] },
    ])
      expect(parseDocument(bad)).toBeUndefined();
  });
  it('keeps multiple named saves independent and tolerates corrupt storage', () => {
    const data = new Map<string, string>(),
      storage = {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => {
          data.set(k, v);
        },
      };
    const saves = new SaveManager(storage),
      doc = example('first');
    saves.save('My run', doc, 'a');
    saves.save('Second run', example('race'), 'b');
    doc.pieces = [];
    expect(saves.list()).toHaveLength(2);
    expect(saves.list()[1]!.document.pieces.length).toBeGreaterThan(0);
    saves.remove('a');
    expect(saves.list()[0]!.name).toBe('Second run');
    saves.draft(example('music'));
    expect(saves.restore()?.experience).toBe('music');
    for (const key of data.keys()) data.set(key, 'not json');
    expect(saves.list()).toEqual([]);
    expect(saves.restore()).toBeUndefined();
  });
  it('reports quota failures instead of claiming to save', () => {
    const saves = new SaveManager({
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    });
    expect(() => saves.save('A run', defaultDocument(), 'a')).toThrow('quota');
  });
});
