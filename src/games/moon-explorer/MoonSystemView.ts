import {
  ACESFilmicToneMapping,
  AmbientLight,
  BackSide,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  RingGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  type Material,
  type Texture,
} from 'three';
import {
  displayMoonRadius,
  displayOrbit,
  selectedMoon,
  viewDistance,
  type ExplorerState,
} from './rules';
import { illustratedSurface, moonColor } from './surfaces';
import type { MoonSystem } from './systems';

/** One planet plus every moon. Instancing keeps even Saturn's complete catalogue inexpensive. */
export class MoonSystemView {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(36, 1, 0.005, 250);
  private readonly primary: Mesh<SphereGeometry, MeshStandardMaterial>;
  private readonly planetGroup = new Group();
  private readonly moons: InstancedMesh<SphereGeometry, MeshStandardMaterial>;
  private readonly detail: Mesh<SphereGeometry, MeshStandardMaterial>;
  private readonly orbits: LineSegments;
  private readonly orbitSlots: ReturnType<typeof displayOrbit>[];
  private readonly moonRadii: number[];
  private readonly target = new Vector3();
  private readonly projected = new Vector3();
  private readonly transform = new Object3D();
  private readonly resources: (BufferGeometry | Material | Texture)[] = [];
  private readonly labels: { element: HTMLElement; index: number }[] = [];
  private readonly observer: ResizeObserver;
  private readonly listeners = new AbortController();
  private disposed = false;
  private sizeDirty = true;
  private width = 1;
  private height = 1;
  private detailId = '';

