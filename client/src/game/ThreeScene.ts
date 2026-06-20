import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { socket, movePlayer, startTask, completeTask, cancelTask, corruptObject } from '../socket';
import { useGameStore } from '../store/useGameStore';
import { Player3D } from './entities/Player3D';
import { Task3D } from './entities/Task3D';
import { RoomObj3D } from './entities/RoomObj3D';
import { TASK_HOLD_MS, INTERACTION_RADIUS, MOVE_SPEED, MOVE_EMIT_INTERVAL } from '../constants';
import type { GameState, TaskState, RoomObjectState } from '../types/game';

export class ThreeScene {
  private renderer!: THREE.WebGLRenderer;
  private css2dRenderer!: CSS2DRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private animFrameId = 0;

  private players = new Map<string, Player3D>();
  private tasks = new Map<string, Task3D>();
  private roomObjects = new Map<string, RoomObj3D>();

  private keys: Record<string, boolean> = {};
  private localX = 400;
  private localY = 300;
  private lastMoveEmit = 0;
  private taskHoldStart: number | null = null;
  private taskHoldId: string | null = null;

  private cleanupInput!: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.setupRenderer();
    this.setupScene();
    this.setupLighting();
    this.setupInput();
    this.setupSocketListeners();
    this.animate();
  }

  private setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.domElement.style.cssText =
      'position:absolute;top:0;left:0;pointer-events:none;';
    this.container.appendChild(this.css2dRenderer.domElement);

    this.onResize();
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    const w = this.container.clientWidth || 1280;
    const h = this.container.clientHeight || 720;
    this.renderer?.setSize(w, h);
    this.css2dRenderer?.setSize(w, h);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  };

  private setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0a1a);
    this.scene.fog = new THREE.FogExp2(0x0d0a1a, 0.006);

    // Ground platform
    const groundGeo = new THREE.PlaneGeometry(800, 600, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x130d26,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(400, 0, 300);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Dreamy grid
    const grid = new THREE.GridHelper(800, 16, 0x7c3aed, 0x3b1f6e);
    grid.position.set(400, 1, 300);
    this.scene.add(grid);

    // Platform edge glow strips
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.4,
    });
    [
      [400, -3, 0,   800, 6, 8],
      [400, -3, 600, 800, 6, 8],
      [0,   -3, 300, 8, 6, 600],
      [800, -3, 300, 8, 6, 600],
    ].forEach(([x, y, z, w, h, d]) => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), edgeMat);
      e.position.set(x, y, z);
      this.scene.add(e);
    });

    // Isometric camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(42, aspect, 1, 3000);
    this.camera.position.set(400, 620, 940);
    this.camera.lookAt(400, 0, 300);
  }

  private setupLighting() {
    // Bright white base so MeshStandardMaterial colours show up
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    // Dream-tinted fill
    this.scene.add(new THREE.AmbientLight(0x4a2080, 1.8));

    const sun = new THREE.DirectionalLight(0xffd6ff, 2.5);
    sun.position.set(300, 500, 200);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(sun);

    const teal = new THREE.PointLight(0x06b6d4, 3, 800);
    teal.position.set(650, 220, 80);
    this.scene.add(teal);

    const gold = new THREE.PointLight(0xf59e0b, 2.5, 600);
    gold.position.set(150, 220, 520);
    this.scene.add(gold);

    // Back fill light so objects are never completely dark
    const back = new THREE.DirectionalLight(0x7c3aed, 1.2);
    back.position.set(-300, 300, 400);
    this.scene.add(back);
  }

  private setupInput() {
    const onDown = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      this.keys[k] = false;
      if (k === 'e' && this.taskHoldStart !== null) {
        this.taskHoldStart = null;
        this.taskHoldId = null;
        cancelTask();
      }
    };
    document.addEventListener('keydown', onDown);
    document.addEventListener('keyup', onUp);
    this.cleanupInput = () => {
      document.removeEventListener('keydown', onDown);
      document.removeEventListener('keyup', onUp);
    };
  }

  private setupSocketListeners() {
    socket.on('game-state', (state: GameState) => {
      this.syncGameState(state);
      useGameStore.getState().setGameState(state);
    });

    // Initialise local player position when game starts (App.tsx handles phase/role)
    socket.on('game-started', ({ gameState }: { role: 'figment' | 'nightmare'; gameState: GameState }) => {
      const myId = useGameStore.getState().myId;
      const me = gameState.players.find(p => p.id === myId);
      if (me) { this.localX = me.x; this.localY = me.y; }
    });
  }

  private syncGameState(state: GameState) {
    const myId = useGameStore.getState().myId;

    // Players
    const seen = new Set<string>();
    for (const p of state.players) {
      seen.add(p.id);
      if (!this.players.has(p.id)) {
        this.players.set(p.id, new Player3D(this.scene, p, p.id === myId));
      }
      const p3d = this.players.get(p.id)!;
      if (p.id === myId) {
        p3d.setLocalPosition(this.localX, this.localY);
      } else {
        p3d.update(p);
      }
    }
    for (const [id, p3d] of this.players) {
      if (!seen.has(id)) { p3d.dispose(this.scene); this.players.delete(id); }
    }

    // Room objects (created once)
    if (this.roomObjects.size === 0) {
      state.objects.forEach((obj: RoomObjectState, i: number) => {
        this.roomObjects.set(obj.id, new RoomObj3D(this.scene, obj, i));
      });
    } else {
      for (const obj of state.objects) {
        this.roomObjects.get(obj.id)?.updateCorruption(obj.isCorrupted);
      }
    }

    // Tasks
    const activeTasks = new Set<string>();
    for (const t of state.tasks) {
      if (t.isComplete) continue;
      activeTasks.add(t.id);
      if (!this.tasks.has(t.id)) {
        this.tasks.set(t.id, new Task3D(this.scene, t));
      }
      this.tasks.get(t.id)!.updateState(t);
    }
    for (const [id, t3d] of this.tasks) {
      if (!activeTasks.has(id)) { t3d.dispose(this.scene); this.tasks.delete(id); }
    }
  }

  private processInput(delta: number) {
    const store = useGameStore.getState();
    if (store.phase !== 'playing') return;

    const speed = MOVE_SPEED * delta;
    let moved = false;

    if (this.keys['a'] || this.keys['arrowleft'])  { this.localX -= speed; moved = true; }
    if (this.keys['d'] || this.keys['arrowright']) { this.localX += speed; moved = true; }
    if (this.keys['w'] || this.keys['arrowup'])    { this.localY -= speed; moved = true; }
    if (this.keys['s'] || this.keys['arrowdown'])  { this.localY += speed; moved = true; }

    this.localX = Math.max(30, Math.min(770, this.localX));
    this.localY = Math.max(30, Math.min(570, this.localY));

    if (moved) {
      const now = Date.now();
      if (now - this.lastMoveEmit > MOVE_EMIT_INTERVAL) {
        movePlayer(this.localX, this.localY);
        this.lastMoveEmit = now;
      }
    }

    const myId = store.myId;
    const myRole = store.myRole;
    const gs = store.gameState;
    if (!myId || !gs) return;

    // Update local player visual
    this.players.get(myId)?.setLocalPosition(this.localX, this.localY);

    // E key — task interaction (Figments only)
    if (myRole === 'figment' && this.keys['e']) {
      const nearby = (gs.tasks as TaskState[]).find(t => {
        if (t.isComplete) return false;
        const dx = this.localX - t.x, dy = this.localY - t.y;
        return Math.sqrt(dx * dx + dy * dy) < INTERACTION_RADIUS;
      });
      if (nearby) {
        if (this.taskHoldId !== nearby.id) {
          this.taskHoldStart = Date.now();
          this.taskHoldId = nearby.id;
          startTask(nearby.id);
        } else if (this.taskHoldStart && Date.now() - this.taskHoldStart >= TASK_HOLD_MS) {
          completeTask(nearby.id);
          this.taskHoldStart = null;
          this.taskHoldId = null;
        }
      }
    } else if (!this.keys['e'] && this.taskHoldStart !== null) {
      this.taskHoldStart = null;
      this.taskHoldId = null;
      cancelTask();
    }

    // F key — corrupt nearby object (Nightmare only, single press)
    if (myRole === 'nightmare' && this.keys['f']) {
      const nearby = gs.objects.find((o: RoomObjectState) => {
        if (o.isCorrupted) return false;
        const dx = this.localX - o.x, dy = this.localY - o.y;
        return Math.sqrt(dx * dx + dy * dy) < INTERACTION_RADIUS;
      });
      if (nearby) {
        corruptObject(nearby.id);
        this.keys['f'] = false; // consume key so it doesn't spam
      }
    }
  }

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    this.processInput(delta);

    for (const [, t] of this.tasks) t.tick(delta);

    this.renderer.render(this.scene, this.camera);
    this.css2dRenderer.render(this.scene, this.camera);
  };

  destroy() {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    this.cleanupInput?.();
    socket.off('game-state');
    socket.off('game-started');
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}
