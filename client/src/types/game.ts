export type Role = 'figment' | 'nightmare';
export type Phase = 'lobby' | 'role-reveal' | 'playing' | 'voting' | 'round-end' | 'game-over';

export interface PlayerState {
  id: string;
  name: string;
  colorIndex: number;
  x: number;
  y: number;
  isAlive: boolean;
  isHost: boolean;
}

export interface TaskState {
  id: string;
  objectId: string;
  x: number;
  y: number;
  isCorrupted: boolean;
  isActive: boolean;
  activePlayerId: string | null;
  progressMs: number;
  isComplete: boolean;
}

export interface RoomObjectState {
  id: string;
  x: number;
  y: number;
  label: string;
  isCorrupted: boolean;
}

export interface VoteState {
  targetId: string;
  initiatorId: string;
  votes: Record<string, string>;
  expiresAt: number;
}

export interface GameState {
  roomCode: string;
  phase: Phase;
  roundNumber: number;
  players: PlayerState[];
  objects: RoomObjectState[];
  tasks: TaskState[];
  coherence: number;
  nightmareMeter: number;
  roundEndsAt: number | null;
  vote: VoteState | null;
  scores: { figments: number; nightmare: number };
  nightmareId?: string;
}
