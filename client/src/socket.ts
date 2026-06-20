import { io } from 'socket.io-client';

export const socket = io({ autoConnect: true });

export const joinRoom = (roomCode: string, playerName: string) =>
  socket.emit('join-room', { roomCode, playerName });

export const startGame = () => socket.emit('start-game');

export const movePlayer = (x: number, y: number) =>
  socket.emit('player-move', { x, y });

export const startTask = (taskId: string) =>
  socket.emit('start-task', { taskId });

export const completeTask = (taskId: string) =>
  socket.emit('complete-task', { taskId });

export const cancelTask = () => socket.emit('cancel-task');

export const corruptObject = (objectId: string) =>
  socket.emit('corrupt-object', { objectId });

export const callVote = (targetId: string) =>
  socket.emit('call-vote', { targetId });

export const castVote = (targetId: string) =>
  socket.emit('cast-vote', { targetId });
