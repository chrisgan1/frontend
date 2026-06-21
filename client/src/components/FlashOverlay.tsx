import React from 'react';
import { useGameStore } from '../store/useGameStore';

export default function FlashOverlay() {
  const flashText = useGameStore((s) => s.flashText);
  const clearanceSaleActive = useGameStore((s) => s.clearanceSaleActive);

  if (!flashText && !clearanceSaleActive) return null;

  const isClearance = clearanceSaleActive && flashText?.includes('CLEARANCE');

  return (
    <div
      className={`absolute inset-x-0 top-24 flex justify-center pointer-events-none z-40 ${isClearance ? 'animate-bounce' : ''}`}
    >
      <div
        className={`font-game text-4xl px-8 py-3 rounded-2xl shadow-2xl ${
          isClearance
            ? 'bg-game-accent text-white border-4 border-game-yellow'
            : 'bg-black bg-opacity-70 text-game-accent'
        }`}
      >
        {flashText}
      </div>
    </div>
  );
}
