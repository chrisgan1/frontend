import { io, Socket } from 'socket.io-client';
import { useGameStore } from './store/useGameStore';
import type { GameStartPayload, GameOverPayload } from './types';

let socket: Socket | null = null;
let positionInterval: ReturnType<typeof setInterval> | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({ transports: ['websocket', 'polling'] });
    setupListeners(socket);
  }
  return socket;
}

function setupListeners(sock: Socket) {
  const store = useGameStore.getState;

  sock.on('room_state', ({ players, roomCode }: { players: Record<string, any>; roomCode: string }) => {
    store().setPlayers(players);
    store().setRoomCode(roomCode);
  });

  sock.on('game_start', (payload: GameStartPayload) => {
    const myId = store().myId;
    store().setMyList(payload.lists[myId] ?? []);
    store().setWorldItems(payload.worldItems);
    store().setPhase('reveal');
    setTimeout(() => store().setPhase('playing'), 3500);
  });

  sock.on('player_positions', (positions: Record<string, { x: number; z: number; rotY: number }>) => {
    const myId = store().myId;
    for (const [id, pos] of Object.entries(positions)) {
      if (id !== myId) {
        store().updatePlayerPos(id, pos.x, pos.z, pos.rotY);
      }
    }
  });

  sock.on('item_collected', ({ itemId, byPlayerId }: { itemId: string; byPlayerId: string }) => {
    store().markItemCollected(itemId, byPlayerId);
  });

  sock.on('item_dropped', ({ itemId, x, z }: { itemId: string; x: number; z: number }) => {
    store().dropItem(itemId, x, z);
    store().showFlash('💥 BONK!');
  });

  sock.on('item_respawned', ({ itemId, x, z }: { itemId: string; x: number; z: number }) => {
    store().respawnItem(itemId, x, z);
  });

  sock.on('score_update', (scores: Record<string, number>) => {
    store().updateScore(scores);
  });

  sock.on('clearance_sale', ({ targetX, targetZ }: { targetX: number; targetZ: number }) => {
    store().triggerClearanceSale(targetX, targetZ);
  });

  sock.on('timer_tick', ({ secondsLeft }: { secondsLeft: number }) => {
    store().setTimer(secondsLeft);
  });

  sock.on('game_over', (payload: GameOverPayload) => {
    store().setGameOver(payload);
    stopBroadcast();
  });

  sock.on('player_joined', (players: Record<string, any>) => {
    store().setPlayers(players);
  });

  sock.on('player_left', (players: Record<string, any>) => {
    store().setPlayers(players);
  });
}

export function joinRoom(roomCode: string, playerName: string) {
  const sock = getSocket();
  sock.emit('join_room', { roomCode: roomCode.toUpperCase(), playerName });
  sock.once('joined', ({ playerId }: { playerId: string }) => {
    useGameStore.getState().setMyId(playerId);
    useGameStore.getState().setMyName(playerName);
  });
}

export function startGame() {
  getSocket().emit('start_game');
}

export function startBroadcast(getPos: () => { x: number; z: number; rotY: number; vx: number; vz: number }) {
  stopBroadcast();
  positionInterval = setInterval(() => {
    getSocket().emit('player_move', getPos());
  }, 50);
}

export function stopBroadcast() {
  if (positionInterval) {
    clearInterval(positionInterval);
    positionInterval = null;
  }
}

export function emitPickup(itemId: string) {
  getSocket().emit('item_pickup', { itemId });
}

export function emitCollision(targetPlayerId: string, speed: number) {
  getSocket().emit('report_collision', { targetPlayerId, speed });
}

export function emitPlayAgain() {
  getSocket().emit('play_again');
}
