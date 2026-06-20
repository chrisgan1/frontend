import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { PLAYER_COLORS } from '../../constants';
import type { PlayerState } from '../../types/game';

export class Player3D {
  private group: THREE.Group;
  private body: THREE.Mesh;
  private bodyMat: THREE.MeshStandardMaterial;
  private labelDiv: HTMLDivElement;

  constructor(scene: THREE.Scene, state: PlayerState, isLocal: boolean) {
    this.group = new THREE.Group();

    const color = new THREE.Color(PLAYER_COLORS[state.colorIndex]);

    // Capsule body
    const bodyGeo = new THREE.CapsuleGeometry(14, 22, 4, 8);
    this.bodyMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: isLocal ? 1.2 : 0.8,
      roughness: 0.4,
      metalness: 0.1,
    });
    this.body = new THREE.Mesh(bodyGeo, this.bodyMat);
    this.body.position.y = 25;
    this.body.castShadow = true;
    this.group.add(this.body);

    // Local player glow ring
    if (isLocal) {
      const ringGeo = new THREE.TorusGeometry(20, 2.5, 6, 20);
      const ringMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 2;
      this.group.add(ring);
    }

    // Name label
    this.labelDiv = document.createElement('div');
    this.labelDiv.style.cssText =
      'color:#f3e8ff;font-size:11px;font-family:sans-serif;' +
      'background:rgba(13,10,26,0.75);padding:2px 7px;border-radius:4px;' +
      'pointer-events:none;white-space:nowrap;';
    this.labelDiv.textContent = state.name;
    const label = new CSS2DObject(this.labelDiv);
    label.position.set(0, 58, 0);
    this.group.add(label);

    this.group.position.set(state.x, 0, state.y);
    scene.add(this.group);
  }

  update(state: PlayerState) {
    // Lerp toward server position (non-local players only)
    const target = new THREE.Vector3(state.x, 0, state.y);
    this.group.position.lerp(target, 0.25);

    this.labelDiv.textContent = state.name + (state.isAlive ? '' : ' 💤');
    this.bodyMat.opacity = state.isAlive ? 1 : 0.3;
    this.bodyMat.transparent = !state.isAlive;
  }

  setLocalPosition(x: number, y: number) {
    this.group.position.set(x, 0, y);
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    this.bodyMat.dispose();
  }
}
