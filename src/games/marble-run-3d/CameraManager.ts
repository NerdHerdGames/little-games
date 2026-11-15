import type { Box3 } from 'three';
import { PerspectiveCamera, Vector3 } from 'three';
import type { ViewGesture } from '../../input/ActionState';
import type { CameraPreferences } from './types';
import type { MarbleBody } from './PhysicsWorld';

export type CameraMode = 'orbit' | 'top' | 'front' | 'side' | 'follow' | 'pov';
export class CameraManager {
  readonly camera = new PerspectiveCamera(43, 1, 0.06, 350);
  mode: CameraMode = 'orbit';
  following = 0;
  private readonly target = new Vector3();
  private readonly direction = new Vector3(0, 0, 1);
  private initialized = false;
  constructor(public preferences: CameraPreferences) {}
  gesture(gesture: ViewGesture): void {
    this.mode = 'orbit';
    this.preferences.yaw += gesture.rotateX;
    this.preferences.pitch = Math.max(
      0.08,
      Math.min(1.55, this.preferences.pitch + gesture.rotateY),
    );
    this.preferences.distance = Math.max(
      4,
      Math.min(110, this.preferences.distance * Math.exp(-gesture.zoom)),
    );
  }
  pan(x: number, z: number): void {
    const offset = new Vector3(x, 0, z).applyAxisAngle(new Vector3(0, 1, 0), this.preferences.yaw);
    this.preferences.target[0] += offset.x;
    this.preferences.target[2] += offset.z;
    this.mode = 'orbit';
  }
  view(mode: CameraMode): void {
    this.mode = mode;
    if (mode === 'top') this.preferences.pitch = 1.55;
    if (mode === 'front') {
      this.preferences.pitch = 0.12;
      this.preferences.yaw = 0;
    }
    if (mode === 'side') {
      this.preferences.pitch = 0.12;
      this.preferences.yaw = Math.PI / 2;
    }
  }
  overview(bounds: Box3): void {
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new Vector3()),
      size = bounds.getSize(new Vector3());
    this.preferences.target = center.toArray();
    this.preferences.distance = Math.max(12, Math.min(105, size.length() * 1.65));
    this.preferences.pitch = 0.72;
    this.preferences.yaw = -0.7;
    this.mode = 'orbit';
  }
  update(seconds: number, marbles: MarbleBody[], reduced: boolean): void {
    const active = marbles.filter((m) => m.active);
    const marble = active[this.following % Math.max(1, active.length)];
    const target = new Vector3(...this.preferences.target),
      position = new Vector3();
    if ((this.mode === 'follow' || this.mode === 'pov') && marble && !reduced) {
      const p = new Vector3().copy(marble.body.translation());
      const velocity = new Vector3().copy(marble.body.linvel());
      if (velocity.lengthSq() > 0.25)
        this.direction.lerp(velocity.normalize(), Math.min(1, seconds * 2)).normalize();
      if (this.mode === 'pov') {
        position
          .copy(p)
          .addScaledVector(this.direction, -0.15)
          .add(new Vector3(0, 0.25, 0));
        target.copy(p).addScaledVector(this.direction, 3);
      } else {
        target.copy(p);
        position
          .copy(p)
          .addScaledVector(this.direction, -4.5)
          .add(new Vector3(0, 3, 0));
      }
    } else {
      const { yaw, pitch } = this.preferences;
      const distance = this.preferences.distance * Math.max(1, 0.9 / this.camera.aspect);
      position.set(
        target.x + Math.sin(yaw) * Math.cos(pitch) * distance,
        Math.max(0.8, target.y + Math.sin(pitch) * distance),
        target.z + Math.cos(yaw) * Math.cos(pitch) * distance,
      );
    }
    const alpha = !this.initialized || reduced ? 1 : 1 - Math.exp(-seconds * 7);
    this.camera.position.lerp(position, alpha);
    this.target.lerp(target, alpha);
    this.camera.lookAt(this.target);
    this.initialized = true;
  }
}
