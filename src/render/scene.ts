import * as THREE from "three";
import { cityPactId, pactById } from "../sim/governance";
import type { ArtPiece, GeoEntity, LayerVisibility, Resident, World } from "../sim/types";

const GEO_ORDER: GeoEntity["kind"][] = [
  "continent",
  "nation",
  "region",
  "state",
  "city",
];

export class WorldScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  readonly renderer: THREE.WebGLRenderer;
  private geoGroups = new Map<string, THREE.Group>();
  private residentMesh: THREE.InstancedMesh | null = null;
  private artGroup = new THREE.Group();
  private labelSprites: THREE.Sprite[] = [];
  private world: World | null = null;
  private layers: LayerVisibility;

  constructor(canvas: HTMLCanvasElement, layers: LayerVisibility) {
    this.layers = { ...layers };
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0b0f14);

    const aspect = window.innerWidth / window.innerHeight;
    const viewH = 800;
    this.camera = new THREE.OrthographicCamera(
      (-viewH * aspect) / 2,
      (viewH * aspect) / 2,
      viewH / 2,
      -viewH / 2,
      0.1,
      5000,
    );
    this.camera.position.set(0, 0, 500);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(this.artGroup);
    window.addEventListener("resize", () => this.resize());
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => this.resize());
    }
    this.resize();
  }

  resize(): void {
    const parent = this.renderer.domElement.parentElement;
    const w = parent?.clientWidth ?? window.innerWidth;
    const h = parent?.clientHeight ?? window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    const viewH = 800 / (this.camera.zoom || 1);
    this.camera.left = (-viewH * aspect) / 2;
    this.camera.right = (viewH * aspect) / 2;
    this.camera.top = viewH / 2;
    this.camera.bottom = -viewH / 2;
    this.camera.updateProjectionMatrix();
  }

  setWorld(world: World): void {
    this.world = world;
    this.rebuildGeo();
    this.rebuildArt();
    this.rebuildResidents();
  }

  setLayers(layers: LayerVisibility): void {
    this.layers = { ...layers };
    this.applyLayerVisibility();
  }

  setZoom(zoom: number): void {
    this.camera.zoom = zoom;
    this.resize();
  }

  setPan(x: number, y: number): void {
    this.camera.position.set(x, y, 500);
  }

  private applyLayerVisibility(): void {
    if (!this.world) return;
    for (const entity of this.world.entities) {
      const g = this.geoGroups.get(entity.id);
      if (!g) continue;
      g.visible = this.layers[entity.kind];
    }
    if (this.residentMesh) {
      this.residentMesh.visible = this.layers.resident;
    }
    this.artGroup.visible = this.layers.art;
  }

  private rebuildGeo(): void {
    if (!this.world) return;
    for (const g of this.geoGroups.values()) {
      this.scene.remove(g);
    }
    this.geoGroups.clear();
    for (const label of this.labelSprites) {
      this.scene.remove(label);
      label.material.map?.dispose();
      label.material.dispose();
    }
    this.labelSprites = [];

    const sorted = [...this.world.entities].sort(
      (a, b) => GEO_ORDER.indexOf(a.kind) - GEO_ORDER.indexOf(b.kind),
    );

    for (const entity of sorted) {
      const group = new THREE.Group();
      group.userData.entityId = entity.id;

      const fill = new THREE.Mesh(
        new THREE.PlaneGeometry(entity.bounds.w, entity.bounds.h),
        new THREE.MeshBasicMaterial({
          color: entity.color,
          transparent: true,
          opacity: entity.kind === "city" ? 0.92 : 0.35,
        }),
      );
      fill.position.set(
        entity.bounds.x + entity.bounds.w / 2,
        -(entity.bounds.y + entity.bounds.h / 2),
        GEO_ORDER.indexOf(entity.kind),
      );
      group.add(fill);

      const pactId =
        entity.kind === "city" && this.world
          ? cityPactId(this.world, entity.id)
          : null;
      const pact = pactId && this.world ? pactById(this.world, pactId) : undefined;
      const isPlayerPact =
        pactId !== null && this.world?.playerPactId === pactId;
      const outlinePad =
        entity.kind === "city" && pact ? (isPlayerPact ? 5 : 3) : 0;
      const edgeW = entity.bounds.w + outlinePad * 2;
      const edgeH = entity.bounds.h + outlinePad * 2;

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(edgeW, edgeH)),
        new THREE.LineBasicMaterial({
          color:
            entity.kind === "city" && pact
              ? pact.color
              : entity.kind === "city"
                ? 0x2a2118
                : 0xffffff,
          transparent: true,
          opacity:
            entity.kind === "city" && pact
              ? isPlayerPact
                ? 1
                : 0.85
              : entity.kind === "continent"
                ? 0.9
                : 0.45,
        }),
      );
      edges.position.set(
        fill.position.x,
        fill.position.y,
        fill.position.z + 0.1,
      );
      group.add(edges);

      if (entity.kind === "city" || entity.kind === "nation") {
        const sprite = this.makeLabel(entity.name, entity.kind === "nation");
        sprite.position.set(
          fill.position.x,
          fill.position.y + entity.bounds.h / 2 - 8,
          fill.position.z + 2,
        );
        this.scene.add(sprite);
        this.labelSprites.push(sprite);
      }

      if (entity.kind === "city") {
        this.addCityStreets(group, entity);
      }

      group.visible = this.layers[entity.kind];
      this.geoGroups.set(entity.id, group);
      this.scene.add(group);
    }
  }

  private addCityStreets(group: THREE.Group, city: GeoEntity): void {
    const { x, y, w, h } = city.bounds;
    const cx = x + w / 2;
    const cy = -(y + h / 2);
    const mat = new THREE.LineBasicMaterial({ color: 0x3e352c, transparent: true, opacity: 0.5 });
    const hGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, cy, 3),
      new THREE.Vector3(x + w, cy, 3),
    ]);
    const vGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(cx, -y, 3),
      new THREE.Vector3(cx, -(y + h), 3),
    ]);
    group.add(new THREE.Line(hGeom, mat));
    group.add(new THREE.Line(vGeom, mat));
  }

  private rebuildResidents(): void {
    if (!this.world) return;
    if (this.residentMesh) {
      this.scene.remove(this.residentMesh);
      this.residentMesh.geometry.dispose();
      (this.residentMesh.material as THREE.Material).dispose();
    }
    const count = this.world.residents.length;
    const geo = new THREE.CircleGeometry(2.2, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.residentMesh = new THREE.InstancedMesh(geo, mat, count);
    this.residentMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.residentMesh.visible = this.layers.resident;
    this.scene.add(this.residentMesh);
    this.updateResidents(this.world.residents);
  }

  updateResidents(residents: Resident[]): void {
    if (!this.residentMesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    residents.forEach((r, i) => {
      dummy.position.set(r.x, -r.y, 12);
      dummy.updateMatrix();
      this.residentMesh!.setMatrixAt(i, dummy.matrix);
      switch (r.role) {
        case "artist":
          color.setHex(0xff6b9d);
          break;
        case "merchant":
          color.setHex(0xffd166);
          break;
        case "worker":
          color.setHex(0x4ecdc4);
          break;
        default:
          color.setHex(0xf8f9fa);
      }
      this.residentMesh!.setColorAt(i, color);
    });
    this.residentMesh.instanceMatrix.needsUpdate = true;
    if (this.residentMesh.instanceColor) {
      this.residentMesh.instanceColor.needsUpdate = true;
    }
  }

  private rebuildArt(): void {
    if (!this.world) return;
    while (this.artGroup.children.length) {
      const c = this.artGroup.children[0]!;
      this.artGroup.remove(c);
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      }
    }
    for (const piece of this.world.art) {
      this.artGroup.add(this.makeArtMesh(piece));
    }
    this.artGroup.visible = this.layers.art;
  }

  private makeArtMesh(piece: ArtPiece): THREE.Group {
    const g = new THREE.Group();
    g.userData.artId = piece.id;
    const color = new THREE.Color().setHSL(piece.hue, 0.75, 0.55);
    let mesh: THREE.Mesh;
    switch (piece.kind) {
      case "sculpture":
        mesh = new THREE.Mesh(
          new THREE.CircleGeometry(5, 6),
          new THREE.MeshBasicMaterial({ color }),
        );
        break;
      case "gallery":
        mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(10, 8),
          new THREE.MeshBasicMaterial({ color: color.offsetHSL(0, 0, -0.15) }),
        );
        break;
      case "monument":
        mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(6, 14),
          new THREE.MeshBasicMaterial({ color }),
        );
        break;
      default:
        mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(14, 6),
          new THREE.MeshBasicMaterial({ color: color.offsetHSL(0.05, 0, 0.1) }),
        );
    }
    mesh.position.set(piece.x, -piece.y, 8);
    g.add(mesh);
    return g;
  }

  private makeLabel(text: string, large: boolean): THREE.Sprite {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const fontSize = large ? 22 : 16;
    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
    const w = ctx.measureText(text).width + 16;
    canvas.width = w;
    canvas.height = fontSize + 12;
    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(11,15,20,0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e8eef5";
    ctx.fillText(text, 8, fontSize + 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    const scale = large ? 1 : 0.85;
    sprite.scale.set(canvas.width * 0.35 * scale, canvas.height * 0.35 * scale, 1);
    return sprite;
  }

  highlightEntity(entity: GeoEntity | null): void {
    for (const [id, group] of this.geoGroups) {
      const fill = group.children[0] as THREE.Mesh | undefined;
      if (!fill?.material || !(fill.material instanceof THREE.MeshBasicMaterial)) {
        continue;
      }
      if (entity && id === entity.id) {
        fill.material.opacity = entity.kind === "city" ? 1 : 0.55;
        fill.material.color.offsetHSL(0, 0, 0.08);
      }
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  pick(screenX: number, screenY: number): string | null {
    if (!this.world) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const nx = (screenX - rect.left) / rect.width;
    const ny = (screenY - rect.top) / rect.height;
    const ndc = new THREE.Vector2(nx * 2 - 1, -(ny * 2 - 1));
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObjects(this.scene.children, true);
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        if (o.userData.entityId) return o.userData.entityId as string;
        o = o.parent;
      }
    }
    return null;
  }
}
