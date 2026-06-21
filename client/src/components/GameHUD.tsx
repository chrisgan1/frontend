import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { ITEM_POOL } from '../constants';

export default function GameHUD() {
  const myList = useGameStore((s) => s.myList);
  const worldItems = useGameStore((s) => s.worldItems);
  const myId = useGameStore((s) => s.myId);
  const timer = useGameStore((s) => s.timer);
  const scores = useGameStore((s) => s.scores);
  const players = useGameStore((s) => s.players);

  const collectedDefIds = new Set(
    Object.values(worldItems)
      .filter((wi) => wi.collectedBy === myId)
      .map((wi) => wi.defId)
  );

  const mins = Math.floor(timer / 60);
  const secs = String(timer % 60).padStart(2, '0');
  const timerClass = timer <= 30 ? 'text-game-accent animate-pulse' : 'text-game-yellow';

  return (
    <>
      {/* Timer */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-game-card bg-opacity-90 rounded-2xl px-6 py-2 border border-game-border">
        <span className={`font-game text-4xl ${timerClass}`}>
          {mins}:{secs}
        </span>
      </div>

      {/* Shopping list */}
      <div className="absolute top-4 left-4 bg-game-card bg-opacity-90 rounded-2xl p-3 border border-game-border min-w-[140px]">
        <p className="font-game text-game-blue text-sm mb-2">Shopping List</p>
        <div className="space-y-1">
          {myList.map((defId) => {
            const def = ITEM_POOL.find((i) => i.id === defId)!;
            const got = collectedDefIds.has(defId);
            return (
              <div key={defId} className={`flex items-center gap-2 text-sm font-body ${got ? 'opacity-40 line-through' : ''}`}>
                <span>{def?.emoji}</span>
                <span className={got ? 'text-gray-400' : 'text-white'}>{def?.name}</span>
                {got && <span className="text-game-green ml-auto">✓</span>}
              </div>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-game-border">
          <span className="font-game text-game-green text-sm">
            {collectedDefIds.size}/{myList.length}
          </span>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="absolute top-4 right-4 bg-game-card bg-opacity-90 rounded-2xl p-3 border border-game-border min-w-[120px]">
        <p className="font-game text-game-blue text-sm mb-2">Scores</p>
        <div className="space-y-1">
          {Object.values(players)
            .sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
            .map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.colorHex }} />
                <span className="font-body text-white truncate max-w-[60px]">{p.name}</span>
                <span className="font-game text-game-yellow ml-auto">{scores[p.id] ?? 0}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 rounded-xl px-4 py-2">
        <span className="font-body text-xs text-gray-400">WASD / Arrows to move · Shift to sprint</span>
      </div>
    </>
  );
}
