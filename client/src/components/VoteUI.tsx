import { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { castVote } from '../socket';
import { PLAYER_COLORS } from '../constants';

export default function VoteUI() {
  const gameState = useGameStore(s => s.gameState);
  const myId = useGameStore(s => s.myId);
  const [hasVoted, setHasVoted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    setHasVoted(false);
  }, [gameState?.vote?.targetId]);

  useEffect(() => {
    if (!gameState?.vote) return;
    const expiresAt = gameState.vote.expiresAt;
    const tick = () => setTimeLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [gameState?.vote?.expiresAt]);

  if (!gameState?.vote) return null;

  const { targetId } = gameState.vote;
  const target = gameState.players.find(p => p.id === targetId);
  const aliveCount = gameState.players.filter(p => p.isAlive).length;
  const voteCount = Object.keys(gameState.vote.votes).length;
  const myVote = myId ? gameState.vote.votes[myId] : undefined;
  const voted = hasVoted || !!myVote;

  const handleVote = (id: string) => {
    castVote(id);
    setHasVoted(true);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-dream-bg/70 backdrop-blur-sm">
      <div className="bg-dream-surface border border-dream-gold/40 rounded-2xl p-8 w-96 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-dream-gold font-bold text-xs tracking-widest mb-2">EMERGENCY VOTE</div>
          <div className="text-dream-text text-lg">
            Is{' '}
            <span className="font-bold" style={{ color: PLAYER_COLORS[target?.colorIndex ?? 0] }}>
              {target?.name}
            </span>{' '}
            the Nightmare?
          </div>
          <div className="text-dream-muted text-sm mt-1">
            {timeLeft}s · {voteCount}/{aliveCount} voted
          </div>
        </div>

        {!voted ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleVote(targetId)}
              className="py-3 bg-dream-red/20 hover:bg-dream-red/30 border border-dream-red/50 text-dream-red font-bold rounded-xl transition-colors"
            >
              WAKE THEM
            </button>
            <button
              onClick={() => handleVote(myId ?? '')}
              className="py-3 bg-dream-teal/20 hover:bg-dream-teal/30 border border-dream-teal/50 text-dream-teal font-bold rounded-xl transition-colors"
            >
              SKIP VOTE
            </button>
          </div>
        ) : (
          <div className="text-center text-dream-muted py-4 text-sm">
            Vote cast — waiting for others…
          </div>
        )}
      </div>
    </div>
  );
}
