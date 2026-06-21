// Remote player character mesh — lerped to server position, no physics
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class Trolley {
  playerId: string;
  mesh: THREE.Group;
  // Dummy body so existing code compiles
  body = {
    addEventListener: () => {},
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, z: 0 },
  } as any;

  private targetPos = new THREE.Vector3();
  private targetYaw = 0;

  constructor(
    playerId: string,
    color: number,
    colorHex: string,
    _isLocal: boolean,
    scene: THREE.Scene,
    _world: any
  ) {
    this.playerId = playerId;
    this.mesh = this.buildMesh(color, colorHex, scene);
  }

  private buildMesh(color: number, colorHex: string, scene: THREE.Scene): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshToonMaterial({ color });
    const skin = new THREE.MeshToonMaterial({ color: 0xf5c5a3 });

    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      group.add(mesh);
    };

    add(new THREE.BoxGeometry(0.55, 0.75, 0.28), mat,    0,    0.9, 0);
    add(new THREE.SphereGeometry(0.24, 8, 6),    skin,   0,    1.62, 0);
    add(new THREE.BoxGeometry(0.14, 0.55, 0.14), mat,  -0.38, 0.9, 0);
    add(new THREE.BoxGeometry(0.14, 0.55, 0.14), mat,   0.38, 0.9, 0);
    add(new THREE.BoxGeometry(0.22, 0.65, 0.22), mat,  -0.14, 0.35, 0);
    add(new THREE.BoxGeometry(0.22, 0.65, 0.22), mat,   0.14, 0.35, 0);

    const div = document.createElement('div');
    div.className = 'player-label';
    div.style.color = colorHex;
    const label = new CSS2DObject(div);
    label.position.set(0, 2.05, 0);
    label.name = 'nameLabel';
    group.add(label);

    scene.add(group);
    return group;
  }

  setName(name: string) {
    const label = this.mesh.getObjectByName('nameLabel') as CSS2DObject | undefined;
    if (label) (label.element as HTMLDivElement).textContent = name;
  }

  setPosition(x: number, z: number) {
    this.mesh.position.set(x, 0, z);
    this.targetPos.set(x, 0, z);
  }

  setTargetTransform(x: number, z: number, rotY: number) {
    this.targetPos.set(x, 0, z);
    this.targetYaw = rotY;
  }

  syncMesh() {
    this.mesh.position.lerp(this.targetPos, 0.16);
    let diff = this.targetYaw - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * 0.15;
  }

  getPosition() {
    return { x: this.targetPos.x, z: this.targetPos.z, rotY: this.targetYaw, vx: 0, vz: 0 };
  }

  getSpeed() { return 0; }
  applyInput() {}

  remove(scene: THREE.Scene) {
    scene.remove(this.mesh);
  }
}
