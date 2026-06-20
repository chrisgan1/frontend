import { useGameStore } from '../store/useGameStore';
import { joinRoom } from '../socket';
import { PLAYER_COLORS } from '../constants';

export default function ResultsScreen() {
  const gameState = useGameStore(s => s.gameState);
  const phase = useGameStore(s => s.phase);
  const myId = useGameStore(s => s.myId);

  if (!gameState) return null;

  if (phase === 'round-end') {
    const { winner, scores, propReveal } = gameState;
    return (
      <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 backdrop-blur-sm pointer-events-none">
        <div className="text-center max-w-md w-full mx-4">
          <div className="text-6xl mb-4">{winner === 'hunters' ? '🔫' : '📦'}</div>
          <div className={`text-3xl font-bold mb-2 ${winner === 'hunters' ? 'text-dream-red' : 'text-dream-teal'}`}>
            {winner === 'hunters' ? 'Hunters Win!' : winner === 'props' ? 'Props Survive!' : 'Draw!'}
          </div>
          <div className="text-dream-muted mb-4">
            Hunters {scores.hunters} · Props {scores.props}
          </div>

          {propReveal && propReveal.length > 0 && (
            <div className="bg-dream-surface/80 border border-dream-accent/20 rounded-xl p-4 text-left space-y-2">
              <div className="text-dream-muted text-xs font-bold uppercase tracking-widest mb-2">Props were…</div>
              {propReveal.map(p => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <span className={p.survived ? 'text-dream-teal' : 'text-dream-red'}>
                    {p.survived ? '✓' : '✗'}
                  </span>
                  <span className="text-dream-text">{p.name}</span>
                  {p.disguise && (
                    <span className="text-dream-muted text-xs">as {p.disguise}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="text-dream-muted/60 text-sm mt-4">Next round starting…</div>
        </div>
      </div>
    );
  }

  // Game over
  const { winner, scores, props: propList, hunters: hunterList } = gameState;
  const huntersWon = winner === 'hunters';

  const handlePlayAgain = () => {
    const me = gameState.players.find(p => p.id === myId);
    joinRoom(gameState.roomCode, me?.name || 'Player');
    useGameStore.getState().reset();
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/90 backdrop-blur-sm">
      <div className="bg-dream-surface border border-dream-accent/40 rounded-2xl p-10 max-w-md w-full mx-4 text-center shadow-2xl">
        <div className="text-6xl mb-4">{huntersWon ? '🏆' : '🎉'}</div>
        <div className={`text-3xl font-bold mb-2 ${huntersWon ? 'text-dream-red' : 'text-dream-teal'}`}>
          {huntersWon ? 'HUNTERS WIN' : 'PROPS WIN'}
        </div>

        <div className="text-dream-muted mb-6 text-sm">
          Final — Hunters {scores.hunters} · Props {scores.props}
        </div>

        {hunterList && hunterList.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-dream-bg/50 border border-dream-red/20">
            <div className="text-dream-red text-xs uppercase tracking-widest mb-2">Hunters</div>
            {hunterList.map(p => (
              <div key={p.id} className="flex items-center justify-center gap-2 text-sm text-dream-text">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAYER_COLORS[p.colorIndex] }} />
                {p.name}
              </div>
            ))}
          </div>
        )}

        {propList && propList.length > 0 && (
          <div className="mb-6 p-3 rounded-xl bg-dream-bg/50 border border-dream-teal/20">
            <div className="text-dream-teal text-xs uppercase tracking-widest mb-2">Props</div>
            {propList.map(p => (
              <div key={p.id} className="flex items-center justify-center gap-2 text-sm text-dream-text">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAYER_COLORS[p.colorIndex] }} />
                {p.name}
              </div>
            ))}
          </div>
        )}

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
