import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';

export default function RoleReveal() {
  const myRole = useGameStore(s => s.myRole);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [myRole]);

  if (!visible) return null;

  const isProp = myRole === 'prop';

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/75 backdrop-blur-sm pointer-events-none">
      <div
        className={`rounded-2xl p-10 text-center border-2 max-w-sm mx-4 ${
          isProp
            ? 'bg-indigo-950/90 border-dream-teal shadow-[0_0_60px_rgba(6,182,212,0.4)]'
            : 'bg-red-950/90 border-dream-red shadow-[0_0_60px_rgba(220,38,38,0.5)]'
        }`}
      >
        <div className="text-6xl mb-4">{isProp ? '📦' : '🔫'}</div>
        <div className={`text-2xl font-bold mb-3 ${isProp ? 'text-dream-teal' : 'text-dream-red'}`}>
          {isProp ? 'YOU ARE A PROP' : 'YOU ARE A HUNTER'}
        </div>
        <div className="text-dream-text/80 text-sm leading-relaxed">
          {isProp
            ? 'Find a disguise with Tab. Hide among the furniture. Use Space to move (3 tokens). Press T to taunt if you dare.'
            : 'Hunt starts in 30 seconds. Click to shoot props. Find them all before time runs out.'}
        </div>
        {isProp && (
          <div className="mt-4 text-dream-teal/60 text-xs">Hiding phase — move freely for 30s</div>
        )}
        {!isProp && (
          <div className="mt-4 text-dream-red/60 text-xs">Wait for hiding phase to end…</div>
        )}
      </div>
    </div>
  );
}
