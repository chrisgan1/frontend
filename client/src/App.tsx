import { useEffect } from 'react';
import { socket } from './socket';
import { useGameStore } from './store/useGameStore';
import LobbyUI from './components/LobbyUI';
import GameCanvas from './components/GameCanvas';
import GameHUD from './components/GameHUD';
import RoleReveal from './components/RoleReveal';
import ResultsScreen from './components/ResultsScreen';
import TouchControls from './components/TouchControls';
import DisguiseMenu from './components/DisguiseMenu';
import type { GameState } from './types/game';

export default function App() {
  const phase = useGameStore(s => s.phase);
  const setMyId = useGameStore(s => s.setMyId);
  const setMyRole = useGameStore(s => s.setMyRole);
  const setGameState = useGameStore(s => s.setGameState);
  const setStatus = useGameStore(s => s.setConnectionStatus);

  useEffect(() => {
    const onConnect = () => { setMyId(socket.id ?? ''); setStatus('connected'); };
    const onDisconnect = () => setStatus('disconnected');

    const onGameStarted = ({ role, gameState }: { role: 'prop' | 'hunter'; gameState: GameState }) => {
      setMyRole(role);
      setGameState(gameState);
    };

    const onPhaseHiding = ({ gameState }: { gameState: GameState }) => setGameState(gameState);
    const onPhaseHunting = ({ gameState }: { gameState: GameState }) => setGameState(gameState);

    const onRoundEnd = (data: { winner: string | null; scores: { hunters: number; props: number }; propReveal: GameState['propReveal'] }) => {
      const gs = useGameStore.getState().gameState;
      if (gs) setGameState({ ...gs, phase: 'round-end', ...data });
    };

    const onGameOver = (data: { winner: string | null; scores: { hunters: number; props: number }; props: GameState['props']; hunters: GameState['hunters'] }) => {
      const gs = useGameStore.getState().gameState;
      if (gs) setGameState({ ...gs, phase: 'game-over', ...data });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('game-started', onGameStarted);
    socket.on('phase-hiding', onPhaseHiding);
    socket.on('phase-hunting', onPhaseHunting);
    socket.on('round-end', onRoundEnd);
    socket.on('game-over', onGameOver);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game-started', onGameStarted);
      socket.off('phase-hiding', onPhaseHiding);
      socket.off('phase-hunting', onPhaseHunting);
      socket.off('round-end', onRoundEnd);
      socket.off('game-over', onGameOver);
    };
  }, [setMyId, setMyRole, setGameState, setStatus]);

  const showCanvas = phase !== 'lobby';
  const showHUD = phase === 'hiding' || phase === 'hunting';

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative" style={{ touchAction: 'none' }}>
      {phase === 'lobby' && <LobbyUI />}

      {showCanvas && (
        <div className="absolute inset-0">
          <GameCanvas />
        </div>
      )}

      {showHUD && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <GameHUD />
        </div>
      )}

      {showCanvas && <TouchControls />}
      {phase === 'role-reveal' && <RoleReveal />}
      <DisguiseMenu />
      {(phase === 'round-end' || phase === 'game-over') && <ResultsScreen />}
    </div>
  );
}
