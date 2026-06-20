import { useEffect } from 'react';
import { socket } from './socket';
import { useGameStore } from './store/useGameStore';
import LobbyUI from './components/LobbyUI';
import GameCanvas from './components/GameCanvas';
import GameHUD from './components/GameHUD';
import RoleReveal from './components/RoleReveal';
import VoteUI from './components/VoteUI';
import ResultsScreen from './components/ResultsScreen';
import TouchControls from './components/TouchControls';

export default function App() {
  const phase = useGameStore(s => s.phase);
  const setMyId = useGameStore(s => s.setMyId);
  const setMyRole = useGameStore(s => s.setMyRole);
  const setGameState = useGameStore(s => s.setGameState);
  const setStatus = useGameStore(s => s.setConnectionStatus);

  useEffect(() => {
    const onConnect = () => {
      setMyId(socket.id ?? '');
      setStatus('connected');
    };
    const onDisconnect = () => setStatus('disconnected');

    // Must live here — ThreeScene isn't mounted yet when game-started fires
    const onGameStarted = ({ role, gameState }: { role: 'figment' | 'nightmare'; gameState: Parameters<typeof setGameState>[0] }) => {
      setMyRole(role);
      setGameState(gameState);
    };

    const onRoundEnd = () => setGameState({ ...useGameStore.getState().gameState!, phase: 'round-end' });
    const onGameOver = (data: { winner: string; scores: object; nightmareId: string }) => {
      const gs = useGameStore.getState().gameState;
      if (gs) setGameState({ ...gs, phase: 'game-over', ...data } as Parameters<typeof setGameState>[0]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('game-started', onGameStarted);
    socket.on('round-end', onRoundEnd);
    socket.on('game-over', onGameOver);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game-started', onGameStarted);
      socket.off('round-end', onRoundEnd);
      socket.off('game-over', onGameOver);
    };
  }, [setMyId, setMyRole, setGameState, setStatus]);

  const showCanvas = phase !== 'lobby';

  return (
    <div className="w-screen h-screen bg-dream-bg overflow-hidden relative" style={{ touchAction: 'none' }}>
      {phase === 'lobby' && <LobbyUI />}

      {/* Canvas mounts once when game starts, stays alive through rounds */}
      {showCanvas && (
        <div className="absolute inset-0">
          <GameCanvas />
        </div>
      )}

      {(phase === 'playing' || phase === 'voting' || phase === 'role-reveal') && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <GameHUD />
        </div>
      )}

      <TouchControls />
      {phase === 'role-reveal' && <RoleReveal />}
      {phase === 'voting' && <VoteUI />}
      {(phase === 'round-end' || phase === 'game-over') && <ResultsScreen />}
    </div>
  );
}
