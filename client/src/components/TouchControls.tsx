import { useRef, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { touchState } from '../game/touchState';

const DEAD_ZONE = 12;
const LOOK_SENSITIVITY = 0.004;
const TAP_MOVE_THRESHOLD = 8;

export default function TouchControls() {
  const phase = useGameStore(s => s.phase);
  const myRole = useGameStore(s => s.myRole);

  const joyBase = useRef<{ x: number; y: number } | null>(null);
  const lookLast = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const onJoyDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    joyBase.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  const onJoyMove = useCallback((e: React.PointerEvent) => {
    if (!joyBase.current) return;
    const dx = e.clientX - joyBase.current.x;
    const dy = e.clientY - joyBase.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < DEAD_ZONE) {
      touchState.moveDx = 0;
      touchState.moveDz = 0;
      return;
    }
    const norm = Math.min(dist, 60) / 60;
    touchState.moveDx = (dx / dist) * norm;
    touchState.moveDz = (dy / dist) * norm;
  }, []);

  const onJoyEnd = useCallback(() => {
    joyBase.current = null;
    touchState.moveDx = 0;
    touchState.moveDz = 0;
  }, []);

  const onLookDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    lookLast.current = { x: e.clientX, y: e.clientY, moved: false };
  }, []);

  const onLookMove = useCallback((e: React.PointerEvent) => {
    if (!lookLast.current) return;
    const dx = e.clientX - lookLast.current.x;
    const dy = e.clientY - lookLast.current.y;
    if (Math.abs(dx) > TAP_MOVE_THRESHOLD || Math.abs(dy) > TAP_MOVE_THRESHOLD) {
      lookLast.current.moved = true;
    }
    touchState.lookYaw += dx * LOOK_SENSITIVITY;
    touchState.lookPitch += dy * LOOK_SENSITIVITY;
    lookLast.current.x = e.clientX;
    lookLast.current.y = e.clientY;
  }, []);

  const onLookUp = useCallback(() => {
    if (lookLast.current && !lookLast.current.moved) {
      // It was a tap — trigger shoot
      touchState.shoot = true;
    }
    lookLast.current = null;
  }, []);

  if (phase !== 'hiding' && phase !== 'hunting') return null;

  const isProp = myRole === 'prop';
  const isHunter = myRole === 'hunter';
  const showButtons = isProp && phase === 'hunting';

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none"
      style={{ zIndex: 25, touchAction: 'none' }}
    >
      {/* Left half — joystick */}
      <div
        className="absolute left-0 top-0 w-1/2 h-full pointer-events-auto"
        style={{ touchAction: 'none' }}
        onPointerDown={onJoyDown}
        onPointerMove={onJoyMove}
        onPointerUp={onJoyEnd}
        onPointerCancel={onJoyEnd}
      >
        {/* Joystick visual */}
        <div className="absolute bottom-24 left-8 pointer-events-none">
          <div
            className="rounded-full border-2 border-white/20 bg-black/30 backdrop-blur-sm flex items-center justify-center"
            style={{ width: 110, height: 110 }}
          >
            <div className="rounded-full bg-white/35 border border-white/50" style={{ width: 42, height: 42 }} />
          </div>
          <p className="text-center text-white/35 text-xs mt-1">move</p>
        </div>
      </div>

      {/* Right half — look / shoot */}
      <div
        className="absolute right-0 top-0 w-1/2 h-full pointer-events-auto"
        style={{ touchAction: 'none' }}
        onPointerDown={onLookDown}
        onPointerMove={onLookMove}
        onPointerUp={onLookUp}
        onPointerCancel={onLookUp}
      >
        {isHunter && phase === 'hunting' && (
          <div className="absolute bottom-6 right-6 pointer-events-none">
            <div className="rounded-full bg-dream-red/30 border-2 border-dream-red/60 w-16 h-16 flex items-center justify-center text-white text-xs font-bold">
              SHOOT
            </div>
          </div>
        )}
      </div>

      {/* Prop action buttons */}
      {showButtons && (
        <div className="absolute bottom-6 right-6 flex flex-col gap-3 pointer-events-auto" style={{ zIndex: 30 }}>
          <button
            className="rounded-full bg-dream-gold/80 border-2 border-dream-gold text-black font-bold text-xs w-16 h-16 active:scale-95 transition-transform"
            onPointerDown={e => { e.stopPropagation(); touchState.taunt = true; }}
          >
            TAUNT
          </button>
          <button
            className="rounded-full bg-dream-teal/80 border-2 border-dream-teal text-black font-bold text-xs w-16 h-16 active:scale-95 transition-transform"
            onPointerDown={e => { e.stopPropagation(); touchState.useMove = true; }}
          >
            RUSH
          </button>
          <button
            className="rounded-full bg-dream-accent/80 border-2 border-dream-accent text-white font-bold text-xs w-16 h-16 active:scale-95 transition-transform"
            onPointerDown={e => {
              e.stopPropagation();
              useGameStore.getState().setShowDisguiseMenu(true);
            }}
          >
            HIDE
          </button>
        </div>
      )}
    </div>
  );
}
