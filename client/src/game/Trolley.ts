import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { InputState } from '../types';

const FORCE_BASE = 900;
const FORCE_SPRINT = 1500;
const STEER_SPEED = 2.6;
const LINEAR_DAMP = 0.80;
const ANG_DAMP = 0.93;
const SPRINT_LINEAR_DAMP = 0.65;
const WOBBLE_INTERVAL = 180;
const TROLLEY_HALF = new CANNON.Vec3(0.55, 0.5, 0.95);

export class Trolley {
  body: CANNON.Body;
  mesh: THREE.Group;
  playerId: string;
  isLocal: boolean;

  private targetX = 0;
  private targetZ = 0;
  private targetRotY = 0;
  private wobbleTimer = 0;

  constructor(
    playerId: string,
    color: number,
    colorHex: string,
    isLocal: boolean,
    scene: THREE.Scene,
    world: CANNON.World
  ) {
    this.playerId = playerId;
    this.isLocal = isLocal;

    this.body = this.createBody(world);
    this.mesh = this.createMesh(scene, color, colorHex, isLocal);
  }

  private createBody(world: CANNON.World): CANNON.Body {
    const mat = new CANNON.Material({ friction: 0.05, restitution: 0.4 });
    const body = new CANNON.Body({ mass: 40, material: mat });
    body.addShape(new CANNON.Box(TROLLEY_HALF));
    body.linearDamping = LINEAR_DAMP;
    body.angularDamping = ANG_DAMP;
    body.fixedRotation = false;
    // Prevent tipping — only rotate on Y
    body.angularFactor.set(0, 1, 0);
    if (this.isLocal) world.addBody(body);
    return body;
  }

  private createMesh(scene: THREE.Scene, color: number, colorHex: string, isLocal: boolean): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshToonMaterial({ color });
    const grey = new THREE.MeshToonMaterial({ color: 0x888888 });
    const darkMat = new THREE.MeshToonMaterial({ color: 0x333333 });

    // Basket frame — four sides + bottom
    const sides: [number, number, number, number, number, number][] = [
      [0, 0.5, -0.95, 1.1, 0.9, 0.06],  // front
      [0, 0.5,  0.95, 1.1, 0.9, 0.06],  // back
      [-0.55, 0.5, 0, 0.06, 0.9, 1.9],  // left
      [ 0.55, 0.5, 0, 0.06, 0.9, 1.9],  // right
      [0, 0.06, 0, 1.1, 0.06, 1.9],     // bottom
    ];
    for (const [x, y, z, w, h, d] of sides) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      group.add(m);
    }

    // Handle bar
    const handle = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.12), darkMat);
    handle.position.set(0, 1.1, 0.9);
    group.add(handle);

    // Wheels — one slightly skewed for the wobbly wheel gag
    const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.14, 10);
    const wheelPositions: [number, number, number, number][] = [
      [-0.55, -0.28, -0.7, 0],
      [ 0.55, -0.28, -0.7, 0],
      [-0.55, -0.28,  0.7, 0],
      [ 0.55, -0.28,  0.7, 8 * (Math.PI / 180)], // slightly skewed wheel
    ];
    for (const [x, y, z, skew] of wheelPositions) {
      const w = new THREE.Mesh(wheelGeo, grey);
      w.rotation.set(Math.PI / 2, skew, 0);
      w.position.set(x, y, z);
      group.add(w);
    }

    // Glow outline for local player
    if (isLocal) {
      const outlineMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.4,
      });
      const outline = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.92, 2.02), outlineMat);
      outline.position.set(0, 0.5, 0);
      group.add(outline);
    }

    // Name label
    const div = document.createElement('div');
    div.className = 'player-label';
    div.style.color = colorHex;
    div.textContent = ''; // filled in by GameLoop
    const label = new CSS2DObject(div);
    label.position.set(0, 1.6, 0);
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
    this.body.position.set(x, 0.5, z);
    this.mesh.position.set(x, 0.5, z);
    this.targetX = x;
    this.targetZ = z;
  }

  applyInput(input: InputState, dt: number, inPuddle: boolean) {
    this.wobbleTimer += dt * 1000;
    if (this.wobbleTimer > WOBBLE_INTERVAL) {
      this.wobbleTimer = 0;
      this.body.applyTorque(new CANNON.Vec3(0, (Math.random() - 0.5) * 1.2, 0));
    }

    const force = input.sprint ? FORCE_SPRINT : FORCE_BASE;
    if (input.forward !== 0) {
      this.body.applyLocalForce(
        new CANNON.Vec3(0, 0, -input.forward * force),
        CANNON.Vec3.ZERO
      );
    }

    if (input.steer !== 0) {
      this.body.angularVelocity.y = input.steer * STEER_SPEED;
    }

    this.body.linearDamping = inPuddle ? 0.2 : (input.sprint ? SPRINT_LINEAR_DAMP : LINEAR_DAMP);
    this.body.angularDamping = inPuddle ? 0.05 : ANG_DAMP;
  }

  syncMesh() {
    if (this.isLocal) {
      this.mesh.position.set(
        this.body.position.x,
        this.body.position.y,
        this.body.position.z
      );
      this.mesh.quaternion.set(
        this.body.quaternion.x,
        this.body.quaternion.y,
        this.body.quaternion.z,
        this.body.quaternion.w
      );
    } else {
      // Lerp remote trolleys to server position
      this.mesh.position.lerp(new THREE.Vector3(this.targetX, 0.5, this.targetZ), 0.18);
      const targetQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.targetRotY, 0));
      this.mesh.quaternion.slerp(targetQ, 0.15);
    }
  }

  setTargetTransform(x: number, z: number, rotY: number) {
    this.targetX = x;
    this.targetZ = z;
    this.targetRotY = rotY;
  }

  getPosition() {
    return {
      x: this.body.position.x,
      z: this.body.position.z,
      rotY: Math.atan2(
        2 * (this.body.quaternion.w * this.body.quaternion.y),
        1 - 2 * this.body.quaternion.y * this.body.quaternion.y
      ),
      vx: this.body.velocity.x,
      vz: this.body.velocity.z,
    };
  }

  getSpeed() {
    return Math.hypot(this.body.velocity.x, this.body.velocity.z);
  }

  remove(scene: THREE.Scene, world: CANNON.World) {
    scene.remove(this.mesh);
    if (this.isLocal) world.removeBody(this.body);
  }
}
