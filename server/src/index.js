const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const GameRoom = require('./game/GameRoom');
const C = require('./game/constants');

const app = express();
app.use(cors());
app.use(express.json());

const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const rooms = new Map();
const socketRooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: C.ROOM_CODE_LENGTH }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`);

  socket.on('join-room', ({ roomCode, playerName }) => {
    const code = roomCode ? roomCode.toUpperCase().trim() : generateRoomCode();
    if (!rooms.has(code)) rooms.set(code, new GameRoom(code, io));
    const room = rooms.get(code);
    if (room.addPlayer(socket, playerName)) {
      socketRooms.set(socket.id, code);
      console.log(`[~] ${playerName} joined room ${code} (${room.players.size} players)`);
    }
  });

  socket.on('start-game', () => {
    rooms.get(socketRooms.get(socket.id))?.startGame(socket.id);
  });

  socket.on('player-move', ({ x, z, yaw }) => {
    rooms.get(socketRooms.get(socket.id))?.handlePlayerMove(socket.id, x, z, yaw);
  });

  socket.on('prop-use-move', () => {
    rooms.get(socketRooms.get(socket.id))?.handlePropUseMove(socket.id);
  });

  socket.on('prop-disguise', ({ typeId }) => {
    rooms.get(socketRooms.get(socket.id))?.handleDisguise(socket.id, typeId);
  });

  socket.on('prop-taunt', () => {
    rooms.get(socketRooms.get(socket.id))?.handleTaunt(socket.id);
  });

  socket.on('player-shoot', ({ targetPropId }) => {
    rooms.get(socketRooms.get(socket.id))?.handleShoot(socket.id, targetPropId ?? null);
  });

  socket.on('disconnect', () => {
    const code = socketRooms.get(socket.id);
    socketRooms.delete(socket.id);
    if (code) {
      const room = rooms.get(code);
      if (room) {
        room.removePlayer(socket.id);
        if (room.players.size === 0) {
          room.destroy();
          rooms.delete(code);
          console.log(`[-] Room ${code} removed`);
        }
      }
    }
    console.log(`[-] ${socket.id} disconnected`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Prop Hunt server on port ${PORT}`);
});
