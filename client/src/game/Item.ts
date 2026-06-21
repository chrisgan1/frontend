import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { ItemDef, WorldItem } from '../types';

export class Item3D {
  instanceId: string;
  defId: string;
  mesh: THREE.Group;
  private glowRing: THREE.Mesh;
  private isHighlighted = false;

  constructor(item: WorldItem, def: ItemDef, scene: THREE.Scene, playerColorHex?: string) {
    this.instanceId = item.instanceId;
    this.defId = item.defId;

    const group = new THREE.Group();

    // Main orb
    const orbGeo = new THREE.SphereGeometry(0.4, 10, 8);
    const orbMat = new THREE.MeshToonMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.15 });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.castShadow = true;
    group.add(orb);

    // Glow ring underneath (shows if item is on your list)
    const ringGeo = new THREE.RingGeometry(0.5, 0.7, 20);
    const ringMat = new THREE.MeshBasicMaterial({
      color: playerColorHex ? parseInt(playerColorHex.replace('#', '0x')) : 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.glowRing = new THREE.Mesh(ringGeo, ringMat);
    this.glowRing.rotation.x = -Math.PI / 2;
    this.glowRing.position.y = -0.38;
    group.add(this.glowRing);

    // CSS2D label
    const div = document.createElement('div');
    div.className = 'item-label';
    div.textContent = `${def.emoji} ${def.name}`;
    const label = new CSS2DObject(div);
    label.position.set(0, 0.7, 0);
    group.add(label);

    group.position.set(item.x, 0.55, item.z);
    scene.add(group);
    this.mesh = group;
  }

  setHighlight(on: boolean, colorHex: string) {
    if (this.isHighlighted === on) return;
    this.isHighlighted = on;
    const mat = this.glowRing.material as THREE.MeshBasicMaterial;
    mat.opacity = on ? 0.85 : 0;
    mat.color.set(colorHex);
  }

  setPosition(x: number, z: number) {
    this.mesh.position.set(x, 0.55, z);
  }

  hide() {
    this.mesh.visible = false;
  }

  show() {
    this.mesh.visible = true;
  }

  update(dt: number) {
    // Gentle bob
    this.mesh.position.y = 0.55 + Math.sin(Date.now() * 0.002 + this.mesh.position.x) * 0.08;
    // Slow rotation
    this.mesh.rotation.y += dt * 0.8;
  }

  remove(scene: THREE.Scene) {
    scene.remove(this.mesh);
  }
}
