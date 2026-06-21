import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export class GameScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  labelRenderer: CSS2DRenderer;

  private rightArm!: THREE.Mesh;
  private grabAnimTimer = 0;
  private readonly GRAB_DURATION = 0.22;
  private bobTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a2030);
    this.scene.fog = new THREE.Fog(0x2a2030, 18, 55);

    this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.05, 150);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera); // needed so arm children render

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    canvas.parentElement?.appendChild(this.labelRenderer.domElement);

    this.buildArmMeshes();
    this.setupLighting();
    this.handleResize(canvas);
  }

  private buildArmMeshes() {
    const skinMat = new THREE.MeshToonMaterial({ color: 0xf5c5a3, depthTest: false });
    const sleeveMat = new THREE.MeshToonMaterial({ color: 0x4a90d9, depthTest: false });

    // Right forearm
    const arm = new THREE.Group();
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.55), sleeveMat);
    forearm.renderOrder = 999;
    arm.add(forearm);
    // Hand at the tip
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), skinMat);
    hand.position.z = -0.33;
    hand.renderOrder = 999;
    arm.add(hand);

    arm.position.set(0.26, -0.26, -0.35);
    this.camera.add(arm);
    this.rightArm = arm as unknown as THREE.Mesh;
  }

  private setupLighting() {
    this.scene.add(new THREE.AmbientLight(0xffe8d0, 0.45));
    this.scene.add(new THREE.HemisphereLight(0xfff4e0, 0x404060, 0.3));
  }

  addAisleLight(x: number, z: number) {
    const spot = new THREE.SpotLight(0xfff8e8, 2.8, 22, Math.PI / 5, 0.5, 1.2);
    spot.position.set(x, 5.1, z);
    spot.target.position.set(x, 0, z);
    spot.castShadow = false;
    this.scene.add(spot);
    this.scene.add(spot.target);
  }

  triggerGrabAnim() {
    this.grabAnimTimer = this.GRAB_DURATION;
  }

  updateCamera(yaw: number, pitch: number, eyePos: THREE.Vector3, isMoving: boolean, dt: number) {
    this.camera.position.copy(eyePos);
    this.camera.rotation.y = yaw;
    this.camera.rotation.x = pitch;

    // Subtle head bob
    if (isMoving) {
      this.bobTime += dt * 9;
      this.camera.position.y += Math.sin(this.bobTime) * 0.028;
    } else {
      this.bobTime *= 0.85;
    }

    // Arm grab animation
    if (this.grabAnimTimer > 0) {
      this.grabAnimTimer -= dt;
      const progress = 1 - Math.max(0, this.grabAnimTimer) / this.GRAB_DURATION;
      const phase = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      (this.rightArm as any).position.z = -0.35 - phase * 0.38;
      (this.rightArm as any).position.y = -0.26 + phase * 0.06;
    } else {
      (this.rightArm as any).position.z = -0.35;
      (this.rightArm as any).position.y = -0.26;
    }
  }

  render(dt: number) {
    void dt;
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  private handleResize(canvas: HTMLCanvasElement) {
    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.labelRenderer.setSize(w, h);
    });
    ro.observe(canvas);
  }

  dispose() {
    this.renderer.dispose();
    this.labelRenderer.domElement.remove();
  }
}