  constructor(
    private readonly host: HTMLElement,
    private readonly system: MoonSystem,
    onContextLost: () => void,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x091425);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute(
      'aria-label',
      `${system.name} and all ${system.moons.length} moons in the catalogue, in 3D`,
    );
    this.renderer.domElement.dataset.moonCount = String(system.moons.length);
    this.host.append(this.renderer.domElement);
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        onContextLost();
      },
      { signal: this.listeners.signal },
    );

    const planetGeometry = new SphereGeometry(1, 48, 32);
    const moonGeometry = new SphereGeometry(1, 12, 8);
    const detailGeometry = new SphereGeometry(1, 48, 32);
    const planetTexture = illustratedSurface(system);
    const moonTexture = illustratedSurface();
    const planetMaterial = new MeshStandardMaterial({ map: planetTexture, roughness: 0.9 });
    const moonMaterial = new MeshStandardMaterial({ map: moonTexture, roughness: 1 });
    const detailMaterial = new MeshStandardMaterial({ map: moonTexture, roughness: 1 });
    this.resources.push(
      planetGeometry,
      moonGeometry,
      detailGeometry,
      planetTexture,
      moonTexture,
      planetMaterial,
      moonMaterial,
      detailMaterial,
    );
    this.primary = new Mesh(planetGeometry, planetMaterial);
    if (system.id === 'haumea') this.primary.scale.set(1.4, 0.75, 0.75);
    this.planetGroup.rotation.z = system.id === 'uranus' ? 1.7 : -0.4;
    this.planetGroup.add(this.primary);
    this.scene.add(this.planetGroup);
    this.moons = new InstancedMesh(moonGeometry, moonMaterial, system.moons.length);
    // The complete schematic system can be seen from every direction.
    this.moons.frustumCulled = false;
    this.detail = new Mesh(detailGeometry, detailMaterial);
    this.scene.add(this.moons, this.detail);
    const color = new Color();
    system.moons.forEach((moon, index) => this.moons.setColorAt(index, color.set(moonColor(moon))));
    if (this.moons.instanceColor) this.moons.instanceColor.needsUpdate = true;
    this.orbitSlots = system.moons.map((_moon, index) => displayOrbit(system, index));
    this.moonRadii = system.moons.map((moon) => displayMoonRadius(system, moon));
    const orbitVertices = new Float32Array(system.moons.length * 48 * 2 * 3);
    let cursor = 0;
    for (const orbit of this.orbitSlots) {
      for (let segment = 0; segment < 48; segment += 1) {
        for (const end of [segment, segment + 1]) {
          const angle = (end / 48) * Math.PI * 2;
          orbitVertices[cursor++] = Math.cos(angle) * orbit.radius;
          orbitVertices[cursor++] = Math.sin(angle) * orbit.radius * Math.sin(orbit.inclination);
          orbitVertices[cursor++] = Math.sin(angle) * orbit.radius * Math.cos(orbit.inclination);
        }
      }
    }
    const orbitGeometry = new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute(orbitVertices, 3),
    );
    const orbitMaterial = new LineBasicMaterial({
      color: 0x83b4d9,
      transparent: true,
      opacity: system.moons.length > 20 ? 0.07 : 0.3,
    });
    this.resources.push(orbitGeometry, orbitMaterial);
    this.orbits = new LineSegments(orbitGeometry, orbitMaterial);
    this.scene.add(this.orbits);
    this.scene.add(new AmbientLight(0xb8d2f2, 0.6));
    const sunlight = new DirectionalLight(0xfff6df, 3);
    sunlight.position.set(-3, 2, 5);
    this.scene.add(sunlight);

    if (system.id === 'earth') {
      const material = new MeshBasicMaterial({
        color: 0x63b8f3,
        side: BackSide,
        transparent: true,
        opacity: 0.2,
      });
      const atmosphere = new Mesh(planetGeometry, material);
      atmosphere.scale.setScalar(1.025);
      this.resources.push(material);
      this.planetGroup.add(atmosphere);
    }
    if (system.id === 'saturn' || system.id === 'uranus' || system.id === 'haumea') {
      const bands =
        system.id === 'saturn'
          ? [
              [1.35, 1.65],
              [1.72, 2.05],
            ]
          : [[1.6, 1.65]];
      for (const [inner, outer] of bands) {
        const geometry = new RingGeometry(inner, outer, 80);
        const material = new MeshBasicMaterial({
          color: system.id === 'saturn' ? 0xdcc99a : 0xb9c9d3,
          side: DoubleSide,
          transparent: true,
          opacity: 0.7,
        });
        const ring = new Mesh(geometry, material);
        ring.rotation.x = -Math.PI / 2;
        this.resources.push(geometry, material);
        this.planetGroup.add(ring);
      }
    }
    const stars = new Float32Array(260 * 3);
    for (let index = 0; index < 260; index += 1) {
      const latitude = Math.acos(1 - (2 * (index + 0.5)) / 260),
        longitude = index * 2.399963;
      stars.set(
        [
          100 * Math.sin(latitude) * Math.cos(longitude),
          100 * Math.cos(latitude),
          100 * Math.sin(latitude) * Math.sin(longitude),
        ],
        index * 3,
      );
    }
    const starGeometry = new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute(stars, 3),
    );
    const starMaterial = new PointsMaterial({ color: 0xbdd6e8, size: 0.17 });
    this.resources.push(starGeometry, starMaterial);
    this.scene.add(new Points(starGeometry, starMaterial));
    this.addLabel(system.name, -1);
    for (let index = 0; index < Math.min(4, system.moons.length); index += 1)
      this.addLabel(system.moons[index]!.name, index);
    this.observer = new ResizeObserver(() => {
      this.sizeDirty = true;
    });
    this.observer.observe(host);
  }

  get needsRender(): boolean {
    return this.sizeDirty;
  }

  async loadTextures(): Promise<void> {
    if (this.system.id !== 'earth') return;
    const path = `${import.meta.env.BASE_URL}assets/games/earth-moon-explorer/`;
    const [earth, moon] = await Promise.all([
      this.loadTexture(`${path}earth-color.jpg`),
      this.loadTexture(`${path}moon-color.jpg`),
    ]);
    if (this.disposed) return;
    this.primary.material.map = earth;
    this.moons.material.map = this.detail.material.map = moon;
    this.primary.material.needsUpdate =
      this.moons.material.needsUpdate =
      this.detail.material.needsUpdate =
        true;
  }

  render(state: ExplorerState): void {
    if (this.disposed) return;
    if (this.sizeDirty) {
      this.width = Math.max(1, this.host.clientWidth);
      this.height = Math.max(1, this.host.clientHeight);
      this.renderer.setSize(this.width, this.height, false);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.sizeDirty = false;
    }
    const systemView = state.target === 'system';
    const moon = selectedMoon(this.system, state);
    this.planetGroup.visible = !moon;
    this.moons.visible = systemView;
    this.detail.visible = Boolean(moon);
    this.orbits.visible = state.showOrbit && systemView;
    this.primary.rotation.y = state.spin;
    if (systemView) {
      for (let index = 0; index < this.system.moons.length; index += 1) {
        this.setMoonPosition(this.transform.position, index, state.orbitTime);
        this.transform.scale.setScalar(this.moonRadii[index]!);
        this.transform.updateMatrix();
        this.moons.setMatrixAt(index, this.transform.matrix);
      }
      this.moons.instanceMatrix.needsUpdate = true;
    }
    if (moon) {
      const index = this.system.moons.indexOf(moon);
      this.setMoonPosition(this.detail.position, index, state.orbitTime);
      this.detail.scale.setScalar(this.moonRadii[index]!);
      this.detail.rotation.y =
        Math.PI - (this.orbitSlots[index]!.phase + state.orbitTime * this.orbitSlots[index]!.speed);
      if (this.detailId !== moon.id) {
        this.detail.material.color.set(moonColor(moon));
        this.detailId = moon.id;
      }
      this.target.copy(this.detail.position);
    } else this.target.set(0, 0, 0);
    const distance = viewDistance(this.system, state) * Math.max(1, 1 / this.camera.aspect);
    this.camera.position.set(
      this.target.x + distance * Math.sin(state.yaw) * Math.cos(state.pitch),
      this.target.y + distance * Math.sin(state.pitch),
      this.target.z + distance * Math.cos(state.yaw) * Math.cos(state.pitch),
    );
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
    for (const label of this.labels) {
      if (label.index < 0) this.projected.set(0, -1.2, 0);
      else {
        this.setMoonPosition(this.projected, label.index, state.orbitTime);
        this.projected.y -= this.moonRadii[label.index]! + 0.12;
      }
      this.projected.project(this.camera);
      const visible =
        label.index < 0 ? !moon : systemView || moon === this.system.moons[label.index];
      label.element.hidden =
        !visible ||
        Math.abs(this.projected.x) > 1 ||
        Math.abs(this.projected.y) > 1 ||
        Math.abs(this.projected.z) > 1;
      label.element.style.left = `${((this.projected.x + 1) / 2) * this.width}px`;
      label.element.style.top = `${((1 - this.projected.y) / 2) * this.height}px`;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.abort();
    this.observer.disconnect();
    this.moons.dispose();
    for (const resource of this.resources) resource.dispose();
    this.resources.length = 0;
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    for (const label of this.labels) label.element.remove();
  }

  private setMoonPosition(target: Vector3, index: number, time: number): void {
    const orbit = this.orbitSlots[index]!,
      phase = orbit.phase + time * orbit.speed;
    target.set(
      Math.cos(phase) * orbit.radius,
      Math.sin(phase) * orbit.radius * Math.sin(orbit.inclination),
      Math.sin(phase) * orbit.radius * Math.cos(orbit.inclination),
    );
  }
  private addLabel(text: string, index: number): void {
    const element = document.createElement('span');
    element.className = 'earth-moon-world-label';
    element.textContent = text;
    this.labels.push({ element, index });
    this.host.append(element);
  }
  private loadTexture(url: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      const texture = new TextureLoader().load(url, resolve, undefined, () =>
        reject(new Error('Could not load the local texture.')),
      );
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      this.resources.push(texture);
    });
  }
}
