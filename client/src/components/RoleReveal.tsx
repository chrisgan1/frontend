import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';

export default function RoleReveal() {
  const myRole = useGameStore(s => s.myRole);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const isNightmare = myRole === 'nightmare';

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-dream-bg/80 backdrop-blur-sm pointer-events-none">
      <div
        className={`rounded-2xl p-10 text-center border-2 max-w-sm mx-4 ${
          isNightmare
            ? 'bg-red-950/90 border-dream-red shadow-[0_0_60px_rgba(220,38,38,0.5)]'
            : 'bg-indigo-950/90 border-dream-teal shadow-[0_0_60px_rgba(6,182,212,0.4)]'
        }`}
      >
        <div className="text-6xl mb-4">{isNightmare ? '😈' : '✨'}</div>
        <div className={`text-2xl font-bold mb-3 ${isNightmare ? 'text-dream-red' : 'text-dream-teal'}`}>
          {isNightmare ? 'YOU ARE THE NIGHTMARE' : 'YOU ARE A FIGMENT'}
        </div>
        <div className="text-dream-text/80 text-sm leading-relaxed">
          {isNightmare
            ? 'Corrupt the dreamscape. Press F near objects. Raise the Nightmare Meter to 100%.'
            : 'Keep the dream alive. Hold E near tasks to complete them. Find the Nightmare.'}
        </div>
      </div>
    </div>
  );
}
