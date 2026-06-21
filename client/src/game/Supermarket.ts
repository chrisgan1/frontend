import * as THREE from 'three';
import type { PhysicsWorld } from './Physics';
import { MAP_HALF, AISLE_Z_POSITIONS, JUICE_PUDDLE_RADIUS } from '../constants';

const SHELF_HEIGHT = 5.0;
const SHELF_DEPTH = 1.6;
const SHELF_HALF_DEPTH = SHELF_DEPTH / 2;
// Shelf face sits 2 units from aisle center; center is 0.8 further back
const SHELF_FACE_OFFSET = 2.0;
const SHELF_CENTER_OFFSET = SHELF_FACE_OFFSET + SHELF_HALF_DEPTH; // 2.8
const CEILING_Y = 5.5;
const SECTION_W = 14;
const SECTIONS = 6;
const HALF_SHELF_LEN = (SECTIONS * SECTION_W) / 2; // 42

const SHELF_COLORS = [0xffe0b2, 0xc8e6c9, 0xbbdefb, 0xf8bbd9, 0xfff9c4];

interface JuicePuddle { x: number; z: number; }

export class Supermarket {
  juicePuddles: JuicePuddle[] = [];

  constructor(scene: THREE.Scene, physics: PhysicsWorld, seed: number) {
    this.buildFloor(scene);
    this.buildCeiling(scene);
    this.buildBoundaryWalls(scene);

    let s = seed;
    const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };

