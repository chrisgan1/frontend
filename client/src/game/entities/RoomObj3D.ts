import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { RoomObjectState } from '../../types/game';

const SHAPE_GEOS = [
  () => new THREE.BoxGeometry(55, 38, 55),
  () => new THREE.CylinderGeometry(22, 22, 48, 8),
  () => new THREE.SphereGeometry(28, 7, 5),
  () => new THREE.ConeGeometry(24, 58, 6),
  () => new THREE.TorusGeometry(22, 10, 6, 10),
];

const OBJECT_COLORS = [0x7c3aed, 0x06b6d4, 0xf59e0b, 0x10b981, 0xf43f5e, 0x3b82f6, 0xa855f7, 0x14b8a6];
const CORRUPT_COLOR = new THREE.Color(0x7f1d1d);
const CORRUPT_EMISSIVE = new THREE.Color(0xdc2626);

export class RoomObj3D {
  private group: THREE.Group;
  private mat: THREE.MeshStandardMaterial;
  private normalColor: THREE.Color;
  private isCorrupted = false;

  constructor(scene: THREE.Scene, state: RoomObjectState, shapeIndex: number) {
    this.group = new THREE.Group();

    const col = new THREE.Color(OBJECT_COLORS[shapeIndex % OBJECT_COLORS.length]);
    this.normalColor = col.clone();

    const geo = SHAPE_GEOS[shapeIndex % SHAPE_GEOS.length]();
    this.mat = new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: 1.2,
      roughness: 0.4,
      metalness: 0.2,
    });

    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.position.y = 28;
    mesh.castShadow = true;
    this.group.add(mesh);

    // Floating label
    const div = document.createElement('div');
    div.style.cssText =
      'color:#a78bfa;font-size:10px;font-family:sans-serif;text-align:center;' +
      'pointer-events:none;text-shadow:0 0 8px #7c3aed;white-space:nowrap;';
    div.textContent = state.label;
    const labelObj = new CSS2DObject(div);
    labelObj.position.set(0, 62, 0);
    this.group.add(labelObj);

    this.group.position.set(state.x, 0, state.y);
    scene.add(this.group);
  }

  updateCorruption(isCorrupted: boolean) {
    if (this.isCorrupted === isCorrupted) return;
    this.isCorrupted = isCorrupted;
    if (isCorrupted) {
      this.mat.color.set(CORRUPT_COLOR);
      this.mat.emissive.set(CORRUPT_EMISSIVE);
      this.mat.emissiveIntensity = 1.5;
    } else {
      this.mat.color.copy(this.normalColor);
      this.mat.emissive.copy(this.normalColor);
      this.mat.emissiveIntensity = 1.2;
    }
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    this.mat.dispose();
  }
}
