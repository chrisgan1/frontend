import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export class GameScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  labelRenderer: CSS2DRenderer;
  private shakeOffset = new THREE.Vector3();
  private shakeDecay = 0;
  private shakeAmplitude = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a0a2e);
    this.scene.fog = new THREE.Fog(0x1a0a2e, 160, 220);

    this.camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 500);
    this.camera.position.set(0, 90, 60);
    this.camera.lookAt(0, 0, 0);

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

    this.setupLighting();
    this.handleResize(canvas);
  }

  private setupLighting() {
    this.scene.add(new THREE.AmbientLight(0xfff8f0, 1.4));
    this.scene.add(new THREE.HemisphereLight(0xffeeff, 0xddffdd, 0.5));

    const sun = new THREE.DirectionalLight(0xfffbe6, 2.2);
    sun.position.set(30, 60, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 300;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    this.scene.add(sun);

    const ceilPositions = [[-30, 18, -25], [30, 18, -25], [-30, 18, 25], [30, 18, 25]] as const;
    for (const [x, y, z] of ceilPositions) {
      const pt = new THREE.PointLight(0xfff4cc, 1.6, 80);
      pt.position.set(x, y, z);
      this.scene.add(pt);
    }
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

  shake(amplitude = 3) {
    this.shakeAmplitude = amplitude;
    this.shakeDecay = 0.88;
  }

  render() {
    if (this.shakeAmplitude > 0.05) {
      this.shakeOffset.set(
        (Math.random() - 0.5) * this.shakeAmplitude,
        (Math.random() - 0.5) * this.shakeAmplitude * 0.5,
        0
      );
      this.camera.position.x = this.shakeOffset.x;
      this.camera.position.y = 90 + this.shakeOffset.y;
      this.shakeAmplitude *= this.shakeDecay;
    } else {
      this.camera.position.x = 0;
      this.camera.position.y = 90;
      this.shakeAmplitude = 0;
    }

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
    this.labelRenderer.domElement.remove();
  }
}
