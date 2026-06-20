import { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PLAYER_COLORS } from '../constants';

export default function GameHUD() {
  const gameState = useGameStore(s => s.gameState);
  const myRole = useGameStore(s => s.myRole);
  const myId = useGameStore(s => s.myId);
  const phase = useGameStore(s => s.phase);
  const [timeLeft, setTimeLeft] = useState(0);

  const endTime = phase === 'hiding' ? gameState?.hidingEndsAt : gameState?.huntEndsAt;

  useEffect(() => {
    if (!endTime) return;
    const tick = () => setTimeLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endTime]);

  if (!gameState) return null;

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const lowTime = timeLeft <= 20 && phase === 'hunting';

  const me = gameState.players.find(p => p.id === myId);
  const aliveProps = gameState.players.filter(p => p.role === 'prop' && p.isAlive).length;
  const totalProps = gameState.players.filter(p => p.role === 'prop').length;

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Top bar */}
      <div className="flex items-start justify-between p-4 gap-4">
        {/* Scores */}
        <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 text-sm">
          <div className="text-dream-red font-bold">Hunters {gameState.scores.hunters}</div>
          <div className="text-dream-teal font-bold">Props {gameState.scores.props}</div>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center">
          <div className={`text-4xl font-mono font-bold tabular-nums ${lowTime ? 'text-dream-red animate-pulse' : 'text-white'}`}>
            {mins}:{secs}
          </div>
          {phase === 'hiding' && (
            <div className="text-dream-teal text-xs font-bold mt-1 animate-pulse">HIDING PHASE</div>
          )}
          {phase === 'hunting' && (
            <div className="text-dream-muted text-xs mt-1">{aliveProps}/{totalProps} props alive</div>
          )}
        </div>

        {/* Round */}
        <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 text-sm text-right">
          <div className="text-dream-muted text-xs">Round</div>
          <div className="text-dream-text font-bold text-lg">{gameState.roundNumber}</div>
        </div>
      </div>

      {/* Hunter crosshair */}
      {myRole === 'hunter' && phase === 'hunting' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-6 h-6">
            <div className="absolute left-1/2 top-0 w-px h-2 bg-white/80 -translate-x-px" />
            <div className="absolute left-1/2 bottom-0 w-px h-2 bg-white/80 -translate-x-px" />
            <div className="absolute top-1/2 left-0 h-px w-2 bg-white/80 -translate-y-px" />
            <div className="absolute top-1/2 right-0 h-px w-2 bg-white/80 -translate-y-px" />
            <div className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full bg-white/60 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
      )}

      {/* Prop HUD — bottom left */}
      {myRole === 'prop' && (
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-3 text-sm border border-dream-teal/30">
            <div className="text-dream-teal text-xs font-bold mb-1">
              {me?.disguise ? `DISGUISED AS: ${me.disguise.toUpperCase()}` : 'NO DISGUISE — Tab to change'}
            </div>
            <div className="flex gap-2 mt-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full border-2 ${
                    i < (me?.movesLeft ?? 0)
                      ? 'bg-dream-gold border-dream-gold'
                      : 'bg-transparent border-dream-muted/40'
                  }`}
                />
              ))}
              <span className="text-dream-muted text-xs self-center ml-1">move tokens</span>
            </div>
          </div>
          {phase === 'hiding' && (
            <div className="bg-dream-teal/20 border border-dream-teal/40 rounded-lg px-3 py-1.5 text-dream-teal text-xs font-bold text-center animate-pulse">
              HIDE NOW · Tab = disguise · WASD = move
            </div>
          )}
          {phase === 'hunting' && (
            <div className="bg-black/50 border border-dream-muted/30 rounded-lg px-3 py-1.5 text-dream-muted text-xs text-center">
              Space = rush (3s) · T = taunt · Tab = change disguise
            </div>
          )}
        </div>
      )}

      {/* Hunter controls hint */}
      {myRole === 'hunter' && phase === 'hiding' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 rounded-2xl px-8 py-6 text-center border border-dream-red/40">
            <div className="text-dream-red text-2xl font-bold mb-2">WAITING</div>
            <div className="text-dream-text text-sm">Props are hiding…</div>
            <div className="text-4xl font-mono font-bold text-white mt-3">{mins}:{secs}</div>
          </div>
        </div>
      )}

      {/* Hunter hint during hunt */}
      {myRole === 'hunter' && phase === 'hunting' && (
        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 text-xs text-dream-muted border border-dream-red/20">
          Click = shoot · WASD = move · Mouse = look
        </div>
      )}

      {/* Player list */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 items-end">
        {gameState.players.map(p => (
          <div key={p.id} className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 text-xs">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: PLAYER_COLORS[p.colorIndex], opacity: p.isAlive ? 1 : 0.3 }}
            />
            <span className={p.isAlive ? 'text-dream-text' : 'text-dream-muted line-through'}>
              {p.name}
            </span>
            {p.role && (
              <span className={`text-[10px] ${p.role === 'hunter' ? 'text-dream-red' : 'text-dream-teal'}`}>
                {p.role === 'hunter' ? 'HUNTER' : 'PROP'}
              </span>
            )}
            {p.id === myId && <span className="text-dream-muted/60 text-[10px]">you</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
