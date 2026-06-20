import { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { callVote } from '../socket';
import { PLAYER_COLORS } from '../constants';

export default function GameHUD() {
  const gameState = useGameStore(s => s.gameState);
  const myRole = useGameStore(s => s.myRole);
  const myId = useGameStore(s => s.myId);
  const [showPicker, setShowPicker] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);

  useEffect(() => {
    if (!gameState?.roundEndsAt) return;
    const endsAt = gameState.roundEndsAt;
    const tick = () => setTimeLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [gameState?.roundEndsAt]);

  if (!gameState) return null;

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const lowTime = timeLeft <= 15;

  const others = gameState.players.filter(p => p.id !== myId && p.isAlive);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar */}
      <div className="flex items-start justify-between p-4 gap-4">
        {/* Coherence */}
        <div className="w-52">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-dream-teal font-bold tracking-wide">DREAM COHERENCE</span>
            <span className="text-dream-teal font-mono">{Math.round(gameState.coherence)}%</span>
          </div>
          <div className="h-3 bg-dream-bg/80 rounded-full overflow-hidden border border-dream-teal/20">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${gameState.coherence}%`,
                background: 'linear-gradient(90deg, #0891b2, #06b6d4)',
              }}
            />
          </div>
          <div className="text-right text-xs text-dream-muted mt-0.5">
            {gameState.scores.figments}W
          </div>
        </div>

        {/* Timer */}
        <div className={`text-4xl font-mono font-bold tabular-nums ${lowTime ? 'text-dream-red animate-pulse' : 'text-dream-text'}`}>
          {mins}:{secs}
        </div>

        {/* Nightmare meter */}
        <div className="w-52">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-dream-red font-bold tracking-wide">NIGHTMARE</span>
            <span className="text-dream-red font-mono">{Math.round(gameState.nightmareMeter)}%</span>
          </div>
          <div className="h-3 bg-dream-bg/80 rounded-full overflow-hidden border border-dream-red/20">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${gameState.nightmareMeter}%`,
                background: 'linear-gradient(90deg, #991b1b, #dc2626)',
              }}
            />
          </div>
          <div className="text-left text-xs text-dream-muted mt-0.5">
            {gameState.scores.nightmare}W
          </div>
        </div>
      </div>

      {/* Bottom-right: player list + vote */}
      <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col gap-1.5 items-end">
        {gameState.players.map(p => (
          <div
            key={p.id}
            className="flex items-center gap-2 bg-dream-bg/70 backdrop-blur-sm rounded-lg px-3 py-1 text-xs"
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: PLAYER_COLORS[p.colorIndex], opacity: p.isAlive ? 1 : 0.3 }}
            />
            <span className={p.isAlive ? 'text-dream-text' : 'text-dream-muted line-through'}>
              {p.name}
            </span>
            {p.id === myId && <span className="text-dream-muted/60 text-[10px]">(you)</span>}
          </div>
        ))}

        {!showPicker && others.length > 0 && (
          <button
            onClick={() => setShowPicker(true)}
            className="mt-2 px-4 py-2 bg-dream-gold/20 hover:bg-dream-gold/30 border border-dream-gold/40 text-dream-gold text-xs font-bold rounded-lg transition-colors"
          >
            CALL VOTE
          </button>
        )}

        {showPicker && (
          <div className="bg-dream-surface border border-dream-gold/40 rounded-xl p-3 space-y-1.5 min-w-[160px]">
            <div className="text-dream-gold text-xs font-bold mb-2 text-center">Who's the Nightmare?</div>
            {others.map(p => (
              <button
                key={p.id}
                onClick={() => { callVote(p.id); setShowPicker(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-dream-bg/50 hover:bg-dream-gold/10 rounded-lg text-xs text-dream-text transition-colors"
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PLAYER_COLORS[p.colorIndex] }} />
                {p.name}
              </button>
            ))}
            <button
              onClick={() => setShowPicker(false)}
              className="w-full text-center text-dream-muted text-xs pt-1 hover:text-dream-text transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Bottom-left: role reminder */}
      <div className="pointer-events-none absolute bottom-4 left-4">
        <div
          className={`text-xs px-3 py-2 rounded-lg bg-dream-bg/70 backdrop-blur-sm border ${
            myRole === 'nightmare'
              ? 'border-dream-red/40 text-dream-red'
              : 'border-dream-teal/40 text-dream-teal'
          }`}
        >
          {myRole === 'nightmare'
            ? 'NIGHTMARE · F to corrupt · WASD to move'
            : 'FIGMENT · E to help · WASD to move'}
        </div>
      </div>
    </div>
  );
}
