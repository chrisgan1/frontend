import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { GameLoop } from '../game/GameLoop';
import { getSocket } from '../socket';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<GameLoop | null>(null);

  const players = useGameStore((s) => s.players);
  const worldItems = useGameStore((s) => s.worldItems);
  const myId = useGameStore((s) => s.myId);
  const myList = useGameStore((s) => s.myList);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || Object.keys(worldItems).length === 0) return;

    const loop = new GameLoop(canvas);
    loopRef.current = loop;

    const seed = Date.now() & 0xffffffff;
    loop.init(myId, myList, players, worldItems, seed);

    const sock = getSocket();

    sock.on('player_positions', (positions: Record<string, { x: number; z: number; rotY: number }>) => {
      for (const [id, pos] of Object.entries(positions)) {
        if (id !== myId) loop.updateRemotePlayer(id, pos.x, pos.z, pos.rotY);
      }
    });

    sock.on('item_collected', ({ itemId }: { itemId: string }) => {
      loop.collectItem(itemId);
    });

    sock.on('item_dropped', ({ itemId, x, z }: { itemId: string; x: number; z: number }) => {
      loop.dropItem(itemId, x, z);
    });

    sock.on('item_respawned', ({ itemId, x, z }: { itemId: string; x: number; z: number }) => {
      loop.respawnItem(itemId, x, z);
    });

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
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ touchAction: 'none' }}
    />
  );
}
