import type { InputState } from '../types';

export class InputHandler {
  private keys = new Set<string>();
  private listeners: (() => void)[] = [];

  constructor() {
    const onDown = (e: KeyboardEvent) => {
      this.keys.add(e.code);
      e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => this.keys.delete(e.code);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    this.listeners = [
      () => window.removeEventListener('keydown', onDown),
      () => window.removeEventListener('keyup', onUp),
    ];
  }

  getState(): InputState {
    const fwd = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0)
      - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const steer = (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? -1 : 0)
      + (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0);
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    return { forward: fwd, steer, sprint };
  }

  destroy() {
    this.listeners.forEach((fn) => fn());
  }
}
