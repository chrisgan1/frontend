import { io } from 'socket.io-client';

export const socket = io({ autoConnect: true });

export const joinRoom = (roomCode: string, playerName: string) =>
  socket.emit('join-room', { roomCode, playerName });

export const startGame = () => socket.emit('start-game');

export const movePlayer = (x: number, z: number, yaw: number) =>
  socket.emit('player-move', { x, z, yaw });

export const propUseMove = () => socket.emit('prop-use-move');

export const setPropDisguise = (typeId: string) =>
  socket.emit('prop-disguise', { typeId });

export const propTaunt = () => socket.emit('prop-taunt');

export const shootAt = (targetPropId: string | null) =>
  socket.emit('player-shoot', { targetPropId });
