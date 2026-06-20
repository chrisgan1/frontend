import { create } from 'zustand';
import type { GameState, Phase, Role } from '../types/game';

interface GameStore {
  myId: string | null;
  myRole: Role | null;
  gameState: GameState | null;
  phase: Phase;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  showDisguiseMenu: boolean;

  setMyId: (id: string) => void;
  setMyRole: (role: Role) => void;
  setGameState: (state: GameState) => void;
  setPhase: (phase: Phase) => void;
  setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected') => void;
  setShowDisguiseMenu: (show: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  myId: null,
  myRole: null,
  gameState: null,
  phase: 'lobby',
  connectionStatus: 'connecting',
  showDisguiseMenu: false,

  setMyId: (myId) => set({ myId }),
  setMyRole: (myRole) => set({ myRole }),
  setGameState: (gameState) => set({ gameState, phase: gameState.phase }),
  setPhase: (phase) => set({ phase }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setShowDisguiseMenu: (showDisguiseMenu) => set({ showDisguiseMenu }),
  reset: () => set({ myId: null, myRole: null, gameState: null, phase: 'lobby', showDisguiseMenu: false }),
}));
