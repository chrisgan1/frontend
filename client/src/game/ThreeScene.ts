import * as THREE from 'three';
import { socket, movePlayer, shootAt, propTaunt, setPropDisguise, propUseMove } from '../socket';
import { useGameStore } from '../store/useGameStore';
import {
  PROP_TYPES, SCENE_OBJECTS,
  ROOM_SIZE, ROOM_HEIGHT, EYE_HEIGHT,
  MOVE_SPEED_HUNTER, MOVE_SPEED_PROP,
  MOVE_EMIT_INTERVAL, MOUSE_SENSITIVITY,
} from '../constants';
import { touchState } from './touchState';
import type { GameState, PlayerState } from '../types/game';

type PropTypeDef = typeof PROP_TYPES[number];

function getPropType(id: string): PropTypeDef | undefined {
  return PROP_TYPES.find(t => t.id === id) as PropTypeDef | undefined;
}

function buildPropMesh(typeId: string, highlight = false): THREE.Object3D {
  const pt = getPropType(typeId);
  if (!pt) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x888888 }),
    );
    return mesh;
  }

  const color = highlight ? 0x9b4dca : pt.color;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  if (highlight) {
    (mat as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x6b21a8);
    mat.emissiveIntensity = 0.25;
  }

  let geo: THREE.BufferGeometry;
  if (pt.shape === 'cylinder') {
    const r = 'r' in pt ? (pt as { r: number }).r : 0.5;
    geo = new THREE.CylinderGeometry(r, r, pt.h, 16);
  } else {
    const w = 'w' in pt ? (pt as { w: number }).w : 1;
    const d = 'd' in pt ? (pt as { d: number }).d : 1;
    geo = new THREE.BoxGeometry(w, pt.h, d);
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function propHalfHeight(typeId: string): number {
  const pt = getPropType(typeId);
  return pt ? pt.h / 2 : 0.25;
}

export class ThreeScene {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private container: HTMLElement;
  private animFrameId = 0;

  // Local player state
  private localX = 10;
  private localZ = 10;
  private localYaw = 0;
  private localPitch = 0;
  private lastMoveEmit = 0;

  // Input
  private keys: Record<string, boolean> = {};
  private isPointerLocked = false;
  private cleanupFns: Array<() => void> = [];

  // Remote players: map of playerId → Object3D (character or disguise mesh)
  private playerObjects = new Map<string, THREE.Object3D>();
  // Raycasting targets: only live disguised props
  private shootTargets = new Map<string, { playerId: string; obj: THREE.Object3D }>();

  // Taunt markers
  private tauntMarkers = new Map<string, { mesh: THREE.Object3D; expiresAt: number }>();

  // Muzzle flash sprite
  private muzzleFlash: THREE.Mesh | null = null;
  private muzzleFlashExpiry = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupRenderer();
    this.buildScene();
    this.setupInput();
    this.setupSocketListeners();
    this.animate();
  }

  // ─── Renderer ────────────────────────────────────────────────────────────────

  private setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
    this.onResize();
    const onResize = this.onResize;
    window.addEventListener('resize', onResize);
    this.cleanupFns.push(() => window.removeEventListener('resize', onResize));
  }

  private onResize = () => {
    const w = this.container.clientWidth || 1280;
    const h = this.container.clientHeight || 720;
    this.renderer.setSize(w, h);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  };

  // ─── Scene ───────────────────────────────────────────────────────────────────

  private buildScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xc8bfaf);
    this.scene.fog = new THREE.Fog(0xc8bfaf, 18, 30);

    const W = ROOM_SIZE;
    const H = ROOM_HEIGHT;

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(W, W),
      new THREE.MeshStandardMaterial({ color: 0x9e8870, roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(W / 2, 0, W / 2);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(W, W),
      new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.9 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(W / 2, H, W / 2);
    this.scene.add(ceiling);

    const wallMat = (c: number) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });

    const addWall = (
      geo: THREE.PlaneGeometry,
      mat: THREE.MeshStandardMaterial,
      px: number, py: number, pz: number,
      ry: number,
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.rotation.y = ry;
      m.position.set(px, py, pz);
      m.receiveShadow = true;
      this.scene.add(m);
    };

    const wallGeoZ = new THREE.PlaneGeometry(W, H);
    const wallGeoX = new THREE.PlaneGeometry(W, H);
    addWall(wallGeoZ, wallMat(0xddd5c5),  W / 2, H / 2, 0,   0);          // N
    addWall(new THREE.PlaneGeometry(W, H), wallMat(0xd5ccbc),  W / 2, H / 2, W,   Math.PI);  // S
    addWall(wallGeoX, wallMat(0xd8d0c0),  0,     H / 2, W / 2, Math.PI / 2);   // W
    addWall(new THREE.PlaneGeometry(W, H), wallMat(0xd0c8b8),  W,     H / 2, W / 2, -Math.PI / 2); // E

    // Ceiling lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    [[W / 4, H - 0.1, W / 4], [3 * W / 4, H - 0.1, W / 4],
     [W / 4, H - 0.1, 3 * W / 4], [3 * W / 4, H - 0.1, 3 * W / 4]].forEach(([x, y, z]) => {
      const light = new THREE.PointLight(0xfff5e0, 1.2, 14);
      light.position.set(x, y, z);
      light.castShadow = true;
      light.shadow.mapSize.set(512, 512);
      this.scene.add(light);
    });

    // Static scene objects
    for (const so of SCENE_OBJECTS) {
      const mesh = buildPropMesh(so.typeId);
      const halfH = propHalfHeight(so.typeId);
      mesh.position.set(so.x, halfH, so.z);
      this.scene.add(mesh);
    }

    // Camera — added to scene so its children (muzzle flash) render
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.05, 60);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.updateCamera();
  }

  // ─── Input ───────────────────────────────────────────────────────────────────

  private setupInput() {
    const onDown = (e: KeyboardEvent) => {
      this.keys[e.code] = true;

      if (e.code === 'Tab') {
        e.preventDefault();
        const store = useGameStore.getState();
        if (store.myRole === 'prop') {
          store.setShowDisguiseMenu(!store.showDisguiseMenu);
        }
      }

      if (e.code === 'KeyT') {
        const store = useGameStore.getState();
        if (store.myRole === 'prop' && store.phase === 'hunting') propTaunt();
      }

      if (e.code === 'Space') {
        e.preventDefault();
        const store = useGameStore.getState();
        if (store.myRole === 'prop' && store.phase === 'hunting') propUseMove();
      }
    };

    const onUp = (e: KeyboardEvent) => { this.keys[e.code] = false; };

    const onClick = () => {
      if (!this.isPointerLocked) {
        this.container.requestPointerLock?.();
        return;
      }
      const store = useGameStore.getState();
      if (store.myRole === 'hunter' && store.phase === 'hunting') this.doShoot();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isPointerLocked) return;
      this.localYaw -= e.movementX * MOUSE_SENSITIVITY;
      this.localPitch -= e.movementY * MOUSE_SENSITIVITY;
      this.localPitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, this.localPitch));
    };

    const onLockChange = () => {
      this.isPointerLocked = document.pointerLockElement === this.container ||
                             document.pointerLockElement === this.renderer.domElement;
    };

    document.addEventListener('keydown', onDown);
    document.addEventListener('keyup', onUp);
    this.container.addEventListener('click', onClick);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onLockChange);

    this.cleanupFns.push(
      () => document.removeEventListener('keydown', onDown),
      () => document.removeEventListener('keyup', onUp),
      () => this.container.removeEventListener('click', onClick),
      () => document.removeEventListener('mousemove', onMouseMove),
      () => document.removeEventListener('pointerlockchange', onLockChange),
    );
  }

  // ─── Shooting ────────────────────────────────────────────────────────────────

  private doShoot() {
    const targets = Array.from(this.shootTargets.values()).map(v => v.obj);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const hits = raycaster.intersectObjects(targets, true);
    if (hits.length > 0) {
      const hitObj = hits[0].object;
      for (const [, entry] of this.shootTargets) {
        if (entry.obj === hitObj || (entry.obj as THREE.Group).children?.includes(hitObj)) {
          shootAt(entry.playerId);
          this.showMuzzleFlash();
          return;
        }
      }
    }

    shootAt(null);
    this.showMuzzleFlash();
  }

  private showMuzzleFlash() {
    if (!this.muzzleFlash) {
      const geo = new THREE.PlaneGeometry(0.15, 0.15);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.9, depthTest: false });
      this.muzzleFlash = new THREE.Mesh(geo, mat);
      this.camera.add(this.muzzleFlash);
      this.muzzleFlash.position.set(0.12, -0.08, -0.3);
    }
    (this.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0.9;
    this.muzzleFlash.visible = true;
    this.muzzleFlashExpiry = Date.now() + 80;
  }

  // ─── Socket listeners ────────────────────────────────────────────────────────

  private setupSocketListeners() {
    const onGameState = (state: GameState) => {
      useGameStore.getState().setGameState(state);
      this.syncPlayers(state);
    };

    const onGameStarted = ({ role, gameState }: { role: string; gameState: GameState }) => {
      void role;
      const myId = useGameStore.getState().myId;
      const me = gameState.players.find(p => p.id === myId);
      if (me) { this.localX = me.x; this.localZ = me.z; this.localYaw = me.yaw; }
      useGameStore.getState().setGameState(gameState);
      this.syncPlayers(gameState);
    };

    const onPhaseHiding = ({ gameState }: { gameState: GameState }) => {
      const myId = useGameStore.getState().myId;
      const me = gameState.players.find(p => p.id === myId);
      if (me) { this.localX = me.x; this.localZ = me.z; this.localYaw = me.yaw; }
      useGameStore.getState().setGameState(gameState);
      this.syncPlayers(gameState);
    };

    const onPhaseHunting = ({ gameState }: { gameState: GameState }) => {
      useGameStore.getState().setGameState(gameState);
      this.syncPlayers(gameState);
    };

    const onPropDisguised = ({ propId, typeId }: { propId: string; typeId: string }) => {
      const gs = useGameStore.getState().gameState;
      const player = gs?.players.find(p => p.id === propId);
      if (player) this.updatePropObject(player, typeId);
    };

    const onPropMoveStarted = ({ propId }: { propId: string }) => {
      // Visual feedback: briefly highlight the prop
      const obj = this.playerObjects.get(propId);
      if (obj) {
        const mesh = obj as THREE.Mesh;
        if (mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial);
          mat.emissive?.setHex(0x7c3aed);
          mat.emissiveIntensity = 0.6;
          setTimeout(() => { mat.emissive?.setHex(0); mat.emissiveIntensity = 0; }, 300);
        }
      }
    };

    const onPropFound = ({ propId }: { propId: string }) => {
      this.removePropObject(propId);
    };

    const onPropTaunt = ({ propId, x, z, name }: { propId: string; x: number; z: number; name: string }) => {
      this.addTauntMarker(propId, x, z, name);
    };

    socket.on('game-state', onGameState);
    socket.on('game-started', onGameStarted);
    socket.on('phase-hiding', onPhaseHiding);
    socket.on('phase-hunting', onPhaseHunting);
    socket.on('prop-disguised', onPropDisguised);
    socket.on('prop-move-started', onPropMoveStarted);
    socket.on('prop-found', onPropFound);
    socket.on('prop-taunt', onPropTaunt);

    this.cleanupFns.push(
      () => socket.off('game-state', onGameState),
      () => socket.off('game-started', onGameStarted),
      () => socket.off('phase-hiding', onPhaseHiding),
      () => socket.off('phase-hunting', onPhaseHunting),
      () => socket.off('prop-disguised', onPropDisguised),
      () => socket.off('prop-move-started', onPropMoveStarted),
      () => socket.off('prop-found', onPropFound),
      () => socket.off('prop-taunt', onPropTaunt),
    );
  }

  // ─── Player sync ─────────────────────────────────────────────────────────────

  private syncPlayers(state: GameState) {
    const myId = useGameStore.getState().myId;
    const seen = new Set<string>();

    for (const p of state.players) {
      if (p.id === myId) continue;
      seen.add(p.id);

      if (!p.isAlive) {
        this.removePropObject(p.id);
        continue;
      }

      if (p.role === 'hunter') {
        this.updateHunterObject(p);
      } else if (p.role === 'prop' && p.disguise) {
        this.updatePropObject(p, p.disguise);
      } else if (p.role === 'prop') {
        // Undisguised prop — only visible during hiding
        this.updateUndisguisedProp(p);
      }
    }

    // Remove players that left
    for (const id of this.playerObjects.keys()) {
      if (!seen.has(id)) this.removePropObject(id);
    }
  }

  private updateHunterObject(p: PlayerState) {
    let obj = this.playerObjects.get(p.id) as THREE.Group | undefined;
    if (!obj) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.28, 1.0, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xf43f5e }),
      );
      body.position.y = 0.84;
      body.castShadow = true;
      group.add(body);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24 }),
      );
      head.position.y = 1.6;
      group.add(head);
      this.scene.add(group);
      this.playerObjects.set(p.id, group);
      obj = group;
    }
    obj.position.lerp(new THREE.Vector3(p.x, 0, p.z), 0.2);
    obj.rotation.y = p.yaw;
  }

  private updatePropObject(p: PlayerState, typeId: string) {
    this.removePropObject(p.id);

    const myRole = useGameStore.getState().myRole;
    // During hunting, props are highlighted purple for other props (not hunters)
    const highlight = (myRole === 'prop');
    const obj = buildPropMesh(typeId, highlight);
    const halfH = propHalfHeight(typeId);
    obj.position.set(p.x, halfH, p.z);
    this.scene.add(obj);
    this.playerObjects.set(p.id, obj);

    // Only hunters can shoot; only living disguised props are targets
    const phase = useGameStore.getState().phase;
    if (myRole === 'hunter' && p.isAlive && phase === 'hunting') {
      this.shootTargets.set(p.id, { playerId: p.id, obj });
    }
  }

  private updateUndisguisedProp(p: PlayerState) {
    let obj = this.playerObjects.get(p.id) as THREE.Mesh | undefined;
    if (!obj) {
      obj = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0x7c3aed, emissive: 0x7c3aed, emissiveIntensity: 0.5 }),
      );
      this.scene.add(obj);
      this.playerObjects.set(p.id, obj);
    }
    obj.position.lerp(new THREE.Vector3(p.x, 0.35, p.z), 0.2);
  }

  private removePropObject(playerId: string) {
    const obj = this.playerObjects.get(playerId);
    if (obj) {
      this.scene.remove(obj);
      this.playerObjects.delete(playerId);
    }
    this.shootTargets.delete(playerId);
  }

  // ─── Taunt markers ───────────────────────────────────────────────────────────

  private addTauntMarker(propId: string, x: number, z: number, _name: string) {
    const existing = this.tauntMarkers.get(propId);
    if (existing) this.scene.remove(existing.mesh);

    const group = new THREE.Group();

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.35 + i * 0.25, 0.05, 6, 24),
        new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.9 - i * 0.25 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = i * 0.3;
      group.add(ring);
    }

    group.position.set(x, 0.05, z);
    this.scene.add(group);
    this.tauntMarkers.set(propId, { mesh: group, expiresAt: Date.now() + 3500 });
  }

  // ─── Input processing ────────────────────────────────────────────────────────

  private processInput(delta: number) {
    const store = useGameStore.getState();
    const phase = store.phase;
    const myRole = store.myRole;

    // Touch inputs
    if (touchState.lookYaw !== 0 || touchState.lookPitch !== 0) {
      this.localYaw -= touchState.lookYaw;
      this.localPitch -= touchState.lookPitch;
      this.localPitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, this.localPitch));
      touchState.lookYaw = 0;
      touchState.lookPitch = 0;
    }
    if (touchState.shoot) {
      touchState.shoot = false;
      if (myRole === 'hunter' && phase === 'hunting') this.doShoot();
    }
    if (touchState.taunt) {
      touchState.taunt = false;
      if (myRole === 'prop' && phase === 'hunting') propTaunt();
    }
    if (touchState.useMove) {
      touchState.useMove = false;
      if (myRole === 'prop' && phase === 'hunting') propUseMove();
    }

    const canMove =
      (phase === 'hiding' && myRole === 'prop') ||
      (phase === 'hunting' && myRole === 'hunter') ||
      (phase === 'hunting' && myRole === 'prop');

    if (!canMove) return;

    // For props during hunting, movement is gated server-side by move window
    const speed = (myRole === 'hunter') ? MOVE_SPEED_HUNTER : MOVE_SPEED_PROP;

    const forward = new THREE.Vector3(-Math.sin(this.localYaw), 0, -Math.cos(this.localYaw));
    const right = new THREE.Vector3(Math.cos(this.localYaw), 0, -Math.sin(this.localYaw));
    const dir = new THREE.Vector3();

    if (this.keys['KeyW'] || this.keys['ArrowUp'])    dir.addScaledVector(forward, 1);
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  dir.addScaledVector(forward, -1);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dir.addScaledVector(right, 1);
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  dir.addScaledVector(right, -1);

    // Touch joystick
    if (touchState.moveDx !== 0 || touchState.moveDz !== 0) {
      dir.addScaledVector(right, touchState.moveDx);
      dir.addScaledVector(forward, -touchState.moveDz);
    }

    if (dir.length() > 0) {
      dir.normalize();
      const margin = 0.4;
      this.localX = Math.max(margin, Math.min(ROOM_SIZE - margin, this.localX + dir.x * speed * delta));
      this.localZ = Math.max(margin, Math.min(ROOM_SIZE - margin, this.localZ + dir.z * speed * delta));

      const now = Date.now();
      if (now - this.lastMoveEmit > MOVE_EMIT_INTERVAL) {
        movePlayer(this.localX, this.localZ, this.localYaw);
        this.lastMoveEmit = now;
      }
    }
  }

  private updateCamera() {
    this.camera.position.set(this.localX, EYE_HEIGHT, this.localZ);
    this.camera.rotation.set(this.localPitch, this.localYaw, 0, 'YXZ');
  }

  // ─── Animation loop ──────────────────────────────────────────────────────────

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.processInput(delta);
    this.updateCamera();

    // Expire taunt markers
    const now = Date.now();
    for (const [id, marker] of this.tauntMarkers) {
      if (now > marker.expiresAt) {
        this.scene.remove(marker.mesh);
        this.tauntMarkers.delete(id);
      }
    }

    // Hide muzzle flash
    if (this.muzzleFlash && this.muzzleFlash.visible && now > this.muzzleFlashExpiry) {
      this.muzzleFlash.visible = false;
    }

    this.renderer.render(this.scene, this.camera);
  };

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  destroy() {
    cancelAnimationFrame(this.animFrameId);
    this.cleanupFns.forEach(fn => fn());
    document.exitPointerLock?.();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
