import { Quaternion, Vector3 } from 'three';
import { definition } from './TrackPieceRegistry';
import type { Connection, Connector, TrackPiece, Vec3 } from './types';

export const MAX_PIECES = 160;
export function createPiece(type: string, position: Vec3 = [0, 3, 0]): TrackPiece {
  definition(type);
  return {
    id: crypto.randomUUID(),
    type,
    position,
    rotation: [0, 0, 0, 1],
    scale: 1,
    settings: { note: 60, strength: 5, enabled: true, color: 'red', link: '' },
  };
}
export function worldPort(
  piece: TrackPiece,
  port: Connector,
): { position: Vector3; rotation: Quaternion } {
  const rotation = new Quaternion(...piece.rotation);
  return {
    position: new Vector3(...port.position)
      .multiplyScalar(piece.scale)
      .applyQuaternion(rotation)
      .add(new Vector3(...piece.position)),
    rotation: rotation.multiply(new Quaternion(...port.rotation)),
  };
}
export function compatible(a: Connector, b: Connector): boolean {
  return (
    a.accepts.includes(b.type) &&
    b.accepts.includes(a.type) &&
    ((a.flow === 'structure' && b.flow === 'structure') ||
      (a.flow === 'in' && b.flow === 'out') ||
      (a.flow === 'out' && b.flow === 'in'))
  );
}
/** Solve the complete connector transform; no grid adjacency assumptions. */
export function alignPiece(
  piece: TrackPiece,
  input: Connector,
  target: TrackPiece,
  output: Connector,
): TrackPiece {
  const world = worldPort(target, output);
  const rotation = world.rotation
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI))
    .multiply(new Quaternion(...input.rotation).invert());
  const position = world.position.sub(
    new Vector3(...input.position).multiplyScalar(piece.scale).applyQuaternion(rotation),
  );
  return { ...piece, position: position.toArray(), rotation: rotation.toArray() };
}
export interface SnapResult {
  piece: TrackPiece;
  connection: Connection;
  point: Vec3;
}
export function findSnap(
  candidate: TrackPiece,
  pieces: TrackPiece[],
  connections: Connection[],
  radius = 1.5,
): SnapResult | undefined {
  let closest = radius;
  let result: SnapResult | undefined;
  const occupied = (id: string, port: string): boolean =>
    connections.some((c) => (c.a === id && c.portA === port) || (c.b === id && c.portB === port));
  for (const target of pieces) {
    if (target.id === candidate.id) continue;
    for (const output of definition(target.type).connectors) {
      if (occupied(target.id, output.id)) continue;
      const world = worldPort(target, output);
      for (const input of definition(candidate.type).connectors) {
        if (!compatible(input, output)) continue;
        const distance = worldPort(candidate, input).position.distanceTo(world.position);
        if (distance >= closest) continue;
        closest = distance;
        result = {
          piece: alignPiece(candidate, input, target, output),
          connection: { a: target.id, portA: output.id, b: candidate.id, portB: input.id },
          point: world.position.toArray(),
        };
      }
    }
  }
  return result;
}
export function validConnection(
  connection: Connection,
  pieces: TrackPiece[],
  tolerance = 0.035,
): boolean {
  const a = pieces.find((p) => p.id === connection.a);
  const b = pieces.find((p) => p.id === connection.b);
  if (!a || !b || a.id === b.id) return false;
  const pa = definition(a.type).connectors.find((p) => p.id === connection.portA);
  const pb = definition(b.type).connectors.find((p) => p.id === connection.portB);
  if (!pa || !pb || !compatible(pa, pb)) return false;
  const wa = worldPort(a, pa),
    wb = worldPort(b, pb);
  const forwardA = new Vector3(0, 0, 1).applyQuaternion(wa.rotation);
  const forwardB = new Vector3(0, 0, 1).applyQuaternion(wb.rotation);
  const upA = new Vector3(0, 1, 0).applyQuaternion(wa.rotation);
  const upB = new Vector3(0, 1, 0).applyQuaternion(wb.rotation);
  return (
    wa.position.distanceTo(wb.position) < tolerance &&
    forwardA.dot(forwardB) < -0.999 &&
    upA.dot(upB) > 0.999
  );
}
export function reconcileConnections(
  connections: Connection[],
  pieces: TrackPiece[],
): Connection[] {
  const used = new Set<string>();
  return connections.filter((c) => {
    const a = `${c.a}:${c.portA}`,
      b = `${c.b}:${c.portB}`;
    if (used.has(a) || used.has(b) || !validConnection(c, pieces)) return false;
    used.add(a);
    used.add(b);
    return true;
  });
}
