const { v4: uuidv4 } = require('uuid');
const C = require('./constants');

class GameRoom {
  constructor(roomCode, io) {
    this.roomCode = roomCode;
    this.io = io;
    this.players = new Map(); // socketId → PlayerData
    this.phase = 'lobby';
    this.roundNumber = 0;
    this.coherence = 0;
    this.nightmareMeter = 0;
    this.tasks = new Map();
    this.objects = C.ROOM_OBJECTS.map(o => ({ ...o, isCorrupted: false }));
    this.scores = { figments: 0, nightmare: 0 };
    this.vote = null;
    this.roundEndsAt = null;
    this._tickInterval = null;
    this._taskInterval = null;
    this._voteTimeout = null;
    this._roundTimeSaved = null;
  }

  get playerList() {
    return Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      colorIndex: p.colorIndex,
      x: p.x,
      y: p.y,
      isAlive: p.isAlive,
      isHost: p.isHost,
    }));
  }

  getPublicGameState() {
    const now = Date.now();
    return {
      roomCode: this.roomCode,
      phase: this.phase,
      roundNumber: this.roundNumber,
      players: this.playerList,
      objects: this.objects,
      tasks: Array.from(this.tasks.values()).map(t => ({
        id: t.id,
        objectId: t.objectId,
        x: t.x,
        y: t.y,
        isCorrupted: t.isCorrupted,
        isActive: t.isActive,
        activePlayerId: t.activePlayerId,
        progressMs: t.isActive && t.startedAt ? Math.min(C.TASK_HOLD_MS, now - t.startedAt) : 0,
        isComplete: t.isComplete,
      })),
      coherence: this.coherence,
      nightmareMeter: this.nightmareMeter,
      roundEndsAt: this.roundEndsAt,
      vote: this.vote ? {
        targetId: this.vote.targetId,
        initiatorId: this.vote.initiatorId,
        votes: this.vote.votes,
        expiresAt: this.vote.expiresAt,
      } : null,
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

    const player = {
      id: socket.id,
      name: (name || 'Figment').slice(0, 16).trim() || 'Figment',
      colorIndex,
      x: 350 + Math.random() * 100,
      y: 250 + Math.random() * 100,
      isAlive: true,
      isHost: this.players.size === 0,
      role: null,
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

    if (this.phase === 'playing' || this.phase === 'voting') {
      if (player.role === 'nightmare') {
        this._endRound('figments');
        return;
      }
      if (this.players.size < 2) {
        this._endGame(null);
        return;
      }
    }

    this.io.to(this.roomCode).emit('room-updated', { players: this.playerList });
  }

  startGame(socketId) {
    const player = this.players.get(socketId);
    if (!player?.isHost) return;
    if (this.phase !== 'lobby') return;
    if (this.players.size < C.MIN_PLAYERS) {
      player.socket.emit('error', { message: `Need at least ${C.MIN_PLAYERS} players to start` });
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

    setTimeout(() => this._startRound(), 4000);
  }

  _assignRoles() {
    const ids = Array.from(this.players.keys());
    const nightmareIdx = Math.floor(Math.random() * ids.length);
    for (let i = 0; i < ids.length; i++) {
      this.players.get(ids[i]).role = i === nightmareIdx ? 'nightmare' : 'figment';
    }
  }

  _startRound() {
    this.roundNumber++;
    this.coherence = 0;
    this.nightmareMeter = 0;
    this.tasks.clear();
    this.objects.forEach(o => { o.isCorrupted = false; });
    for (const [, p] of this.players) p.isAlive = true;

    this.phase = 'playing';
    this.roundEndsAt = Date.now() + C.ROUND_DURATION_MS;

    this._tickInterval = setInterval(() => this._tick(), C.GAME_STATE_TICK_MS);
    this._taskInterval = setInterval(() => this._spawnTask(), C.TASK_SPAWN_INTERVAL_MS);

    setTimeout(() => this._spawnTask(), 2000);
  }

  _tick() {
    if (this.coherence >= 100) { this._endRound('figments'); return; }
    if (this.nightmareMeter >= 100) { this._endRound('nightmare'); return; }

    if (this.roundEndsAt && Date.now() >= this.roundEndsAt) {
      this._endRound(this.coherence >= this.nightmareMeter ? 'figments' : 'nightmare');
      return;
    }

    this.io.to(this.roomCode).emit('game-state', this.getPublicGameState());
  }

  _spawnTask() {
    if (this.phase !== 'playing') return;

    const activeTasks = Array.from(this.tasks.values()).filter(t => !t.isComplete);
    if (activeTasks.length >= C.MAX_SIMULTANEOUS_TASKS) return;

    const occupiedObjects = new Set(activeTasks.map(t => t.objectId));
    const eligible = this.objects.filter(o => !o.isCorrupted && !occupiedObjects.has(o.id));
    if (eligible.length === 0) return;

    const obj = eligible[Math.floor(Math.random() * eligible.length)];
    const task = {
      id: uuidv4(),
      objectId: obj.id,
      x: obj.x,
      y: obj.y,
      isCorrupted: false,
      isActive: false,
      activePlayerId: null,
      progressMs: 0,
      isComplete: false,
      startedAt: null,
    };
    this.tasks.set(task.id, task);
  }

  handlePlayerMove(socketId, x, y) {
    const p = this.players.get(socketId);
    if (!p || !p.isAlive || this.phase !== 'playing') return;
    p.x = Math.max(20, Math.min(780, x));
    p.y = Math.max(20, Math.min(580, y));
  }

  handleStartTask(socketId, taskId) {
    if (this.phase !== 'playing') return;
    const p = this.players.get(socketId);
    if (!p || !p.isAlive || p.role === 'nightmare') return;

    const task = this.tasks.get(taskId);
    if (!task || task.isComplete || task.isActive) return;

    const dx = p.x - task.x, dy = p.y - task.y;
    if (Math.sqrt(dx * dx + dy * dy) > C.INTERACTION_RADIUS) return;

    task.isActive = true;
    task.activePlayerId = socketId;
    task.startedAt = Date.now();
  }

  handleCompleteTask(socketId, taskId) {
    if (this.phase !== 'playing') return;
    const p = this.players.get(socketId);
    if (!p || !p.isAlive) return;

    const task = this.tasks.get(taskId);
    if (!task || task.isComplete || task.activePlayerId !== socketId) return;
    if (!task.startedAt || Date.now() - task.startedAt < C.TASK_HOLD_MS) return;

    task.isComplete = true;
    task.isActive = false;
    this.coherence = Math.min(100, this.coherence + C.COHERENCE_PER_TASK);

    this.io.to(this.roomCode).emit('task-completed', {
      taskId,
      coherenceDelta: C.COHERENCE_PER_TASK,
    });
  }

  handleCancelTask(socketId) {
    for (const [, task] of this.tasks) {
      if (task.activePlayerId === socketId) {
        task.isActive = false;
        task.activePlayerId = null;
        task.startedAt = null;
      }
    }
  }

  handleCorruptObject(socketId, objectId) {
    if (this.phase !== 'playing') return;
    const p = this.players.get(socketId);
    if (!p || !p.isAlive || p.role !== 'nightmare') return;

    const obj = this.objects.find(o => o.id === objectId);
    if (!obj || obj.isCorrupted) return;

    const dx = p.x - obj.x, dy = p.y - obj.y;
    if (Math.sqrt(dx * dx + dy * dy) > C.INTERACTION_RADIUS) return;

    obj.isCorrupted = true;

    for (const [taskId, task] of this.tasks) {
      if (task.objectId === objectId) this.tasks.delete(taskId);
    }

    this.nightmareMeter = Math.min(100, this.nightmareMeter + C.NIGHTMARE_PER_CORRUPT);

    this.io.to(this.roomCode).emit('object-corrupted', {
      objectId,
      nightmareDelta: C.NIGHTMARE_PER_CORRUPT,
    });
  }

  handleCallVote(socketId, targetId) {
    if (this.phase !== 'playing' || this.vote !== null) return;
    const caller = this.players.get(socketId);
    const target = this.players.get(targetId);
    if (!caller?.isAlive || !target?.isAlive || targetId === socketId) return;

    this._roundTimeSaved = Math.max(0, (this.roundEndsAt || Date.now()) - Date.now());
    this._clearIntervals();

    this.phase = 'voting';
    const expiresAt = Date.now() + C.VOTE_DURATION_MS;
    this.vote = { targetId, initiatorId: socketId, votes: {}, expiresAt };

    this.io.to(this.roomCode).emit('vote-started', {
      targetId,
      initiatorId: socketId,
      timeoutMs: C.VOTE_DURATION_MS,
    });

    this._voteTimeout = setTimeout(() => this._resolveVote(), C.VOTE_DURATION_MS);
  }

  handleCastVote(socketId, targetId) {
    if (this.phase !== 'voting' || !this.vote) return;
    const voter = this.players.get(socketId);
    if (!voter?.isAlive || this.vote.votes[socketId]) return;

    this.vote.votes[socketId] = targetId;
    this.io.to(this.roomCode).emit('game-state', this.getPublicGameState());

    const aliveCount = Array.from(this.players.values()).filter(p => p.isAlive).length;
    if (Object.keys(this.vote.votes).length >= aliveCount) {
      clearTimeout(this._voteTimeout);
      this._resolveVote();
    }
  }

  _resolveVote() {
    if (!this.vote) return;
    const { targetId, votes } = this.vote;

    const voteCounts = {};
    for (const v of Object.values(votes)) {
      voteCounts[v] = (voteCounts[v] || 0) + 1;
    }

    const votesForTarget = voteCounts[targetId] || 0;
    const totalVoters = Array.from(this.players.values()).filter(p => p.isAlive).length;
    const ejected = votesForTarget > totalVoters / 2;

    let nightmareEjected = false;
    if (ejected) {
      const target = this.players.get(targetId);
      if (target) {
        nightmareEjected = target.role === 'nightmare';
        target.isAlive = false;
        this.io.to(this.roomCode).emit('player-ejected', { playerId: targetId });
        if (!nightmareEjected) {
          this.coherence = Math.max(0, this.coherence - C.COHERENCE_PENALTY_WRONG_VOTE);
        }
      }
    }

    this.io.to(this.roomCode).emit('vote-result', {
      targetId,
      ejected,
      votesCast: votes,
    });

    this.vote = null;

    if (nightmareEjected) {
      this._endRound('figments');
      return;
    }

    // Resume round
    this.phase = 'playing';
    this.roundEndsAt = Date.now() + (this._roundTimeSaved || 30_000);
    this._tickInterval = setInterval(() => this._tick(), C.GAME_STATE_TICK_MS);
    this._taskInterval = setInterval(() => this._spawnTask(), C.TASK_SPAWN_INTERVAL_MS);
  }

  _endRound(winner) {
    this._clearIntervals();

    if (winner === 'figments') this.scores.figments++;
    else if (winner === 'nightmare') this.scores.nightmare++;

    this.phase = 'round-end';
    this.io.to(this.roomCode).emit('round-end', {
      winner,
      roundNumber: this.roundNumber,
      scores: this.scores,
    });

    const gameOver = this.scores.figments >= C.ROUNDS_TO_WIN || this.scores.nightmare >= C.ROUNDS_TO_WIN;
    setTimeout(() => gameOver ? this._endGame(winner) : this._startRound(), 5000);
  }

  _endGame(winner) {
    this._clearIntervals();

    let nightmareId = null;
    for (const [id, p] of this.players) {
      if (p.role === 'nightmare') { nightmareId = id; break; }
    }

    this.phase = 'game-over';
    this.io.to(this.roomCode).emit('game-over', { winner, scores: this.scores, nightmareId });

    // Reset to lobby after delay
    setTimeout(() => {
      this.phase = 'lobby';
      this.roundNumber = 0;
      this.scores = { figments: 0, nightmare: 0 };
      this.tasks.clear();
      this.objects.forEach(o => { o.isCorrupted = false; });
      for (const [, p] of this.players) { p.role = null; p.isAlive = true; }
      this.io.to(this.roomCode).emit('room-updated', { players: this.playerList });
    }, 8000);
  }

  _clearIntervals() {
    clearInterval(this._tickInterval);
    clearInterval(this._taskInterval);
    clearTimeout(this._voteTimeout);
    this._tickInterval = null;
    this._taskInterval = null;
    this._voteTimeout = null;
  }

  destroy() {
    this._clearIntervals();
  }
}

module.exports = GameRoom;
