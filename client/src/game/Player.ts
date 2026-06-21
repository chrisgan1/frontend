import * as CANNON from 'cannon-es';
import * as THREE from 'three';

const WALK_SPEED = 5.5;
const SPRINT_SPEED = 10;
const LERP = 0.28;

export class Player {
  body: CANNON.Body;

  constructor(world: CANNON.World, startX: number, startZ: number) {
    this.body = new CANNON.Body({ mass: 70 });
    // Two-sphere capsule approximation
    this.body.addShape(new CANNON.Sphere(0.38), new CANNON.Vec3(0, 0.38, 0));
    this.body.addShape(new CANNON.Sphere(0.38), new CANNON.Vec3(0, 1.12, 0));
    this.body.linearDamping = 0.9;
    this.body.fixedRotation = true;
    this.body.position.set(startX, 0, startZ);
    world.addBody(this.body);
  }

  applyMovement(forward: number, strafe: number, yaw: number, sprint: boolean) {
    const maxV = sprint ? SPRINT_SPEED : WALK_SPEED;

    // Forward direction (camera looking -Z when yaw=0)
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    // Right strafe direction
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    const targetVX = (fwdX * forward + rightX * strafe) * maxV;
    const targetVZ = (fwdZ * forward + rightZ * strafe) * maxV;

    this.body.velocity.x += (targetVX - this.body.velocity.x) * LERP;
    this.body.velocity.z += (targetVZ - this.body.velocity.z) * LERP;
  }

  getEyePosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.body.position.x,
      this.body.position.y + 1.3,
      this.body.position.z
    );
  }

  getPosition() {
    return { x: this.body.position.x, z: this.body.position.z };
  }

  isMoving(): boolean {
    return Math.hypot(this.body.velocity.x, this.body.velocity.z) > 0.5;
  }

  remove(world: CANNON.World) {
    world.removeBody(this.body);
  }
}
