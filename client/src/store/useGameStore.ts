import { create } from 'zustand';
import type { GamePhase, Player, WorldItem, GameOverPayload } from '../types';

interface GameStore {
  phase: GamePhase;
  myId: string;
  myName: string;
  myList: string[];
  players: Record<string, Player>;
  worldItems: Record<string, WorldItem>;
  scores: Record<string, number>;
  timer: number;
  winner: GameOverPayload | null;
  clearanceSaleActive: boolean;
  clearanceSaleTarget: { x: number; z: number } | null;
  flashText: string | null;
  roomCode: string;

  setPhase: (phase: GamePhase) => void;
  setMyId: (id: string) => void;
  setMyName: (name: string) => void;
  setRoomCode: (code: string) => void;
  setMyList: (list: string[]) => void;
  setPlayers: (players: Record<string, Player>) => void;
  updatePlayerPos: (id: string, x: number, z: number, rotY: number) => void;
  setWorldItems: (items: Record<string, WorldItem>) => void;
  markItemCollected: (itemId: string, byPlayerId: string) => void;
  dropItem: (itemId: string, x: number, z: number) => void;
  respawnItem: (itemId: string, x: number, z: number) => void;
  updateScore: (scores: Record<string, number>) => void;
  setTimer: (t: number) => void;
  setGameOver: (payload: GameOverPayload) => void;
  triggerClearanceSale: (targetX: number, targetZ: number) => void;
  showFlash: (text: string) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  phase: 'lobby',
  myId: '',
  myName: '',
  myList: [],
  players: {},
  worldItems: {},
  scores: {},
  timer: 120,
  winner: null,
  clearanceSaleActive: false,
  clearanceSaleTarget: null,
  flashText: null,
  roomCode: '',

  setPhase: (phase) => set({ phase }),
  setMyId: (myId) => set({ myId }),
  setMyName: (myName) => set({ myName }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setMyList: (myList) => set({ myList }),
  setPlayers: (players) => set({ players }),

  updatePlayerPos: (id, x, z, rotY) =>
    set((s) => ({
      players: s.players[id]
        ? { ...s.players, [id]: { ...s.players[id], x, z, rotY } }
        : s.players,
    })),

  setWorldItems: (worldItems) => set({ worldItems }),

  markItemCollected: (itemId, byPlayerId) =>
    set((s) => ({
      worldItems: {
        ...s.worldItems,
        [itemId]: { ...s.worldItems[itemId], collectedBy: byPlayerId },
      },
    })),

  dropItem: (itemId, x, z) =>
    set((s) => ({
      worldItems: {
        ...s.worldItems,
        [itemId]: { ...s.worldItems[itemId], x, z, onFloor: true, collectedBy: null },
      },
    })),

  respawnItem: (itemId, x, z) =>
    set((s) => ({
      worldItems: {
        ...s.worldItems,
        [itemId]: { ...s.worldItems[itemId], x, z, onFloor: false, collectedBy: null },
      },
    })),

  updateScore: (scores) => set({ scores }),

  setTimer: (timer) => set({ timer }),

  setGameOver: (winner) => set({ winner, phase: 'results' }),

  triggerClearanceSale: (x, z) =>
    set({ clearanceSaleActive: true, clearanceSaleTarget: { x, z }, flashText: '🚨 CLEARANCE SALE! 🚨' }),

  showFlash: (flashText) => {
    set({ flashText });
    setTimeout(() => set({ flashText: null }), 2000);
  },

  reset: () =>
    set({
      phase: 'lobby',
      myList: [],
      players: {},
      worldItems: {},
      scores: {},
      timer: 120,
      winner: null,
      clearanceSaleActive: false,
      clearanceSaleTarget: null,
      flashText: null,
      roomCode: '',
    }),
}));
