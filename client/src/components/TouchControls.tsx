import { useRef, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';

function fire(key: string) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}
function release(key: string) {
  document.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
}

const DIRS: [string, string][] = [
  ['ArrowUp', 'ArrowRight'], ['ArrowRight', 'ArrowDown'],
  ['ArrowDown', 'ArrowLeft'], ['ArrowLeft', 'ArrowUp'],
];
const MOVE_KEYS = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];

export default function TouchControls() {
  const phase = useGameStore(s => s.phase);
  const myRole = useGameStore(s => s.myRole);
  const activeKeys = useRef(new Set<string>());
  const joystickBase = useRef<{ x: number; y: number } | null>(null);

  const setKeys = useCallback((newKeys: Set<string>) => {
    for (const k of MOVE_KEYS) {
      if (newKeys.has(k) && !activeKeys.current.has(k)) fire(k);
      if (!newKeys.has(k) && activeKeys.current.has(k)) release(k);
    }
    activeKeys.current = new Set(newKeys);
  }, []);

  const handleJoyMove = useCallback((cx: number, cy: number) => {
    const base = joystickBase.current;
    if (!base) return;
    const dx = cx - base.x;
    const dy = cy - base.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 12) { setKeys(new Set()); return; }

    const angle = Math.atan2(dy, dx); // -π to π, right=0
    // Map angle to 8-direction bitmask: up=-π/2, right=0, down=π/2, left=±π
    const next = new Set<string>();
    const deg = ((angle * 180 / Math.PI) + 360) % 360; // 0=right, clockwise
    if (deg < 67.5 || deg >= 292.5) next.add('ArrowRight');
    if (deg >= 22.5 && deg < 157.5) next.add('ArrowDown');
    if (deg >= 112.5 && deg < 247.5) next.add('ArrowLeft');
    if (deg >= 202.5 && deg < 337.5) next.add('ArrowUp');
    setKeys(next);
  }, [setKeys]);

  const onJoyStart = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    joystickBase.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    handleJoyMove(e.clientX, e.clientY);
  }, [handleJoyMove]);

  const onJoyMove = useCallback((e: React.PointerEvent) => {
    if (!joystickBase.current) return;
    handleJoyMove(e.clientX, e.clientY);
  }, [handleJoyMove]);

  const onJoyEnd = useCallback(() => {
    joystickBase.current = null;
    setKeys(new Set());
  }, [setKeys]);

  if (phase !== 'playing') return null;

  const actionKey = myRole === 'nightmare' ? 'f' : 'e';
  const actionLabel = myRole === 'nightmare' ? 'CORRUPT\n(F)' : 'TASK\n(E)';
  const actionColor = myRole === 'nightmare' ? 'bg-dream-red' : 'bg-dream-teal';

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none"
      style={{ zIndex: 25, touchAction: 'none' }}
    >
      {/* Joystick — bottom left */}
      <div className="absolute bottom-28 left-6 pointer-events-auto">
        <div
          className="rounded-full border-2 border-white/20 bg-black/30 backdrop-blur-sm flex items-center justify-center cursor-pointer"
          style={{ width: 120, height: 120, touchAction: 'none' }}
          onPointerDown={onJoyStart}
          onPointerMove={onJoyMove}
          onPointerUp={onJoyEnd}
          onPointerCancel={onJoyEnd}
        >
          <div className="rounded-full bg-white/40 border border-white/60" style={{ width: 44, height: 44 }} />
        </div>
        <p className="text-center text-white/40 text-xs mt-1">move</p>
      </div>

      {/* Action button — bottom right */}
      <div className="absolute bottom-28 right-6 pointer-events-auto">
        <button
          className={`rounded-full ${actionColor}/80 border-2 border-white/30 text-white font-bold text-xs flex items-center justify-center backdrop-blur-sm active:scale-95`}
          style={{ width: 88, height: 88, touchAction: 'none', whiteSpace: 'pre-line', lineHeight: 1.3 }}
          onPointerDown={() => fire(actionKey)}
          onPointerUp={() => release(actionKey)}
          onPointerCancel={() => release(actionKey)}
          onPointerLeave={() => release(actionKey)}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
