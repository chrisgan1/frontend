export class InputHandler {
  yaw = 0;
  pitch = 0;
  isLocked = false;
  grabPressed = false;
  onLockChange?: (locked: boolean) => void;
  private keys = new Set<string>();
  private removers: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement) {
    const onLockChange = () => {
      this.isLocked = document.pointerLockElement === canvas;
      this.onLockChange?.(this.isLocked);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!this.isLocked) return;
      this.yaw -= e.movementX * 0.002;
      this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch - e.movementY * 0.002));
    };
    const onKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.code);
      if (e.code === 'KeyE') this.grabPressed = true;
      if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
           'Space','ShiftLeft','ShiftRight','KeyE'].includes(e.code)) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);

    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    this.removers = [
      () => document.removeEventListener('pointerlockchange', onLockChange),
      () => document.removeEventListener('mousemove', onMouseMove),
      () => document.removeEventListener('keydown', onKeyDown),
      () => document.removeEventListener('keyup', onKeyUp),
    ];
  }

  consumeGrab(): boolean {
    const g = this.grabPressed;
    this.grabPressed = false;
    return g;
  }

  getMovement() {
    return {
      forward: (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0)
             - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0),
      strafe:  (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0)
             - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0),
      sprint:  this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
    };
  }

  destroy() {
    this.removers.forEach((fn) => fn());
  }
}
