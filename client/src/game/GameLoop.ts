import * as THREE from 'three';
import { GameScene } from './Scene';
import { PhysicsWorld } from './Physics';
import { Supermarket } from './Supermarket';
import { Trolley } from './Trolley';
import { Item3D } from './Item';
import { InputHandler } from './InputHandler';
import { ITEM_POOL, PICKUP_RADIUS, COLLISION_SPEED_THRESHOLD } from '../constants';
import { emitPickup, emitCollision, startBroadcast, stopBroadcast } from '../socket';
import type { Player, WorldItem } from '../types';

export class GameLoop {
  private gameScene: GameScene;
  private physics: PhysicsWorld;
  private supermarket: Supermarket;
  private input: InputHandler;

  private localTrolley: Trolley | null = null;
  private remoteTrolleys = new Map<string, Trolley>();
  private items = new Map<string, Item3D>();

  private myId = '';
  private myList: string[] = [];
  private pendingPickups = new Set<string>();
  private collisionCooldown = new Map<string, number>();

  private rafId = 0;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.gameScene = new GameScene(canvas);
    this.physics = new PhysicsWorld();
    this.input = new InputHandler();
    this.supermarket = null!;
  }

  init(
    myId: string,
    myList: string[],
    players: Record<string, Player>,
    worldItems: Record<string, WorldItem>,
    seed: number
  ) {
    this.myId = myId;
    this.myList = myList;
    this.supermarket = new Supermarket(this.gameScene.scene, this.physics, seed);

    // Spawn trolleys
    const playerList = Object.values(players);
    const startPositions = this.generateStartPositions(playerList.length);

    playerList.forEach((p, i) => {
      const trolley = new Trolley(
        p.id,
        p.color,
        p.colorHex,
        p.id === myId,
        this.gameScene.scene,
        this.physics.world
      );
      trolley.setName(p.name);
      const sp = startPositions[i];
      trolley.setPosition(sp.x, sp.z);

      if (p.id === myId) {
        this.localTrolley = trolley;
        // Collision listener
        trolley.body.addEventListener('collide', (e: any) => {
          const otherBody = e.body;
          const otherTrolley = [...this.remoteTrolleys.values()].find(
            (t) => t.body === otherBody
          );
          if (otherTrolley) {
            const now = performance.now();
            const cd = this.collisionCooldown.get(otherTrolley.playerId) ?? 0;
            if (now - cd > 1500) {
              const speed = trolley.getSpeed();
              if (speed > COLLISION_SPEED_THRESHOLD) {
                this.collisionCooldown.set(otherTrolley.playerId, now);
                emitCollision(otherTrolley.playerId, speed);
                this.gameScene.shake(4);
              }
            }
          }
        });
      } else {
        this.remoteTrolleys.set(p.id, trolley);
      }
    });

    // Spawn world items
    for (const [id, wi] of Object.entries(worldItems)) {
      const def = ITEM_POOL.find((d) => d.id === wi.defId);
      if (!def) continue;
      const myPlayer = players[myId];
      const item = new Item3D(wi, def, this.gameScene.scene, myPlayer?.colorHex);
      item.setHighlight(myList.includes(wi.defId), myPlayer?.colorHex ?? '#ffffff');
      this.items.set(id, item);
    }

    startBroadcast(() => this.localTrolley?.getPosition() ?? { x: 0, z: 0, rotY: 0, vx: 0, vz: 0 });
    this.loop(0);
  }

  private generateStartPositions(count: number) {
    const positions = [
      { x: -40, z: -40 },
      { x:  40, z: -40 },
      { x: -40, z:  40 },
      { x:  40, z:  40 },
    ];
    return positions.slice(0, count);
  }

  private loop(now: number) {
    this.rafId = requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    if (now === 0) return;

    const input = this.input.getState();

    if (this.localTrolley) {
      const pos = this.localTrolley.getPosition();
      const inPuddle = this.supermarket.checkJuicePuddle(pos.x, pos.z);
      this.localTrolley.applyInput(input, dt, inPuddle);
      this.checkPickups();
    }

    this.physics.step(now);

    this.localTrolley?.syncMesh();
    for (const t of this.remoteTrolleys.values()) t.syncMesh();

    for (const item of this.items.values()) {
      if (item.mesh.visible) item.update(dt);
    }

    this.gameScene.render();
  }

  private checkPickups() {
    if (!this.localTrolley) return;
    const { x, z } = this.localTrolley.getPosition();

    for (const [id, item] of this.items) {
      if (!item.mesh.visible) continue;
      if (this.pendingPickups.has(id)) continue;
      if (!this.myList.includes(item.defId)) continue;

      const dx = item.mesh.position.x - x;
      const dz = item.mesh.position.z - z;
      if (Math.hypot(dx, dz) < PICKUP_RADIUS) {
        this.pendingPickups.add(id);
        emitPickup(id);
      }
    }
  }

  updateRemotePlayer(id: string, x: number, z: number, rotY: number) {
    this.remoteTrolleys.get(id)?.setTargetTransform(x, z, rotY);
  }

  collectItem(itemId: string) {
    this.items.get(itemId)?.hide();
    this.pendingPickups.delete(itemId);
  }

  dropItem(itemId: string, x: number, z: number) {
    const item = this.items.get(itemId);
    if (item) {
      item.setPosition(x, z);
      item.show();
      this.pendingPickups.delete(itemId);
    }
  }

  respawnItem(itemId: string, x: number, z: number) {
    const item = this.items.get(itemId);
    if (item) {
      item.setPosition(x, z);
      item.show();
    }
  }

  updateMyList(myList: string[]) {
    this.myList = myList;
    const myPlayer = [...(this.remoteTrolleys.values())].find(() => false); // unused, just need colorHex
    for (const item of this.items.values()) {
      item.setHighlight(myList.includes(item.defId), '#ffffff');
    }
  }

  dispose() {
    cancelAnimationFrame(this.rafId);
    stopBroadcast();
    this.input.destroy();
    this.gameScene.dispose();
  }
}
