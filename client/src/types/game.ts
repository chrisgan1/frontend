export type Role = 'prop' | 'hunter';
export type Phase = 'lobby' | 'role-reveal' | 'hiding' | 'hunting' | 'round-end' | 'game-over';

export interface PlayerState {
  id: string;
  name: string;
  colorIndex: number;
  role: Role | null;
  x: number;
  y: number;
  z: number;
  yaw: number;
  isAlive: boolean;
  isHost: boolean;
  disguise: string | null;
  movesLeft: number;
  moveWindowEndAt: number;
}

export interface GameState {
  roomCode: string;
  phase: Phase;
  roundNumber: number;
  players: PlayerState[];
  huntEndsAt: number | null;
  hidingEndsAt: number | null;
  scores: { hunters: number; props: number };
  winner?: string | null;
  propReveal?: Array<{
    id: string;
    name: string;
    x: number;
    z: number;
    disguise: string | null;
    survived: boolean;
  }>;
  props?: Array<{ id: string; name: string; colorIndex: number }>;
  hunters?: Array<{ id: string; name: string; colorIndex: number }>;
}
