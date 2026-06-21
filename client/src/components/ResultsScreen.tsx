import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { ITEM_POOL } from '../constants';
import { emitPlayAgain } from '../socket';

export default function ResultsScreen() {
  const winner = useGameStore((s) => s.winner);
  const players = useGameStore((s) => s.players);
  const myId = useGameStore((s) => s.myId);
  const worldItems = useGameStore((s) => s.worldItems);
  const reset = useGameStore((s) => s.reset);

  if (!winner) return null;

  const iWon = winner.winnerId === myId;
  const sortedPlayers = Object.values(players).sort(
    (a, b) => (winner.finalScores[b.id] ?? 0) - (winner.finalScores[a.id] ?? 0)
  );

  function handlePlayAgain() {
    emitPlayAgain();
    reset();
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-game-bg z-50">
      <div className="bg-game-card border-2 border-game-border rounded-3xl p-8 w-full max-w-md shadow-2xl text-center">
        <div className="text-7xl mb-3">{iWon ? '🏆' : '😭'}</div>
        <h2 className="font-game text-5xl text-game-yellow mb-1">
          {iWon ? 'YOU WIN!' : `${winner.winnerName} wins!`}
        </h2>
        <p className="text-game-blue font-body mb-6 text-sm">
          {iWon ? 'You cleared the list fastest!' : 'Better luck next time 🛒'}
        </p>

        <div className="bg-game-bg rounded-2xl p-4 mb-6">
          <p className="font-game text-game-blue text-sm mb-3">Final Scores</p>
          <div className="space-y-2">
            {sortedPlayers.map((p, i) => {
              const score = winner.finalScores[p.id] ?? 0;
              const collectedIds = Object.values(worldItems)
                .filter((wi) => wi.collectedBy === p.id)
                .map((wi) => wi.defId);
              const items = collectedIds.map((id) => ITEM_POOL.find((d) => d.id === id)).filter(Boolean);

              return (
                <div key={p.id} className={`flex items-center gap-3 rounded-xl p-2 ${i === 0 ? 'bg-game-card border border-game-yellow' : ''}`}>
                  <span className="font-game text-xl text-game-yellow w-6">{i + 1}.</span>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.colorHex }} />
                  <span className="font-body font-bold text-white flex-1 text-left">{p.name}</span>
                  <span className="text-sm">{items.map((it) => it!.emoji).join('')}</span>
                  <span className="font-game text-game-yellow">{score}/5</span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handlePlayAgain}
          className="w-full bg-game-accent hover:bg-red-500 text-white font-game text-2xl py-3 rounded-xl transition-all active:scale-95 shadow-lg"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
