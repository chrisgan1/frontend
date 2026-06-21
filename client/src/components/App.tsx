import React from 'react';
import { useGameStore } from '../store/useGameStore';
import LobbyScreen from './LobbyScreen';
import ListReveal from './ListReveal';
import GameCanvas from './GameCanvas';
import GameHUD from './GameHUD';
import ResultsScreen from './ResultsScreen';
import FlashOverlay from './FlashOverlay';

export default function App() {
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-game-bg">
      {phase === 'lobby' && <LobbyScreen />}
      {phase === 'reveal' && <ListReveal />}
      {(phase === 'playing' || phase === 'reveal') && (
        <div className={phase === 'reveal' ? 'opacity-0 pointer-events-none absolute inset-0' : 'absolute inset-0'}>
          <GameCanvas />
        </div>
      )}
      {phase === 'playing' && <GameHUD />}
      {phase === 'results' && <ResultsScreen />}
      <FlashOverlay />
    </div>
  );
}
