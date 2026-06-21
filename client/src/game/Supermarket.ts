import * as THREE from 'three';
import type { PhysicsWorld } from './Physics';
import { MAP_HALF, AISLE_Z_POSITIONS, JUICE_PUDDLE_COUNT, JUICE_PUDDLE_RADIUS } from '../constants';

const TOON_MAT = (color: number) =>
  new THREE.MeshToonMaterial({ color });

const SHELF_COLORS = [0xffe0b2, 0xc8e6c9, 0xbbdefb, 0xf8bbd9, 0xfff9c4];
const FLOOR_TILES = [0xf5f5f5, 0xe0e0e0];

interface JuicePuddle {
  x: number;
  z: number;
}

export class Supermarket {
  juicePuddles: JuicePuddle[] = [];
  private activeSlip = false;
  private slipTimer = 0;

  constructor(scene: THREE.Scene, physics: PhysicsWorld, seed: number) {
    this.buildFloor(scene);
    this.buildShelves(scene, physics);
    this.buildProduceIsland(scene, physics);
    this.buildCheckout(scene, physics);
    this.buildJuicePuddles(scene, seed);
  }

  private buildFloor(scene: THREE.Scene) {
    const size = MAP_HALF * 2;
    const divisions = 20;
    const tileSize = size / divisions;

    for (let ix = 0; ix < divisions; ix++) {
      for (let iz = 0; iz < divisions; iz++) {
        const geo = new THREE.PlaneGeometry(tileSize - 0.1, tileSize - 0.1);
        const col = (ix + iz) % 2 === 0 ? FLOOR_TILES[0] : FLOOR_TILES[1];
        const mat = new THREE.MeshToonMaterial({ color: col });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(
          -MAP_HALF + tileSize * (ix + 0.5),
          0.01,
          -MAP_HALF + tileSize * (iz + 0.5)
        );
        mesh.receiveShadow = true;
        scene.add(mesh);
      }
    }
  }

  private buildShelves(scene: THREE.Scene, physics: PhysicsWorld) {
    const shelfLength = 70;
    const shelfH = 4;
    const shelfD = 3;
    const unitCount = 10;
    const unitW = shelfLength / unitCount;

    AISLE_Z_POSITIONS.forEach((aisleZ, aisleIdx) => {
      const color = SHELF_COLORS[aisleIdx % SHELF_COLORS.length];

      for (let i = 0; i < unitCount; i++) {
        const x = -shelfLength / 2 + unitW * (i + 0.5);
        // Skip centre units for produce access
        if (Math.abs(x) < 8 && aisleIdx === 2) continue;

        const geo = new THREE.BoxGeometry(unitW - 0.5, shelfH, shelfD);
        const mat = TOON_MAT(color);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, shelfH / 2, aisleZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        // Shelf edge stripe
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(unitW - 0.5, 0.3, 0.1),
          TOON_MAT(0x333333)
        );
        stripe.position.set(x, shelfH, aisleZ - shelfD / 2 - 0.05);
        scene.add(stripe);

        physics.addStaticBox(x, shelfH / 2, aisleZ, (unitW - 0.5) / 2, shelfH / 2, shelfD / 2);
      }
    });
  }

  private buildProduceIsland(scene: THREE.Scene, physics: PhysicsWorld) {
    const tableH = 1.5;
    const tableR = 5;

    const geo = new THREE.CylinderGeometry(tableR, tableR * 1.05, tableH, 16);
    const mat = TOON_MAT(0xa5d6a7);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, tableH / 2, 0);
    mesh.castShadow = true;
    scene.add(mesh);

    // Decorative top ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(tableR, 0.25, 8, 24),
      TOON_MAT(0x66bb6a)
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, tableH, 0);
    scene.add(ring);

    physics.addStaticBox(0, tableH / 2, 0, tableR, tableH / 2, tableR);
  }

  private buildCheckout(scene: THREE.Scene, physics: PhysicsWorld) {
    const z = MAP_HALF - 6;
    for (let i = -2; i <= 2; i++) {
      const x = i * 14;
      const geo = new THREE.BoxGeometry(10, 3, 3);
      const mat = TOON_MAT(0xffcc02);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 1.5, z);
      mesh.castShadow = true;
      scene.add(mesh);
      physics.addStaticBox(x, 1.5, z, 5, 1.5, 1.5);
    }

    // Sign above checkout
    const signGeo = new THREE.BoxGeometry(30, 2, 0.3);
    const sign = new THREE.Mesh(signGeo, TOON_MAT(0xff4757));
    sign.position.set(0, 8, z - 1);
    scene.add(sign);
  }

  private buildJuicePuddles(scene: THREE.Scene, seed: number) {
    let s = seed;
    const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };

    for (let i = 0; i < JUICE_PUDDLE_COUNT; i++) {
      const x = (rng() - 0.5) * (MAP_HALF * 1.4);
      const z = (rng() - 0.5) * (MAP_HALF * 1.4);
      this.juicePuddles.push({ x, z });

      const curve = new THREE.EllipseCurve(0, 0, JUICE_PUDDLE_RADIUS * 1.4, JUICE_PUDDLE_RADIUS, 0, Math.PI * 2);
      const pts = curve.getPoints(24);
      const shape = new THREE.Shape(pts);
      const geo = new THREE.ShapeGeometry(shape);
      const mat = new THREE.MeshToonMaterial({ color: 0xff9800, transparent: true, opacity: 0.55 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.02, z);
      scene.add(mesh);
    }
  }

  checkJuicePuddle(trolleyX: number, trolleyZ: number): boolean {
    return this.juicePuddles.some(
      (p) => Math.hypot(p.x - trolleyX, p.z - trolleyZ) < JUICE_PUDDLE_RADIUS
    );
  }

  /** Returns shelf X positions for a given aisle index (for item placement) */
  getShelfPositions(aisleIdx: number): { x: number; z: number }[] {
    const positions: { x: number; z: number }[] = [];
    const shelfLength = 70;
    const unitCount = 10;
    const unitW = shelfLength / unitCount;
    const z = AISLE_Z_POSITIONS[aisleIdx] ?? 0;

    for (let i = 0; i < unitCount; i++) {
      const x = -shelfLength / 2 + unitW * (i + 0.5);
      if (Math.abs(x) < 8 && aisleIdx === 2) continue;
      positions.push({ x, z: z - 2 });
    }
    return positions;
  }
}