    AISLE_Z_POSITIONS.forEach((aisleZ, idx) => {
      this.buildAisleWalls(scene, physics, aisleZ, idx);
      this.buildAisleLights(scene, aisleZ);
      this.buildAisleObstacles(scene, physics, aisleZ, rng);
      this.buildJuicePuddle(scene, aisleZ, rng);
    });
  }

  private buildFloor(scene: THREE.Scene) {
    const size = MAP_HALF * 2;
    const divs = 18;
    const ts = size / divs;
    for (let ix = 0; ix < divs; ix++) {
      for (let iz = 0; iz < divs; iz++) {
        const col = (ix + iz) % 2 === 0 ? 0xf2f2f2 : 0xdedede;
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(ts - 0.06, ts - 0.06),
          new THREE.MeshToonMaterial({ color: col })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(-MAP_HALF + ts * (ix + 0.5), 0.01, -MAP_HALF + ts * (iz + 0.5));
        mesh.receiveShadow = true;
        scene.add(mesh);
      }
    }
  }

  private buildCeiling(scene: THREE.Scene) {
    // Low ceiling covers the aisle area
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF_SHELF_LEN * 2 + 8, 68),
      new THREE.MeshToonMaterial({ color: 0xcdd0d0 })
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(0, CEILING_Y, -6);
    scene.add(mesh);
  }

  private buildBoundaryWalls(scene: THREE.Scene) {
    // Visual end-caps at west and east
    for (const x of [-HALF_SHELF_LEN - 2, HALF_SHELF_LEN + 2]) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, SHELF_HEIGHT, 80),
        new THREE.MeshToonMaterial({ color: 0x5a5a6a })
      );
      mesh.position.set(x, SHELF_HEIGHT / 2, -6);
      scene.add(mesh);
    }
    // Visual north/south outer walls
    for (const z of [-38, 26]) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(HALF_SHELF_LEN * 2 + 8, SHELF_HEIGHT, 0.8),
        new THREE.MeshToonMaterial({ color: 0x5a5a6a })
      );
      mesh.position.set(0, SHELF_HEIGHT / 2, z);
      scene.add(mesh);
    }
  }

  private buildAisleWalls(scene: THREE.Scene, physics: PhysicsWorld, aisleZ: number, aisleIdx: number) {
    const color = SHELF_COLORS[aisleIdx % SHELF_COLORS.length];
    const ledgeMat = new THREE.MeshToonMaterial({ color: 0x888888 });

    // North wall (items face south, toward aisle center)
    // South wall (also faces toward aisle center)
    for (const side of [-1, 1] as const) {
      const wallZ = aisleZ + side * SHELF_CENTER_OFFSET;

      for (let s = 0; s < SECTIONS; s++) {
        const x = -HALF_SHELF_LEN + SECTION_W * (s + 0.5); // -35, -21, -7, 7, 21, 35

        const back = new THREE.Mesh(
          new THREE.BoxGeometry(SECTION_W - 0.3, SHELF_HEIGHT, SHELF_DEPTH),
          new THREE.MeshToonMaterial({ color })
        );
        back.position.set(x, SHELF_HEIGHT / 2, wallZ);
        back.castShadow = true;
        back.receiveShadow = true;
        scene.add(back);

        // Item shelf ledge at Y=1.4
        const ledge1 = new THREE.Mesh(new THREE.BoxGeometry(SECTION_W - 0.3, 0.08, SHELF_DEPTH), ledgeMat);
        ledge1.position.set(x, 1.44, wallZ);
        scene.add(ledge1);

        // Mid shelf ledge at Y=2.9
        const ledge2 = new THREE.Mesh(new THREE.BoxGeometry(SECTION_W - 0.3, 0.08, SHELF_DEPTH), ledgeMat);
        ledge2.position.set(x, 2.94, wallZ);
        scene.add(ledge2);
      }

      // Single physics body for the entire wall
      physics.addStaticBox(0, SHELF_HEIGHT / 2, wallZ, HALF_SHELF_LEN, SHELF_HEIGHT / 2, SHELF_HALF_DEPTH);
    }
  }

  private buildAisleLights(scene: THREE.Scene, aisleZ: number) {
    for (let x = -27; x <= 27; x += 18) {
      const spot = new THREE.SpotLight(0xfff8e8, 2.8, 22, Math.PI / 5, 0.5, 1.2);
      spot.position.set(x, CEILING_Y - 0.3, aisleZ);
      spot.target.position.set(x, 0, aisleZ);
      spot.castShadow = false;
      scene.add(spot);
      scene.add(spot.target);
    }
  }

  private buildAisleObstacles(scene: THREE.Scene, physics: PhysicsWorld, aisleZ: number, rng: () => number) {
    const xSlots = [-32, -16, 0, 16, 32];
    for (const baseX of xSlots) {
      const x = baseX + (rng() - 0.5) * 4;
      const z = aisleZ + (rng() - 0.5) * 0.7;
      const type = Math.floor(rng() * 3);
      this.placeObstacle(scene, physics, type, x, z);
    }
  }

  private placeObstacle(scene: THREE.Scene, physics: PhysicsWorld, type: number, x: number, z: number) {
    if (type === 0) {
      // Cardboard box stack
      const brown = new THREE.MeshToonMaterial({ color: 0xc47c38 });
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.65, 0.88), brown);
      b1.position.set(x, 0.325, z);
      b1.castShadow = true;
      scene.add(b1);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.58, 0.76), brown);
      b2.position.set(x + 0.08, 0.975, z - 0.08);
      b2.castShadow = true;
      scene.add(b2);
      physics.addStaticBox(x, 0.65, z, 0.44, 0.65, 0.44);

    } else if (type === 1) {
      // Stock cart
      const grey = new THREE.MeshToonMaterial({ color: 0x9e9e9e });
      const cart = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.9, 0.72), grey);
      cart.position.set(x, 0.45, z);
      cart.castShadow = true;
      scene.add(cart);
      const dark = new THREE.MeshToonMaterial({ color: 0x333333 });
      for (const [wx, wz] of [[-0.5, 0.28], [0.5, 0.28], [-0.5, -0.28], [0.5, -0.28]]) {
        const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 8), dark);
        wh.rotation.z = Math.PI / 2;
        wh.position.set(x + wx, 0.11, z + wz);
        scene.add(wh);
      }
      physics.addStaticBox(x, 0.45, z, 0.57, 0.45, 0.36);

    } else {
      // Floor display stand
      const accent = new THREE.MeshToonMaterial({ color: 0xff6b35 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.14, 10), accent);
      base.position.set(x, 0.07, z);
      scene.add(base);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 1.4, 8),
        new THREE.MeshToonMaterial({ color: 0x888888 })
      );
      pole.position.set(x, 0.84, z);
      scene.add(pole);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.1, 10), accent);
      top.position.set(x, 1.58, z);
      scene.add(top);
      physics.addStaticBox(x, 0.8, z, 0.38, 0.8, 0.38);
    }
  }

  private buildJuicePuddle(scene: THREE.Scene, aisleZ: number, rng: () => number) {
    const x = (rng() - 0.5) * 60;
    const z = aisleZ + (rng() - 0.5) * 0.9;
    this.juicePuddles.push({ x, z });

    const curve = new THREE.EllipseCurve(0, 0, JUICE_PUDDLE_RADIUS * 1.4, JUICE_PUDDLE_RADIUS, 0, Math.PI * 2);
    const shape = new THREE.Shape(curve.getPoints(24));
    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshToonMaterial({ color: 0xff9800, transparent: true, opacity: 0.55 })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, z);
    scene.add(mesh);
  }

  checkJuicePuddle(x: number, z: number): boolean {
    return this.juicePuddles.some((p) => Math.hypot(p.x - x, p.z - z) < JUICE_PUDDLE_RADIUS);
  }

  getShelfPositions(aisleIdx: number): { x: number; z: number }[] {
    const aisleZ = AISLE_Z_POSITIONS[aisleIdx] ?? 0;
    const z = aisleZ - SHELF_FACE_OFFSET;
    const positions: { x: number; z: number }[] = [];
    for (let i = 0; i < SECTIONS; i++) {
      positions.push({ x: -HALF_SHELF_LEN + SECTION_W * (i + 0.5), z });
    }
    return positions;
  }
}
