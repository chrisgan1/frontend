import { useEffect } from 'react';
import { socket } from './socket';
import { useGameStore } from './store/useGameStore';
import LobbyUI from './components/LobbyUI';
import GameCanvas from './components/GameCanvas';
import GameHUD from './components/GameHUD';
import RoleReveal from './components/RoleReveal';
import VoteUI from './components/VoteUI';
import ResultsScreen from './components/ResultsScreen';

export default function App() {
  const phase = useGameStore(s => s.phase);
  const setMyId = useGameStore(s => s.setMyId);
  const setStatus = useGameStore(s => s.setConnectionStatus);

  useEffect(() => {
    const onConnect = () => {
      setMyId(socket.id ?? '');
      setStatus('connected');
    };
    const onDisconnect = () => setStatus('disconnected');
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [setMyId, setStatus]);

  const showCanvas = phase !== 'lobby';

  return (
    <div className="w-screen h-screen bg-dream-bg overflow-hidden relative">
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

      {phase === 'role-reveal' && <RoleReveal />}
      {phase === 'voting' && <VoteUI />}
      {(phase === 'round-end' || phase === 'game-over') && <ResultsScreen />}
    </div>
  );
}
