import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { ITEM_POOL } from '../constants';

export default function ListReveal() {
  const myList = useGameStore((s) => s.myList);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, []);

  const items = myList.map((id) => ITEM_POOL.find((i) => i.id === id)!).filter(Boolean);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-game-bg z-50">
      <div className="text-center">
        <h2 className="font-game text-4xl text-game-yellow mb-2">Your Shopping List!</h2>
        <p className="text-game-blue font-body mb-8">Collect all 5 items to win</p>

        <div className="flex flex-col gap-3 mb-8">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-game-card border-2 border-game-border rounded-2xl px-8 py-3 flex items-center gap-4 text-left"
            >
              <span className="text-4xl">{item.emoji}</span>
              <span className="font-game text-2xl text-white">{item.name}</span>
            </div>
          ))}
        </div>

        <div className="font-game text-8xl text-game-accent animate-bounce">{countdown}</div>
      </div>
    </div>
  );
}
