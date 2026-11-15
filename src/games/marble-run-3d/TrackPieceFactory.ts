import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Material,
} from 'three';
import { definition, mechanismOffset } from './TrackPieceRegistry';
import type { PathSample, PieceDefinition, TrackPiece } from './types';

export const COLORS: Record<string, number> = {
  red: 0xed5960,
  blue: 0x428bd6,
  green: 0x54b78a,
  yellow: 0xffce4c,
  orange: 0xf99942,
  purple: 0xa477d5,
};
function sweep(paths: PathSample[][], tube: boolean): BufferGeometry {
  const vertices: number[] = [],
    indices: number[] = [];
  const section = tube
    ? Array.from({ length: 13 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return [Math.sin(a) * 0.64, 0.58 - Math.cos(a) * 0.64];
      })
    : [
        [-0.68, 0.5],
        [-0.61, 0.08],
        [-0.48, 0],
        [0.48, 0],
        [0.61, 0.08],
        [0.68, 0.5],
        [0.8, 0.5],
        [0.71, -0.05],
        [0.54, -0.12],
        [-0.54, -0.12],
        [-0.71, -0.05],
        [-0.8, 0.5],
        [-0.68, 0.5],
      ];
  for (const path of paths) {
    const offset = vertices.length / 3,
      width = section.length;
    path.forEach((sample, i) => {
      const rotation = new Quaternion(...sample.rotation),
        center = new Vector3(...sample.position);
      for (const [x, y] of section) {
        const p = new Vector3(x, y, 0).applyQuaternion(rotation).add(center);
        vertices.push(p.x, p.y, p.z);
      }
      if (i === 0) return;
      for (let j = 0; j < width - 1; j++) {
        // Junction floors merge until branches separate; inner rails would trap marbles.
        if (paths.length > 1 && Math.abs(sample.position[0]) < 0.9) {
          const side = path.at(-1)!.position[0];
          if (side < 0 && [3, 4, 5, 6, 7].includes(j)) continue;
          if (side > 0 && [0, 1, 9, 10, 11].includes(j)) continue;
          if (side === 0 && j !== 2 && j !== 8) continue;
        }
        const a = offset + (i - 1) * width + j,
          b = a + width;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    });
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
function funnel(def: PieceDefinition): BufferGeometry {
  const radius = def.dimensions![0],
    depth = def.dimensions![1];
  const vertices: number[] = [],
    indices: number[] = [];
  // Open throat lets marbles fall into a vertical tube below the funnel.
  for (let row = 0; row <= 16; row++) {
    const t = row / 16,
      r = 0.32 + (radius - 0.32) * t;
    for (let i = 0; i <= 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      vertices.push(Math.cos(angle) * r, -depth + depth * Math.pow(t, 0.7), Math.sin(angle) * r);
      if (row && i) {
        const b = row * 49 + i,
          a = b - 49;
        indices.push(a - 1, a, b - 1, a, b, b - 1);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
/** Cached procedural surfaces are shared by rendering, previews, and Rapier colliders. */
export class TrackPieceFactory {
  readonly sphere = new SphereGeometry(1, 20, 14);
  readonly box = new BoxGeometry(1, 1, 1);
  readonly ring = new TorusGeometry(0.78, 0.08, 6, 24);
  private readonly geometries = new Map<string, BufferGeometry>();
  private readonly materials = new Map<string, MeshStandardMaterial>();

  geometry(type: string): BufferGeometry {
    const cached = this.geometries.get(type);
    if (cached) return cached;
    const def = definition(type);
    let geometry: BufferGeometry;
    if (def.shape === 'funnel') geometry = funnel(def);
    else if (def.paths.length) geometry = sweep(def.paths, def.shape === 'tube');
    else {
      const [x, y, z] = def.dimensions!;
      geometry =
        def.shape === 'pillar'
          ? new CylinderGeometry(x / 2, x / 2, y, 10)
          : new BoxGeometry(x, y, z);
      geometry.translate(0, y / 2, 0);
    }
    this.geometries.set(type, geometry);
    return geometry;
  }
  material(color: number, transparent = false, preview = false): MeshStandardMaterial {
    const key = `${color}:${transparent}:${preview}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new MeshStandardMaterial({
        color,
        roughness: 0.32,
        metalness: 0.06,
        side: DoubleSide,
        transparent: transparent || preview,
        opacity: preview ? 0.42 : transparent ? 0.28 : 1,
        depthWrite: !(transparent || preview),
      });
      this.materials.set(key, material);
    }
    return material;
  }
  create(piece: TrackPiece, preview = false): Group {
    const def = definition(piece.type),
      group = new Group();
    const color = piece.type === 'bin' ? (COLORS[piece.settings.color] ?? def.color) : def.color;
    const mesh = new Mesh(
      this.geometry(piece.type),
      this.material(color, def.shape === 'tube', preview),
    );
    mesh.receiveShadow = true;
    mesh.userData.pieceId = piece.id;
    group.add(mesh);
    const accent = this.material(0xfdf6e6, false, preview);
    const dark = this.material(0x344d65, false, preview);
    if (preview && ['gate', 'pendulum', 'domino', 'bumper', 'wheel'].includes(def.behavior ?? '')) {
      const mechanism = this.mechanism(piece, true);
      mechanism.position.set(...mechanismOffset(def.behavior));
      group.add(mechanism);
    }
    if (def.shape === 'tube') {
      for (const sample of [def.paths[0]![0]!, def.paths[0]!.at(-1)!]) {
        const collar = new Mesh(this.ring, this.material(def.color, false, preview));
        collar.position
          .set(...sample.position)
          .add(new Vector3(0, 0.58, 0).applyQuaternion(new Quaternion(...sample.rotation)));
        collar.quaternion.set(...sample.rotation);
        group.add(collar);
      }
    }
    const addBox = (
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      material: Material,
    ): Mesh => {
      const object = new Mesh(this.box, material);
      object.position.set(x, y, z);
      object.scale.set(sx, sy, sz);
      group.add(object);
      return object;
    };
    if (def.behavior === 'dispenser') {
      addBox(-0.92, 0.65, 0.28, 0.24, 1.6, 0.28, dark);
      addBox(0.92, 0.65, 0.28, 0.24, 1.6, 0.28, dark);
      addBox(0, 1.4, 0.28, 2, 0.3, 0.32, this.material(0x5c88cf, false, preview));
      const ball = new Mesh(this.sphere, this.material(0xffcc48, false, preview));
      ball.scale.setScalar(0.24);
      ball.position.set(0, 0.9, 0.25);
      group.add(ball);
    } else if (def.behavior === 'finish') {
      addBox(-0.9, 0.6, 0.7, 0.12, 1.5, 0.12, dark);
      addBox(0.9, 0.6, 0.7, 0.12, 1.5, 0.12, dark);
      for (let i = 0; i < 6; i++)
        for (let row = 0; row < 2; row++)
          addBox(
            -0.75 + i * 0.3,
            1.22 + row * 0.23,
            0.7,
            0.3,
            0.23,
            0.09,
            (i + row) % 2 ? dark : accent,
          );
    } else if (def.behavior === 'bell' || def.behavior === 'drum') {
      for (let i = 0; i < (piece.type === 'xylophone' ? 4 : 1); i++)
        addBox(
          0.9,
          0.22 + i * 0.08,
          0.35 + i * 0.22,
          0.5,
          0.13,
          0.2,
          this.material(0xe8bc60 + i * 800, false, preview),
        );
    } else if (def.behavior === 'collector') {
      addBox(0, -0.05, 1.45, 1.7, 0.15, 0.3, dark);
      addBox(-0.85, 0.22, 0.8, 0.12, 0.65, 1.6, this.material(color, false, preview));
      addBox(0.85, 0.22, 0.8, 0.12, 0.65, 1.6, this.material(color, false, preview));
    } else if (def.behavior === 'pendulum' || def.behavior === 'wheel') {
      addBox(-0.9, 0.7, 1.2, 0.16, 1.6, 0.25, dark);
      addBox(0.9, 0.7, 1.2, 0.16, 1.6, 0.25, dark);
      addBox(0, 1.5, 1.2, 2, 0.12, 0.16, dark);
    } else if (def.behavior === 'magnet' || def.behavior === 'teleporter') {
      const portal = new Mesh(this.ring, this.material(def.color, false, preview));
      portal.position.set(0, 0.65, 1.2);
      group.add(portal);
    } else if (def.behavior === 'spring' || def.behavior === 'trampoline') {
      const coil = new Mesh(this.ring, dark);
      coil.scale.setScalar(0.45);
      coil.rotation.x = Math.PI / 2;
      coil.position.set(0, -0.2, 1.2);
      group.add(coil);
    } else if (def.behavior === 'conveyor') {
      for (let i = 0; i < 8; i++) addBox(0, 0.015 - i * 0.025, i * 0.3, 0.9, 0.035, 0.1, dark);
    }
    group.position.set(...piece.position);
    group.quaternion.set(...piece.rotation);
    if (def.shape === 'pillar') group.scale.set(1, piece.scale, 1);
    else group.scale.setScalar(piece.scale);
    group.traverse((o) => {
      o.userData.pieceId = piece.id;
    });
    return group;
  }
  mechanism(piece: TrackPiece, preview = false): Group {
    const group = new Group(),
      def = definition(piece.type),
      behavior = def.behavior;
    const material = this.material(def.color, false, preview);
    const box = (x: number, y: number, z: number, sx: number, sy: number, sz: number): Mesh => {
      const mesh = new Mesh(this.box, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      group.add(mesh);
      return mesh;
    };
    if (behavior === 'wheel') {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const paddle = box(0, Math.cos(angle) * 1.16, Math.sin(angle) * 1.16, 1, 0.16, 0.56);
        paddle.rotation.x = angle;
      }
      for (const x of [-0.55, 0.55]) {
        const ring = new Mesh(this.ring, this.material(0xd3af70, false, preview));
        ring.position.x = x;
        ring.rotation.y = Math.PI / 2;
        ring.scale.setScalar(1.16 / 0.78);
        group.add(ring);
      }
    } else if (behavior === 'pendulum') {
      box(0, -0.45, 0, 0.06, 0.9, 0.06);
      const bob = new Mesh(this.sphere, material);
      bob.position.y = -0.9;
      bob.scale.setScalar(0.3);
      group.add(bob);
    } else if (behavior === 'bumper') {
      const bumper = new Mesh(this.sphere, material);
      bumper.position.set(0, 0.32, 1.2);
      bumper.scale.setScalar(0.3);
      group.add(bumper);
    } else
      box(
        0,
        behavior === 'domino' ? 0.55 : 0.28,
        0.65,
        behavior === 'domino' ? 0.6 : 1.16,
        behavior === 'domino' ? 1.1 : 0.6,
        0.18,
      );
    group.traverse((o) => {
      o.userData.pieceId = piece.id;
    });
    return group;
  }
  marbleMaterial(appearance: string, index: number, glow: boolean): MeshStandardMaterial {
    const color =
      COLORS[appearance] ?? [0xe96175, 0x4da9da, 0x83be66, 0xffcd54, 0x9f82ce][index % 5]!;
    const key = `marble:${appearance}:${color}:${glow}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new MeshStandardMaterial({
        color: appearance === 'glass' ? 0xc7eef3 : color,
        roughness: appearance === 'metallic' ? 0.16 : 0.1,
        metalness: appearance === 'metallic' ? 0.9 : 0.22,
        transparent: appearance === 'glass',
        opacity: appearance === 'glass' ? 0.62 : 1,
        emissive: glow || appearance === 'glow' ? new Color(color) : new Color(0),
        emissiveIntensity: 0.6,
      });
      this.materials.set(key, material);
    }
    return material;
  }
  dispose(): void {
    for (const geometry of [...this.geometries.values(), this.sphere, this.box, this.ring])
      geometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.geometries.clear();
    this.materials.clear();
  }
}
