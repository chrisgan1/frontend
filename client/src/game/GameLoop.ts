import * as THREE from 'three';
import { GameScene } from './Scene';
import { PhysicsWorld } from './Physics';
import { Supermarket } from './Supermarket';
import { Trolley } from './Trolley';
import { TrolleyFollower } from './TrolleyFollower';
import { Player as PlayerCapsule } from './Player';
import { Item3D } from './Item';
import { InputHandler } from './InputHandler';
import { ITEM_POOL } from '../constants';
import { emitPickup, startBroadcast, stopBroadcast } from '../socket';
import type { Player as PlayerData, WorldItem } from '../types';

export class GameLoop {
  private gameScene: GameScene;
  private physics: PhysicsWorld;
  private supermarket: Supermarket;
  readonly input: InputHandler;

  private player: PlayerCapsule | null = null;
  private trolleyFollower: TrolleyFollower | null = null;
  private remotePlayers = new Map<string, Trolley>();
  private items = new Map<string, Item3D>();
  private orbToItem = new Map<THREE.Mesh, Item3D>();

  private myId = '';
  private myList: string[] = [];
  private myColorHex = '#ffffff';
  private pendingPickups = new Set<string>();

  private raycaster = new THREE.Raycaster();
  private hoveredItem: Item3D | null = null;
  private onHoverChange?: (label: string | null) => void;

