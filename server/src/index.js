const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const GameRoom = require('./game/GameRoom');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

const rooms = new Map();
const playerRooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getOrCreateRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, new GameRoom(code, io));
  }
  return rooms.get(code);
}

io.on('connection', (socket) => {
  socket.on('join_room', ({ roomCode, playerName }) => {
    const code = (roomCode || generateRoomCode()).toUpperCase();
    const room = getOrCreateRoom(code);

    if (Object.keys(room.players).length >= 4) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    socket.join(code);
    playerRooms.set(socket.id, code);
    room.addPlayer(socket.id, playerName);

    socket.emit('joined', { playerId: socket.id, roomCode: code });
    io.to(code).emit('room_state', room.getRoomState());
    io.to(code).emit('player_joined', room.players);
  });

  socket.on('start_game', () => {
    const code = playerRooms.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    if (!room.players[socket.id]?.isHost) return;
    room.startGame();
  });

  socket.on('player_move', ({ x, z, rotY }) => {
    const code = playerRooms.get(socket.id);
    if (!code) return;
    rooms.get(code)?.updatePosition(socket.id, x, z, rotY);
  });

  socket.on('item_pickup', ({ itemId }) => {
    const code = playerRooms.get(socket.id);
    if (!code) return;
    rooms.get(code)?.handlePickup(socket.id, itemId);
  });

  socket.on('report_collision', ({ targetPlayerId, speed }) => {
    const code = playerRooms.get(socket.id);
    if (!code) return;
    rooms.get(code)?.handleCollision(socket.id, targetPlayerId, speed);
  });

  socket.on('play_again', () => {
    const code = playerRooms.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    room.resetForPlayAgain();
    io.to(code).emit('room_state', room.getRoomState());
  });

  socket.on('disconnect', () => {
    const code = playerRooms.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    room.removePlayer(socket.id);
    playerRooms.delete(socket.id);
    io.to(code).emit('player_left', room.players);

    if (Object.keys(room.players).length === 0) {
      rooms.delete(code);
    }
  });
});

// Broadcast positions at 20Hz
setInterval(() => {
  for (const room of rooms.values()) {
    if (room.phase === 'playing') {
      room.broadcastPositions();
    }
  }
}, 50);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Trolley Chaos server running on :${PORT}`));
