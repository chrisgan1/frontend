import * as THREE from 'three';
import type { TaskState } from '../../types/game';

const TEAL = new THREE.Color(0x06b6d4);
const RED = new THREE.Color(0xdc2626);
const WHITE = new THREE.Color(0xffffff);

export class Task3D {
  private group: THREE.Group;
  private ring: THREE.Mesh;
  private ringMat: THREE.MeshLambertMaterial;
  private fillMat: THREE.MeshLambertMaterial;
  private fillMesh: THREE.Mesh;
  private glowLight: THREE.PointLight;

  constructor(scene: THREE.Scene, state: TaskState) {
    this.group = new THREE.Group();

    // Outer rotating ring
    const ringGeo = new THREE.TorusGeometry(24, 4, 8, 28);
    this.ringMat = new THREE.MeshLambertMaterial({
      color: TEAL,
      emissive: TEAL,
      emissiveIntensity: 1.8,
    });
    this.ring = new THREE.Mesh(ringGeo, this.ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 65;
    this.group.add(this.ring);

    // Fill circle (progress indicator, grows from 0 opacity to 1)
    const fillGeo = new THREE.CircleGeometry(18, 24);
    this.fillMat = new THREE.MeshLambertMaterial({
      color: WHITE,
      emissive: WHITE,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.fillMesh = new THREE.Mesh(fillGeo, this.fillMat);
    this.fillMesh.rotation.x = Math.PI / 2;
    this.fillMesh.position.y = 65;
    this.group.add(this.fillMesh);

    // Point light for glow
    this.glowLight = new THREE.PointLight(0x06b6d4, 1.5, 110);
    this.glowLight.position.y = 65;
    this.group.add(this.glowLight);

    this.group.position.set(state.x, 0, state.y);
    scene.add(this.group);
    this.updateState(state);
  }

  updateState(state: TaskState) {
    const corrupted = state.isCorrupted;
    const c = corrupted ? RED : TEAL;
    this.ringMat.color.set(c);
    this.ringMat.emissive.set(c);
    this.glowLight.color.set(corrupted ? RED : TEAL);

    const progress = Math.min(1, state.progressMs / 2000);
    this.fillMat.opacity = progress;
  }

  tick(delta: number) {
    this.ring.rotation.z += delta * 1.6;
    this.ring.position.y = 65 + Math.sin(Date.now() * 0.0018) * 6;
    this.fillMesh.position.y = this.ring.position.y;
    this.glowLight.position.y = this.ring.position.y;
    this.glowLight.intensity = 1.3 + Math.sin(Date.now() * 0.003) * 0.4;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    this.ringMat.dispose();
    this.fillMat.dispose();
    this.glowLight.dispose();
  }
}
