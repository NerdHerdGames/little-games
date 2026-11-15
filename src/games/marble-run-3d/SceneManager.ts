import {
  ACESFilmicToneMapping,
  AmbientLight,
  ArrowHelper,
  Box3,
  BoxGeometry,
  DirectionalLight,
  GridHelper,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Plane,
  PlaneGeometry,
  PCFSoftShadowMap,
  Quaternion,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { CameraManager } from './CameraManager';
import { TrackPieceFactory } from './TrackPieceFactory';
import { definition } from './TrackPieceRegistry';
import type { ConstructionController3D } from './ConstructionController3D';
import type { MarbleBody, PhysicsWorld } from './PhysicsWorld';
import type { TrackPiece, Vec3 } from './types';

export class SceneManager {
  readonly scene = new Scene();
  readonly renderer: WebGLRenderer;
  readonly camera: CameraManager;
  readonly factory = new TrackPieceFactory();
  private readonly tracks = new Map<string, Group>();
  private readonly mechanisms = new Map<string, Group>();
  private readonly balls = new Map<MarbleBody, Group>();
  private readonly marbleVersions = new Map<MarbleBody, number>();
  private readonly paths = new Map<MarbleBody, Vector3[]>();
  private readonly trail: InstancedMesh;
  private readonly ray = new Raycaster();
  private readonly selection = new Group();
  private readonly gizmo = new Group();
  private readonly snapMarker: Mesh;
  private readonly ghostRoot = new Group();
  private ghost: Group | undefined;
  private ghostKey = '';
  private readonly observer: ResizeObserver;
  private readonly listeners = new AbortController();
  private sizeDirty = true;
  private frameTime = 0;
  private slowFrames = 0;
  private disposed = false;
  private renderDirty = true;
  private selectionSignature = '';
  private lastSimulationTime = -1;
  private lastActiveCount = -1;
  private readonly lastCameraPosition = new Vector3();
  private readonly lastCameraRotation = new Quaternion();
  private readonly resources: { dispose(): void }[] = [];

  constructor(
    private readonly host: HTMLElement,
    construction: ConstructionController3D,
    onContextLost: () => void,
  ) {
    this.renderer = new WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0xf5efdf);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.domElement.setAttribute(
      'aria-label',
      '3D marble workshop. Tap a piece to select it; use the large build controls to move it.',
    );
    this.renderer.domElement.setAttribute('role', 'img');
    host.append(this.renderer.domElement);
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault();
        if (!this.disposed) onContextLost();
      },
      { signal: this.listeners.signal },
    );
    this.camera = new CameraManager(construction.state.camera);
    this.scene.add(new HemisphereLight(0xffffff, 0xd6c4a4, 2.6), new AmbientLight(0xffffff, 0.4));
    const light = new DirectionalLight(0xfff5e4, 3.2);
    light.position.set(-12, 24, 12);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -22;
    light.shadow.camera.right = 22;
    light.shadow.camera.top = 22;
    light.shadow.camera.bottom = -22;
    light.shadow.normalBias = 0.05;
    this.scene.add(light, light.target);
    this.resources.push(light.shadow);
    const ground = new Mesh(
      new PlaneGeometry(240, 240),
      new MeshStandardMaterial({ color: 0xf4eddd, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.11;
    ground.receiveShadow = true;
    this.resources.push(ground.geometry, ground.material);
    this.scene.add(ground);
    const grid = new GridHelper(70, 70, 0xd9c9ac, 0xe4d8c1);
    grid.position.y = -0.09;
    this.scene.add(grid);
    this.resources.push(
      grid.geometry,
      ...(Array.isArray(grid.material) ? grid.material : [grid.material]),
    );
    const slab = new Mesh(new BoxGeometry(34, 0.35, 28), this.factory.material(0xe5cda2));
    slab.position.y = -0.42;
    this.scene.add(slab);
    this.resources.push(slab.geometry);
    const selectMaterial = this.factory.material(0xffffff);
    for (const [x, z] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const marker = new Mesh(this.factory.sphere, selectMaterial);
      marker.scale.set(0.1, 0.1, 0.1);
      marker.position.set(x!, 0.1, z);
      this.selection.add(marker);
    }
    for (const [axis, color] of [
      ['x', 0xe66b69],
      ['y', 0x3c9a69],
      ['z', 0x4e91d3],
    ] as const) {
      const direction = new Vector3(
        axis === 'x' ? 1 : 0,
        axis === 'y' ? 1 : 0,
        axis === 'z' ? 1 : 0,
      );
      const arrow = new ArrowHelper(direction, new Vector3(), 2.4, color, 0.5, 0.4);
      arrow.traverse((o) => {
        o.userData.axis = axis;
      });
      this.gizmo.add(arrow);
      this.resources.push(arrow.line.geometry, arrow.cone.geometry);
      if (!Array.isArray(arrow.line.material)) this.resources.push(arrow.line.material);
      if (!Array.isArray(arrow.cone.material)) this.resources.push(arrow.cone.material);
    }
    this.snapMarker = new Mesh(this.factory.sphere, this.factory.material(0x4acb9c));
    this.snapMarker.scale.setScalar(0.23);
    this.scene.add(this.selection, this.gizmo, this.ghostRoot, this.snapMarker);
    this.trail = new InstancedMesh(
      this.factory.sphere,
      this.factory.material(0xf4b857, true),
      80 * 8,
    );
    this.trail.count = 0;
    this.trail.frustumCulled = false;
    this.scene.add(this.trail);
    this.observer = new ResizeObserver(() => {
      this.sizeDirty = true;
    });
    this.observer.observe(host);
    this.sync(construction);
  }
  sync(construction: ConstructionController3D): void {
    this.renderDirty = true;
    this.camera.preferences = construction.state.camera;
    for (const [id, group] of this.tracks) {
      const next = construction.state.pieces.find((p) => p.id === id);
      if (next && group.userData.signature === JSON.stringify(next)) continue;
      this.scene.remove(group);
      this.tracks.delete(id);
      const mechanism = this.mechanisms.get(id);
      if (mechanism) this.scene.remove(mechanism);
      this.mechanisms.delete(id);
    }
    for (const piece of construction.state.pieces) {
      if (this.tracks.has(piece.id)) continue;
      const group = this.factory.create(piece);
      if (this.tracks.size < 28 && definition(piece.type).shape !== 'tube')
        group.children[0]!.castShadow = true;
      group.userData.signature = JSON.stringify(piece);
      this.scene.add(group);
      this.tracks.set(piece.id, group);
      const behavior = definition(piece.type).behavior;
      if (['gate', 'pendulum', 'domino', 'bumper', 'wheel'].includes(behavior ?? '')) {
        const mesh = this.factory.mechanism(piece);
        this.scene.add(mesh);
        this.mechanisms.set(piece.id, mesh);
      }
    }
  }
  showSelection(
    construction: ConstructionController3D,
    advanced: boolean,
    drag?: TrackPiece,
  ): void {
    const signature = JSON.stringify([
      construction.selected,
      advanced,
      drag,
      construction.preview,
      construction.snap?.piece,
    ]);
    if (signature !== this.selectionSignature) {
      this.renderDirty = true;
      this.selectionSignature = signature;
    }
    const selected = construction.selection;
    this.selection.visible = !!selected;
    if (selected) this.selection.position.set(...selected.position);
    this.gizmo.visible = !!selected && advanced && !construction.preview;
    if (selected) this.gizmo.position.set(...selected.position);
    const preview = drag ?? construction.snap?.piece ?? construction.preview;
    const key = preview ? `${preview.type}:${preview.scale}:${preview.settings.color}` : '';
    if (key !== this.ghostKey) {
      this.ghostRoot.clear();
      this.ghost = preview ? this.factory.create(preview, true) : undefined;
      if (this.ghost) this.ghostRoot.add(this.ghost);
      this.ghostKey = key;
    }
    if (this.ghost && preview) {
      this.ghost.position.set(...preview.position);
      this.ghost.quaternion.set(...preview.rotation);
      if (definition(preview.type).shape === 'pillar') this.ghost.scale.set(1, preview.scale, 1);
      else this.ghost.scale.setScalar(preview.scale);
    }
    this.snapMarker.visible = !!construction.snap && !drag;
    if (construction.snap) this.snapMarker.position.set(...construction.snap.point);
  }
  pick(x: number, y: number): { piece?: string; axis?: 'x' | 'y' | 'z' } {
    this.scene.updateMatrixWorld(true);
    this.ray.setFromCamera(new Vector2(x, y), this.camera.camera);
    if (this.gizmo.visible) {
      const axis = this.ray.intersectObject(this.gizmo, true)[0]?.object.userData.axis as
        | 'x'
        | 'y'
        | 'z'
        | undefined;
      if (axis) return { axis };
    }
    const hit = this.ray.intersectObjects(
      [...this.tracks.values(), ...this.mechanisms.values()],
      true,
    )[0];
    const piece = hit?.object.userData.pieceId as string | undefined;
    return piece ? { piece } : {};
  }
  projectToPlane(x: number, y: number, point: Vec3, vertical = false): Vec3 | undefined {
    this.ray.setFromCamera(new Vector2(x, y), this.camera.camera);
    const normal = vertical
      ? this.camera.camera.getWorldDirection(new Vector3()).setY(0).normalize()
      : new Vector3(0, 1, 0);
    const hit = this.ray.ray.intersectPlane(
      new Plane().setFromNormalAndCoplanarPoint(normal, new Vector3(...point)),
      new Vector3(),
    );
    if (!hit || Math.abs(hit.x) > 100 || Math.abs(hit.y) > 100 || Math.abs(hit.z) > 100) return;
    return hit.toArray();
  }
  overview(): void {
    const bounds = new Box3();
    for (const group of this.tracks.values()) bounds.expandByObject(group);
    this.camera.overview(bounds);
  }
  frame(
    seconds: number,
    physics: PhysicsWorld,
    reduced: boolean,
    trails: boolean,
    glow: boolean,
  ): void {
    if (this.disposed) return;
    if (this.sizeDirty) {
      this.renderDirty = true;
      this.renderer.setSize(
        Math.max(1, this.host.clientWidth),
        Math.max(1, this.host.clientHeight),
        false,
      );
      this.camera.camera.aspect = this.host.clientWidth / Math.max(1, this.host.clientHeight);
      this.camera.camera.updateProjectionMatrix();
      this.sizeDirty = false;
    }
    this.camera.update(seconds, physics.marbles, reduced);
    const cameraMoved =
      this.lastCameraPosition.distanceToSquared(this.camera.camera.position) > 0.000001 ||
      this.lastCameraRotation.angleTo(this.camera.camera.quaternion) > 0.00001;
    const simulationMoved =
      physics.elapsed !== this.lastSimulationTime &&
      (physics.activeCount > 0 ||
        [...physics.pieces.values()].some(
          (r) =>
            r.enabled &&
            ['rotate', 'wheel', 'seesaw', 'moving', 'elevator', 'pendulum'].includes(
              definition(r.piece.type).behavior ?? '',
            ),
        ));
    if (physics.activeCount !== this.lastActiveCount) this.renderDirty = true;
    this.lastActiveCount = physics.activeCount;
    this.lastSimulationTime = physics.elapsed;
    if (!this.renderDirty && !cameraMoved && !simulationMoved) return;
    this.renderDirty = false;
    this.lastCameraPosition.copy(this.camera.camera.position);
    this.lastCameraRotation.copy(this.camera.camera.quaternion);
    this.frameTime += seconds;
    // Adapt once sustained slow rendering suggests a low-powered tablet.
    if (seconds > 0.035) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 1);
    if (this.slowFrames > 90 && this.renderer.getPixelRatio() > 1) {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.sizeDirty = true;
      this.slowFrames = 0;
    }
    for (const [id, runtime] of physics.pieces) {
      const group = this.tracks.get(id);
      if (group) {
        group.position.copy(runtime.body.translation());
        group.quaternion.copy(runtime.body.rotation());
      }
      const mesh = this.mechanisms.get(id);
      if (mesh && runtime.dynamic) {
        mesh.position.copy(runtime.dynamic.translation());
        mesh.quaternion.copy(runtime.dynamic.rotation());
      }
    }
    let dotCount = 0;
    const matrix = new Matrix4();
    for (const marble of physics.marbles) {
      let group = this.balls.get(marble);
      if (!group) {
        group = new Group();
        group.add(
          new Mesh(
            this.factory.sphere,
            this.factory.marbleMaterial(marble.appearance, marble.index, glow),
          ),
        );
        const stripe = new Mesh(this.factory.ring, this.factory.material(0xffffff));
        stripe.rotation.x = 0.8;
        stripe.scale.setScalar(0.95 / 0.78);
        group.add(stripe);
        this.scene.add(group);
        this.balls.set(marble, group);
      }
      group.visible = marble.active;
      if (!marble.active) {
        this.paths.delete(marble);
        continue;
      }
      if (this.marbleVersions.get(marble) !== marble.index) {
        (group.children[0] as Mesh).material = this.factory.marbleMaterial(
          marble.appearance,
          marble.index,
          glow,
        );
        group.children[1]!.visible = ['swirled', 'rainbow', 'glow'].includes(marble.appearance);
        this.marbleVersions.set(marble, marble.index);
        this.paths.delete(marble);
      }
      group.position.copy(marble.body.translation());
      group.quaternion.copy(marble.body.rotation());
      group.scale.setScalar(marble.radius);
      if (trails && !reduced) {
        const path = this.paths.get(marble) ?? [];
        if (this.frameTime >= 0.065) {
          path.unshift(group.position.clone());
          if (path.length > 8) path.pop();
          this.paths.set(marble, path);
        }
        path.forEach((point, i) => {
          matrix.compose(
            point,
            new Quaternion(),
            new Vector3().setScalar(marble.radius * (0.5 - i * 0.04)),
          );
          this.trail.setMatrixAt(dotCount++, matrix);
        });
      }
    }
    if (this.frameTime >= 0.065) this.frameTime = 0;
    this.trail.count = dotCount;
    this.trail.instanceMatrix.needsUpdate = true;
    this.renderer.render(this.scene, this.camera.camera);
  }
  thumbnail(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 160;
    this.renderer.render(this.scene, this.camera.camera);
    canvas.getContext('2d')?.drawImage(this.renderer.domElement, 0, 0, 240, 160);
    return canvas.toDataURL('image/jpeg', 0.65);
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.abort();
    this.observer.disconnect();
    this.trail.dispose();
    for (const resource of this.resources) resource.dispose();
    this.factory.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.host.replaceChildren();
    this.scene.clear();
    this.tracks.clear();
    this.balls.clear();
    this.mechanisms.clear();
    this.paths.clear();
    this.marbleVersions.clear();
  }
}