  private rafId = 0;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.gameScene = new GameScene(canvas);
    this.physics = new PhysicsWorld();
    this.input = new InputHandler(canvas);
    this.supermarket = null!;
  }

  setLockCallback(cb: (locked: boolean) => void) {
    this.input.onLockChange = cb;
  }

  setHoverCallback(cb: (label: string | null) => void) {
    this.onHoverChange = cb;
  }

  init(
    myId: string,
    myList: string[],
    players: Record<string, PlayerData>,
    worldItems: Record<string, WorldItem>,
    seed: number
  ) {
    this.myId = myId;
    this.myList = myList;

    this.supermarket = new Supermarket(this.gameScene.scene, this.physics, seed);

    const startPositions = [
      { x: -44, z: -30 },
      { x:  44, z: -18 },
      { x: -44, z:  -6 },
      { x:  44, z:   6 },
    ];

    const playerList = Object.values(players);
    const myPlayer = players[myId];
    this.myColorHex = myPlayer?.colorHex ?? '#ffffff';

    playerList.forEach((p, i) => {
      const sp = startPositions[i % startPositions.length];
      if (p.id === myId) {
        this.player = new PlayerCapsule(this.physics.world, sp.x, sp.z);
        this.trolleyFollower = new TrolleyFollower(p.color, this.gameScene.scene);
      } else {
        const t = new Trolley(p.id, p.color, p.colorHex, false, this.gameScene.scene, this.physics.world);
        t.setName(p.name);
        t.setPosition(sp.x, sp.z);
        this.remotePlayers.set(p.id, t);
      }
    });

    for (const wi of Object.values(worldItems)) {
      const def = ITEM_POOL.find((d) => d.id === wi.defId);
      if (!def) continue;
      const item = new Item3D(wi, def, this.gameScene.scene, this.myColorHex);
      item.setHighlight(myList.includes(wi.defId), this.myColorHex);
      this.items.set(wi.instanceId, item);
      this.orbToItem.set(item.orbMesh, item);
    }

    startBroadcast(() => {
      const pos = this.player?.getPosition() ?? { x: 0, z: 0 };
      return { x: pos.x, z: pos.z, rotY: this.input.yaw, vx: 0, vz: 0 };
    });

    this.loop(0);
  }

  private loop(now: number) {
    this.rafId = requestAnimationFrame((t) => this.loop(t));
    if (now === 0) return;

    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.player) {
      if (this.input.isLocked) {
        const { forward, strafe, sprint } = this.input.getMovement();
        this.player.applyMovement(forward, strafe, this.input.yaw, sprint);
      }

      this.physics.step(now);

      const eyePos = this.player.getEyePosition();

      // Juice puddle: reduce braking while slipping
      this.player.body.linearDamping = this.supermarket.checkJuicePuddle(eyePos.x, eyePos.z) ? 0.25 : 0.9;

      this.gameScene.updateCamera(this.input.yaw, this.input.pitch, eyePos, this.player.isMoving(), dt);

      // Trolley trails 2 units behind player
      const pos = this.player.getPosition();
      const behindX = pos.x + Math.sin(this.input.yaw) * 2.2;
      const behindZ = pos.z + Math.cos(this.input.yaw) * 2.2;
      this.trolleyFollower?.update(behindX, behindZ, this.input.yaw, dt);
    } else {
      this.physics.step(now);
    }

    // Raycaster hover + grab (only when pointer is locked)
    if (this.input.isLocked) {
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.gameScene.camera);
      const orbMeshes = [...this.orbToItem.keys()].filter((m) => m.parent?.visible !== false);
      const hits = this.raycaster.intersectObjects(orbMeshes);

      const prevHovered = this.hoveredItem;
      this.hoveredItem = null;
      if (hits.length > 0 && hits[0].distance < 2.8) {
        this.hoveredItem = this.orbToItem.get(hits[0].object as THREE.Mesh) ?? null;
      }

      if (prevHovered !== this.hoveredItem) {
        prevHovered?.setRaycastHover(false);
        this.hoveredItem?.setRaycastHover(true);
        const grabbable = this.hoveredItem && this.myList.includes(this.hoveredItem.defId);
        const def = grabbable ? ITEM_POOL.find((d) => d.id === this.hoveredItem!.defId) : null;
        this.onHoverChange?.(def ? `${def.emoji} ${def.name}` : null);
      }

      if (this.input.consumeGrab()) {
        const target = this.hoveredItem;
        if (target && !this.pendingPickups.has(target.instanceId) && this.myList.includes(target.defId)) {
          this.gameScene.triggerGrabAnim();
          this.pendingPickups.add(target.instanceId);
          emitPickup(target.instanceId);
        }
      }
    } else if (this.hoveredItem) {
      this.hoveredItem.setRaycastHover(false);
      this.hoveredItem = null;
      this.onHoverChange?.(null);
    }

    // Sync remote humanoids
    for (const t of this.remotePlayers.values()) t.syncMesh();

    // Rotate items
    for (const item of this.items.values()) {
      if (item.mesh.visible) item.update(dt);
    }

    this.gameScene.render(dt);
  }

  updateRemotePlayer(id: string, x: number, z: number, rotY: number) {
    this.remotePlayers.get(id)?.setTargetTransform(x, z, rotY);
  }

  collectItem(itemId: string) {
    const item = this.items.get(itemId);
    if (item) {
      this.orbToItem.delete(item.orbMesh);
      if (this.hoveredItem === item) {
        this.hoveredItem = null;
        this.onHoverChange?.(null);
      }
      item.hide();
    }
    this.pendingPickups.delete(itemId);
  }

  dropItem(itemId: string, x: number, z: number) {
    const item = this.items.get(itemId);
    if (item) {
      item.setPosition(x, z);
      this.orbToItem.set(item.orbMesh, item);
      item.show();
    }
    this.pendingPickups.delete(itemId);
  }

  respawnItem(itemId: string, x: number, z: number) {
    const item = this.items.get(itemId);
    if (item) {
      item.setPosition(x, z);
      this.orbToItem.set(item.orbMesh, item);
      item.show();
    }
  }

  updateMyList(myList: string[]) {
    this.myList = myList;
    for (const item of this.items.values()) {
      item.setHighlight(myList.includes(item.defId), this.myColorHex);
    }
  }

  dispose() {
    cancelAnimationFrame(this.rafId);
    stopBroadcast();
    this.input.destroy();
    this.gameScene.dispose();
    if (this.player) this.player.remove(this.physics.world);
    if (this.trolleyFollower) this.trolleyFollower.remove(this.gameScene.scene);
    for (const t of this.remotePlayers.values()) t.remove(this.gameScene.scene);
  }
}
