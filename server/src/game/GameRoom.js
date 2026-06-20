const C = require('./constants');

class GameRoom {
  constructor(roomCode, io) {
    this.roomCode = roomCode;
    this.io = io;
    this.players = new Map();
    this.phase = 'lobby';
    this.roundNumber = 0;
    this.scores = { hunters: 0, props: 0 };
    this.huntEndsAt = null;
    this.hidingEndsAt = null;
    this._tickInterval = null;
    this._phaseTimeout = null;
  }

  get playerList() {
    return Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      colorIndex: p.colorIndex,
      role: p.role,
      x: p.x,
      y: 0,
      z: p.z,
      yaw: p.yaw,
      isAlive: p.isAlive,
      isHost: p.isHost,
      disguise: p.disguise,
      movesLeft: p.movesLeft,
      moveWindowEndAt: p.moveWindowEndAt,
    }));
  }

  getPublicGameState() {
    return {
      roomCode: this.roomCode,
      phase: this.phase,
      roundNumber: this.roundNumber,
      players: this.playerList,
      huntEndsAt: this.huntEndsAt,
      hidingEndsAt: this.hidingEndsAt,
      scores: this.scores,
    };
  }

  addPlayer(socket, name) {
    if (this.players.size >= C.MAX_PLAYERS) {
      socket.emit('error', { message: 'Room is full' });
      return false;
    }
    if (this.phase !== 'lobby') {
      socket.emit('error', { message: 'Game already in progress' });
      return false;
    }

    const usedColors = new Set(Array.from(this.players.values()).map(p => p.colorIndex));
    let colorIndex = 0;
    while (usedColors.has(colorIndex) && colorIndex < 8) colorIndex++;

    const spawnIdx = this.players.size % C.PROP_SPAWNS.length;
    const spawn = C.PROP_SPAWNS[spawnIdx];

    const player = {
      id: socket.id,
      name: (name || 'Player').slice(0, 16).trim() || 'Player',
      colorIndex,
      x: spawn.x,
      z: spawn.z,
      yaw: 0,
      isAlive: true,
      isHost: this.players.size === 0,
      role: null,
      disguise: null,
      movesLeft: C.PROP_MOVES_PER_ROUND,
      moveWindowEndAt: 0,
      tauntReadyAt: 0,
      socket,
    };

    this.players.set(socket.id, player);
    socket.join(this.roomCode);

    socket.emit('room-joined', {
      room: this.getPublicGameState(),
      yourId: socket.id,
    });

    this.io.to(this.roomCode).emit('room-updated', { players: this.playerList });
    return true;
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return;
    this.players.delete(socketId);
    if (this.players.size === 0) return;

    if (player.isHost) {
      const next = this.players.values().next().value;
      if (next) next.isHost = true;
    }

    if (this.phase === 'hiding' || this.phase === 'hunting') {
      this._checkWinCondition();
    }

    this.io.to(this.roomCode).emit('room-updated', { players: this.playerList });
  }

  startGame(socketId) {
    const player = this.players.get(socketId);
    if (!player?.isHost || this.phase !== 'lobby') return;
    if (this.players.size < C.MIN_PLAYERS) {
      player.socket.emit('error', { message: `Need at least ${C.MIN_PLAYERS} players` });
      return;
    }

    this._assignRoles();
    this.phase = 'role-reveal';

    for (const [, p] of this.players) {
      p.socket.emit('game-started', {
        role: p.role,
        gameState: this.getPublicGameState(),
      });
    }

    setTimeout(() => this._startHiding(), 4000);
  }

  _assignRoles() {
    const ids = Array.from(this.players.keys());
    const numHunters = Math.max(1, Math.floor(ids.length / 3));
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    for (let i = 0; i < ids.length; i++) {
      this.players.get(shuffled[i]).role = i < numHunters ? 'hunter' : 'prop';
    }
  }

  _startHiding() {
    this.roundNumber++;
    this.hidingEndsAt = Date.now() + C.HIDING_DURATION_MS;

    for (const [, p] of this.players) {
      p.isAlive = true;
      p.disguise = null;
      p.movesLeft = C.PROP_MOVES_PER_ROUND;
      p.moveWindowEndAt = 0;
      p.tauntReadyAt = 0;

      if (p.role === 'hunter') {
        const spawnIdx = 0;
        const spawn = C.HUNTER_SPAWNS[spawnIdx % C.HUNTER_SPAWNS.length];
        p.x = spawn.x + (Math.random() - 0.5) * 0.5;
        p.z = spawn.z + (Math.random() - 0.5) * 0.5;
      } else {
        const spawnIdx = Math.floor(Math.random() * C.PROP_SPAWNS.length);
        const spawn = C.PROP_SPAWNS[spawnIdx];
        p.x = spawn.x + (Math.random() - 0.5) * 0.5;
        p.z = spawn.z + (Math.random() - 0.5) * 0.5;
      }
      p.yaw = Math.random() * Math.PI * 2;
    }

    this.phase = 'hiding';
    this.huntEndsAt = null;
    this.io.to(this.roomCode).emit('phase-hiding', { gameState: this.getPublicGameState() });
    this._phaseTimeout = setTimeout(() => this._startHunting(), C.HIDING_DURATION_MS);
  }

  _startHunting() {
    this.phase = 'hunting';
    this.huntEndsAt = Date.now() + C.HUNTING_DURATION_MS;
    this.hidingEndsAt = null;

    this.io.to(this.roomCode).emit('phase-hunting', { gameState: this.getPublicGameState() });

    this._tickInterval = setInterval(() => this._tick(), C.GAME_STATE_TICK_MS);
    this._phaseTimeout = setTimeout(() => this._endRound('props'), C.HUNTING_DURATION_MS);
  }

  _tick() {
    this.io.to(this.roomCode).emit('game-state', this.getPublicGameState());
  }

  handlePlayerMove(socketId, x, z, yaw) {
    const p = this.players.get(socketId);
    if (!p || !p.isAlive) return;

    if (p.role === 'hunter' && this.phase === 'hunting') {
      p.x = Math.max(0.3, Math.min(C.ROOM_SIZE - 0.3, x));
      p.z = Math.max(0.3, Math.min(C.ROOM_SIZE - 0.3, z));
      p.yaw = yaw;
    } else if (p.role === 'prop' && this.phase === 'hiding') {
      p.x = Math.max(0.3, Math.min(C.ROOM_SIZE - 0.3, x));
      p.z = Math.max(0.3, Math.min(C.ROOM_SIZE - 0.3, z));
      p.yaw = yaw;
    } else if (p.role === 'prop' && this.phase === 'hunting') {
      if (Date.now() < p.moveWindowEndAt) {
        p.x = Math.max(0.3, Math.min(C.ROOM_SIZE - 0.3, x));
        p.z = Math.max(0.3, Math.min(C.ROOM_SIZE - 0.3, z));
        p.yaw = yaw;
      }
    }
  }

  handlePropUseMove(socketId) {
    const p = this.players.get(socketId);
    if (!p || !p.isAlive || p.role !== 'prop') return;
    if (this.phase !== 'hunting') return;
    if (p.movesLeft <= 0) return;
    if (Date.now() < p.moveWindowEndAt) return;

    p.movesLeft--;
    p.moveWindowEndAt = Date.now() + C.MOVE_WINDOW_MS;
    this.io.to(this.roomCode).emit('prop-move-started', {
      propId: socketId,
      movesLeft: p.movesLeft,
      windowEndsAt: p.moveWindowEndAt,
    });
  }

  handleDisguise(socketId, typeId) {
    const p = this.players.get(socketId);
    if (!p || !p.isAlive || p.role !== 'prop') return;
    if (this.phase !== 'hiding' && this.phase !== 'hunting') return;
    if (this.phase === 'hunting' && Date.now() >= p.moveWindowEndAt) return;

    const valid = C.PROP_TYPES.find(t => t.id === typeId);
    if (!valid) return;

    p.disguise = typeId;
    this.io.to(this.roomCode).emit('prop-disguised', { propId: socketId, typeId });
  }

  handleTaunt(socketId) {
    const p = this.players.get(socketId);
    if (!p || !p.isAlive || p.role !== 'prop') return;
    if (this.phase !== 'hunting') return;

    const now = Date.now();
    if (now < p.tauntReadyAt) return;

    p.tauntReadyAt = now + C.TAUNT_COOLDOWN_MS;
    this.io.to(this.roomCode).emit('prop-taunt', {
      propId: socketId,
      x: p.x,
      z: p.z,
      name: p.name,
    });
  }

  handleShoot(socketId, targetPropId) {
    const shooter = this.players.get(socketId);
    if (!shooter || !shooter.isAlive || shooter.role !== 'hunter') return;
    if (this.phase !== 'hunting') return;

    if (!targetPropId) {
      this.io.to(this.roomCode).emit('shot-missed', { hunterId: socketId });
      return;
    }

    const target = this.players.get(targetPropId);
    if (!target || !target.isAlive || target.role !== 'prop') {
      this.io.to(this.roomCode).emit('shot-missed', { hunterId: socketId });
      return;
    }

    const dx = shooter.x - target.x;
    const dz = shooter.z - target.z;
    if (Math.sqrt(dx * dx + dz * dz) > C.SHOOT_MAX_RANGE) {
      this.io.to(this.roomCode).emit('shot-missed', { hunterId: socketId });
      return;
    }

    target.isAlive = false;
    this.io.to(this.roomCode).emit('prop-found', {
      propId: targetPropId,
      hunterId: socketId,
      propName: target.name,
      hunterName: shooter.name,
    });

    this._checkWinCondition();
  }

  _checkWinCondition() {
    const props = Array.from(this.players.values()).filter(p => p.role === 'prop');
    const hunters = Array.from(this.players.values()).filter(p => p.role === 'hunter');

    if (props.length === 0 || hunters.length === 0) { this._endRound(null); return; }

    const aliveProps = props.filter(p => p.isAlive);
    if (aliveProps.length === 0) this._endRound('hunters');
  }

  _endRound(winner) {
    clearInterval(this._tickInterval);
    clearTimeout(this._phaseTimeout);
    this._tickInterval = null;
    this._phaseTimeout = null;

    if (winner === 'hunters') this.scores.hunters++;
    else if (winner === 'props') this.scores.props++;

    const propReveal = Array.from(this.players.values())
      .filter(p => p.role === 'prop')
      .map(p => ({ id: p.id, name: p.name, x: p.x, z: p.z, disguise: p.disguise, survived: p.isAlive }));

    this.phase = 'round-end';
    this.huntEndsAt = null;
    this.io.to(this.roomCode).emit('round-end', {
      winner,
      roundNumber: this.roundNumber,
      scores: this.scores,
      propReveal,
    });

    const gameOver = this.scores.hunters >= C.ROUNDS_TO_WIN || this.scores.props >= C.ROUNDS_TO_WIN;
    setTimeout(() => gameOver ? this._endGame(winner) : this._startHiding(), 6000);
  }

  _endGame(winner) {
    this.phase = 'game-over';

    const propPlayers = Array.from(this.players.values())
      .filter(p => p.role === 'prop')
      .map(p => ({ id: p.id, name: p.name, colorIndex: p.colorIndex }));
    const hunterPlayers = Array.from(this.players.values())
      .filter(p => p.role === 'hunter')
      .map(p => ({ id: p.id, name: p.name, colorIndex: p.colorIndex }));

    this.io.to(this.roomCode).emit('game-over', {
      winner,
      scores: this.scores,
      props: propPlayers,
      hunters: hunterPlayers,
    });

    setTimeout(() => {
      this.phase = 'lobby';
      this.roundNumber = 0;
      this.scores = { hunters: 0, props: 0 };
      for (const [, p] of this.players) {
        p.role = null;
        p.isAlive = true;
        p.disguise = null;
      }
      this.io.to(this.roomCode).emit('room-updated', { players: this.playerList });
    }, 8000);
  }

  destroy() {
    clearInterval(this._tickInterval);
    clearTimeout(this._phaseTimeout);
  }
}

module.exports = GameRoom;
