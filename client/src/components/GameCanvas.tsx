import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { GameLoop } from '../game/GameLoop';
import { getSocket } from '../socket';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<GameLoop | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const players = useGameStore((s) => s.players);
  const worldItems = useGameStore((s) => s.worldItems);
  const myId = useGameStore((s) => s.myId);
  const myList = useGameStore((s) => s.myList);

  const requestLock = useCallback(() => {
    canvasRef.current?.requestPointerLock();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || Object.keys(worldItems).length === 0) return;

    const loop = new GameLoop(canvas);
    loopRef.current = loop;

    loop.setLockCallback(setIsLocked);
    loop.setHoverCallback(setHoveredItem);

    const seed = Date.now() & 0xffffffff;
    loop.init(myId, myList, players, worldItems, seed);

    const sock = getSocket();

    sock.on('player_positions', (positions: Record<string, { x: number; z: number; rotY: number }>) => {
      for (const [id, pos] of Object.entries(positions)) {
        if (id !== myId) loop.updateRemotePlayer(id, pos.x, pos.z, pos.rotY);
      }
    });
    sock.on('item_collected', ({ itemId }: { itemId: string }) => loop.collectItem(itemId));
    sock.on('item_dropped', ({ itemId, x, z }: { itemId: string; x: number; z: number }) =>
      loop.dropItem(itemId, x, z)
    );
    sock.on('item_respawned', ({ itemId, x, z }: { itemId: string; x: number; z: number }) =>
      loop.respawnItem(itemId, x, z)
    );

    return () => {
      loop.dispose();
      loopRef.current = null;
      sock.off('player_positions');
      sock.off('item_collected');
      sock.off('item_dropped');
      sock.off('item_respawned');
    };
  }, [worldItems, myId]);

  return (
    <div className="w-full h-full relative" style={{ background: '#1a1a2e' }}>
      <canvas
        ref={canvasRef}
        onClick={requestLock}
        className="w-full h-full block"
        style={{ touchAction: 'none' }}
      />

      {/* Pointer-not-locked overlay */}
      {!isLocked && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-30"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={requestLock}
        >
          <p className="text-white font-bold mb-3" style={{ fontSize: '2rem' }}>
            Click to Play
          </p>
          <div className="text-gray-300 text-sm text-center space-y-1">
            <p>WASD / Arrows — Move &nbsp;|&nbsp; Mouse — Look</p>
            <p>E — Grab item &nbsp;|&nbsp; Shift — Sprint</p>
          </div>
        </div>
      )}

      {/* HUD overlay when locked */}
      {isLocked && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{ position: 'relative', width: 20, height: 20 }}>
              <div style={{
                position: 'absolute', top: '50%', left: 0, right: 0,
                height: 1, background: 'white', opacity: 0.85,
              }} />
              <div style={{
                position: 'absolute', left: '50%', top: 0, bottom: 0,
                width: 1, background: 'white', opacity: 0.85,
              }} />
            </div>
          </div>

          {/* Grab prompt — shown just below crosshair when hovering a grabbable item */}
          {hoveredItem && (
            <div
              className="absolute left-1/2 text-white text-sm font-semibold px-3 py-1 rounded-lg"
              style={{
                top: 'calc(50% + 30px)',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.7)',
                whiteSpace: 'nowrap',
              }}
            >
              [E] &nbsp; {hoveredItem}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
