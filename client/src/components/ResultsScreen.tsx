import { useGameStore } from '../store/useGameStore';
import { joinRoom } from '../socket';
import { PLAYER_COLORS } from '../constants';

export default function ResultsScreen() {
  const gameState = useGameStore(s => s.gameState);
  const phase = useGameStore(s => s.phase);
  const myId = useGameStore(s => s.myId);

  if (!gameState) return null;

  if (phase === 'round-end') {
    const roundWinner = gameState.scores.figments > gameState.scores.nightmare ? 'figments' : 'nightmare';
    return (
      <div className="absolute inset-0 flex items-center justify-center z-20 bg-dream-bg/80 backdrop-blur-sm pointer-events-none">
        <div className="text-center">
          <div className="text-6xl mb-4">{roundWinner === 'figments' ? '✨' : '😈'}</div>
          <div className={`text-3xl font-bold mb-2 ${roundWinner === 'figments' ? 'text-dream-teal' : 'text-dream-red'}`}>
            {roundWinner === 'figments' ? 'Figments win this round!' : 'Nightmare wins this round!'}
          </div>
          <div className="text-dream-muted mt-2 text-lg">
            {gameState.scores.figments} – {gameState.scores.nightmare}
          </div>
          <div className="text-dream-muted/60 text-sm mt-1">Next round starting…</div>
        </div>
      </div>
    );
  }

  // Game over
  const nightmarePlayer = gameState.players.find(p => p.id === gameState.nightmareId);
  const figmentsWon = gameState.scores.figments > gameState.scores.nightmare;

  const handlePlayAgain = () => {
    const me = gameState.players.find(p => p.id === myId);
    joinRoom(gameState.roomCode, me?.name || 'Figment');
    useGameStore.getState().reset();
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-dream-bg/90 backdrop-blur-sm">
      <div className="bg-dream-surface border border-dream-accent/40 rounded-2xl p-10 max-w-md w-full mx-4 text-center shadow-2xl">
        <div className="text-6xl mb-4">{figmentsWon ? '🌟' : '💀'}</div>
        <div className={`text-3xl font-bold mb-2 ${figmentsWon ? 'text-dream-teal' : 'text-dream-red'}`}>
          {figmentsWon ? 'FIGMENTS WIN' : 'NIGHTMARE WINS'}
        </div>

        {nightmarePlayer && (
          <div className="my-6 p-4 rounded-xl bg-dream-bg/60 border border-dream-red/30">
            <div className="text-dream-muted text-xs uppercase tracking-widest mb-2">The Nightmare was…</div>
            <div className="flex items-center justify-center gap-2 text-xl font-bold text-dream-red">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: PLAYER_COLORS[nightmarePlayer.colorIndex] }}
              />
              {nightmarePlayer.name}
            </div>
          </div>
        )}

        <div className="text-dream-muted mb-8 text-sm">
          Final score — Figments {gameState.scores.figments} · Nightmare {gameState.scores.nightmare}
        </div>

        <button
          onClick={handlePlayAgain}
          className="w-full py-3 bg-dream-accent hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
