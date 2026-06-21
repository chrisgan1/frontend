import * as CANNON from 'cannon-es';
import { MAP_HALF } from '../constants';

export class PhysicsWorld {
  world: CANNON.World;
  private lastTime = 0;

  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
    this.world.broadphase = new CANNON.NaiveBroadphase();
    (this.world.solver as any).iterations = 8;
    this.addFloor();
    this.addWalls();
  }

  private addFloor() {
    const floor = new CANNON.Body({ mass: 0, material: new CANNON.Material({ friction: 0.01 }) });
    floor.addShape(new CANNON.Plane());
    floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(floor);
  }

  private addWalls() {
    const H = MAP_HALF + 1;
    const wallDefs: [number, number, number, number, number, number][] = [
      [0, 5, -H, H + 2, 6, 1],
      [0, 5,  H, H + 2, 6, 1],
      [-H, 5, 0, 1, 6, H + 2],
      [ H, 5, 0, 1, 6, H + 2],
    ];
    for (const [x, y, z, hw, hh, hd] of wallDefs) {
      const body = new CANNON.Body({ mass: 0 });
      body.addShape(new CANNON.Box(new CANNON.Vec3(hw, hh, hd)));
      body.position.set(x, y, z);
      this.world.addBody(body);
    }
  }

  addStaticBox(x: number, y: number, z: number, hw: number, hh: number, hd: number) {
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(new CANNON.Box(new CANNON.Vec3(hw, hh, hd)));
    body.position.set(x, y, z);
    this.world.addBody(body);
    return body;
  }

  step(now: number) {
    if (this.lastTime === 0) { this.lastTime = now; return; }
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.world.step(1 / 60, dt, 3);
    this.lastTime = now;
  }
}
