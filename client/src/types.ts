export type GamePhase = 'lobby' | 'reveal' | 'playing' | 'results';

export interface Player {
  id: string;
  name: string;
  color: number;
  colorHex: string;
  x: number;
  z: number;
  rotY: number;
  isHost: boolean;
}

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  color: number;
  aisle: number;
}

export interface WorldItem {
  instanceId: string;
  defId: string;
  x: number;
  z: number;
  onFloor: boolean;
  collectedBy: string | null;
}

export interface InputState {
  forward: number;
  steer: number;
  sprint: boolean;
}

export interface GameStartPayload {
  lists: Record<string, string[]>;
  worldItems: Record<string, WorldItem>;
  seed: number;
}

export interface GameOverPayload {
  winnerId: string;
  winnerName: string;
  finalScores: Record<string, number>;
}
