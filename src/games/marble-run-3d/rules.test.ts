import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import {
  alignPiece,
  compatible,
  createPiece,
  findSnap,
  reconcileConnections,
  validConnection,
  worldPort,
} from './ConnectionSystem3D';
import { ConstructionController3D } from './ConstructionController3D';
import { definition, PIECES } from './TrackPieceRegistry';
import { decodeConstruction, SaveManager } from './SaveManager';
import { example, EXAMPLES } from './examples';
import type { Construction } from './types';

describe('3D connector construction', () => {
  it('aligns all compatible piece pairs in position, forward, and up under arbitrary 3D transforms', () => {
    for (const def of PIECES)
      for (const other of PIECES) {
        const a = createPiece(def.id, [3, 9, -5]),
          b = createPiece(other.id);
        a.rotation = new Quaternion().setFromEuler(new Euler(0.2, 1.1, -0.4)).toArray();
        a.scale = 1.4;
        b.scale = 0.75;
        for (const output of def.connectors.filter((p) => p.flow !== 'in'))
          for (const input of other.connectors.filter((p) => p.flow !== 'out')) {
            if (!compatible(output, input)) continue;
            const aligned = alignPiece(b, input, a, output);
            const connection = { a: a.id, portA: output.id, b: b.id, portB: input.id };
            expect(validConnection(connection, [a, aligned])).toBe(true);
            expect(
              worldPort(aligned, input).position.distanceTo(worldPort(a, output).position),
            ).toBeLessThan(1e-8);
          }
      }
  });
  it('uses distance, flow, type compatibility, and connector occupancy', () => {
    const a = createPiece('medium');
    const b = alignPiece(
      createPiece('turn90'),
      definition('turn90').connectors[0]!,
      a,
      definition('medium').connectors[1]!,
    );
    const snap = findSnap(b, [a], []);
    expect(snap).toBeDefined();
    expect(findSnap(b, [a], [snap!.connection])).toBeUndefined();
    expect(findSnap(createPiece('pillar'), [a], [])).toBeUndefined();
    b.position = [80, 80, 80];
    expect(findSnap(b, [a], [])).toBeUndefined();
  });
  it('keeps pieces when switching mode and undoes, redoes, duplicates, and disconnects edits', () => {
    const builder = new ConstructionController3D();
    builder.choose('medium');
    expect(builder.place()).toBe(true);
    builder.choose('turn90');
    expect(builder.snap).toBeDefined();
    expect(builder.place()).toBe(true);
    expect(builder.state.connections).toHaveLength(1);
    const pieces = structuredClone(builder.state.pieces);
    builder.edit((s) => {
      s.buildMode = 'free';
    });
    expect(builder.state.pieces).toEqual(pieces);
    builder.transform('y', 2);
    expect(builder.state.connections).toHaveLength(0);
    builder.undo();
    expect(builder.state.connections).toHaveLength(1);
    builder.redo();
    expect(builder.state.connections).toHaveLength(0);
    builder.selected = builder.state.pieces[0]!.id;
    builder.duplicate();
    expect(builder.preview?.id).not.toBe(builder.selected);
    builder.place();
    expect(builder.state.pieces).toHaveLength(3);
    builder.delete();
    expect(builder.state.pieces).toHaveLength(2);
  });
  it('gives every example valid, nonduplicated connections and normalized sample frames', () => {
    EXAMPLES.forEach((_, i) => {
      const run = example(i);
      expect(reconcileConnections(run.connections, run.pieces)).toHaveLength(
        run.connections.length,
      );
      expect(decodeConstruction(run)?.pieces).toHaveLength(run.pieces.length);
    });
    for (const def of PIECES)
      for (const path of def.paths)
        for (const sample of path) {
          expect(new Quaternion(...sample.rotation).length()).toBeCloseTo(1);
          expect(new Vector3(...sample.position).length()).toBeLessThan(100);
        }
  });
});
describe('versioned local saves', () => {
  it('round trips named constructions, updates existing names, and deletes saves', () => {
    const data = new Map<string, string>();
    const store = new SaveManager({
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        data.set(key, value);
      },
    });
    store.save('My tower', example(3));
    store.save('Music', example(1));
    expect(store.list()).toHaveLength(2);
    store.save('My tower', example(2));
    expect(store.list()).toHaveLength(2);
    expect(store.list()[0]?.data.gameMode).toBe('race');
    store.delete(store.list()[0]!.id);
    expect(store.list().map((r) => r.name)).toEqual(['Music']);
  });
  it('rejects corrupt versions, unknown pieces, NaNs, duplicate ids, and oversized scenes', () => {
    const source = example();
    expect(decodeConstruction({ ...source, version: 99 })).toBeUndefined();
    for (const mutate of [
      (source: Construction) => {
        source.pieces[0]!.position[0] = NaN;
      },
      (source: Construction) => {
        source.pieces[0]!.type = 'unknown';
      },
      (source: Construction) => {
        source.pieces[1]!.id = source.pieces[0]!.id;
      },
    ]) {
      const corrupted = structuredClone(source);
      mutate(corrupted);
      expect(decodeConstruction(corrupted)).toBeUndefined();
    }
    expect(
      decodeConstruction({
        ...example(),
        pieces: Array.from({ length: 161 }, () => createPiece('short')),
      }),
    ).toBeUndefined();
  });
  it('discards stale connections instead of reconnecting moved pieces', () => {
    const source = example();
    source.pieces.find((p) => p.id === source.connections[0]!.a)!.position[1] += 2;
    expect(decodeConstruction(source)?.connections.length).toBeLessThan(source.connections.length);
  });
});
