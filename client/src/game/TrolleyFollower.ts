import * as THREE from 'three';

export class TrolleyFollower {
  mesh: THREE.Group;
  private targetPos = new THREE.Vector3();
  private targetYaw = 0;

  constructor(color: number, scene: THREE.Scene) {
    const group = new THREE.Group();
    const mat = new THREE.MeshToonMaterial({ color });
    const grey = new THREE.MeshToonMaterial({ color: 0x888888 });
    const dark = new THREE.MeshToonMaterial({ color: 0x333333 });

    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      group.add(mesh);
      return mesh;
    };

    // Basket sides
    add(new THREE.BoxGeometry(1.1, 0.9, 0.07), mat, 0,   0.5, -0.95);
    add(new THREE.BoxGeometry(1.1, 0.9, 0.07), mat, 0,   0.5,  0.95);
    add(new THREE.BoxGeometry(0.07, 0.9, 1.9), mat, -0.55, 0.5, 0);
    add(new THREE.BoxGeometry(0.07, 0.9, 1.9), mat,  0.55, 0.5, 0);
    add(new THREE.BoxGeometry(1.1,  0.07, 1.9), mat, 0,   0.06, 0);
    // Handle
    add(new THREE.BoxGeometry(1.2, 0.12, 0.12), dark, 0, 1.1, 0.9);
    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.14, 10);
    add(wGeo, grey, -0.55, -0.28, -0.7);
    add(wGeo, grey,  0.55, -0.28, -0.7);
    add(wGeo, grey, -0.55, -0.28,  0.7);
    const skewedWheel = add(wGeo, grey, 0.55, -0.28, 0.7);
    skewedWheel.rotation.z = (8 * Math.PI) / 180;

    scene.add(group);
    this.mesh = group;
  }

  update(targetX: number, targetZ: number, yaw: number, dt: number) {
    void dt;
    this.targetPos.set(targetX, 0, targetZ);
    this.mesh.position.lerp(this.targetPos, 0.1);
    // Lerp rotation
    let diff = yaw - this.targetYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.targetYaw += diff * 0.1;
    this.mesh.rotation.y = this.targetYaw;
  }

  remove(scene: THREE.Scene) {
    scene.remove(this.mesh);
  }
}
