import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { ItemDef, WorldItem } from '../types';

const ITEM_Y = 1.4;

export class Item3D {
  instanceId: string;
  defId: string;
  mesh: THREE.Group;
  orbMesh: THREE.Mesh;
  private glowRing: THREE.Mesh;
  private isOnList = false;
  private isHovered = false;

  constructor(item: WorldItem, def: ItemDef, scene: THREE.Scene, playerColorHex?: string) {
    this.instanceId = item.instanceId;
    this.defId = item.defId;

    const group = new THREE.Group();

    const orbMat = new THREE.MeshToonMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.1 });
    this.orbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), orbMat);
    this.orbMesh.castShadow = true;
    group.add(this.orbMesh);

    const ringMat = new THREE.MeshBasicMaterial({
      color: playerColorHex ? parseInt(playerColorHex.replace('#', ''), 16) : 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.glowRing = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.66, 20), ringMat);
    this.glowRing.rotation.x = -Math.PI / 2;
    this.glowRing.position.y = -0.36;
    group.add(this.glowRing);

    const div = document.createElement('div');
    div.className = 'item-label';
    div.textContent = `${def.emoji} ${def.name}`;
    const label = new CSS2DObject(div);
    label.position.set(0, 0.55, 0);
    group.add(label);

    group.position.set(item.x, ITEM_Y, item.z);
    scene.add(group);
    this.mesh = group;
  }

  setHighlight(on: boolean, colorHex: string) {
    this.isOnList = on;
    const mat = this.glowRing.material as THREE.MeshBasicMaterial;
    mat.opacity = on ? 0.85 : 0;
    if (colorHex) mat.color.set(colorHex);
    this.updateEmissive();
  }

  setRaycastHover(on: boolean) {
    this.isHovered = on;
    this.updateEmissive();
  }

  private updateEmissive() {
    const mat = this.orbMesh.material as THREE.MeshToonMaterial;
    if (this.isHovered) mat.emissiveIntensity = 0.75;
    else if (this.isOnList) mat.emissiveIntensity = 0.35;
    else mat.emissiveIntensity = 0.1;
  }

  setPosition(x: number, z: number) {
    this.mesh.position.set(x, ITEM_Y, z);
  }

  hide() { this.mesh.visible = false; }
  show() { this.mesh.visible = true; }

  update(dt: number) {
    this.mesh.rotation.y += dt * 0.8;
  }

  remove(scene: THREE.Scene) {
    scene.remove(this.mesh);
  }
}
