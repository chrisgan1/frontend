const {
  PLAYER_COLORS,
  GAME_DURATION,
  CLEARANCE_SALE_TIME,
  ITEM_RESPAWN_DELAY,
  LIST_SIZE,
} = require('./constants');
const { generateLists, generateWorldItems } = require('./ShoppingList');

class GameRoom {
  constructor(roomCode, io) {
    this.roomCode = roomCode;
    this.io = io;
    this.players = {};
    this.worldItems = {};
    this.lists = {};
    this.scores = {};
    this.phase = 'lobby';
    this.timer = GAME_DURATION;
    this.timerInterval = null;
    this.clearanceDone = false;
    this.collisionCooldowns = {};
  }

  addPlayer(socketId, name) {
    const colorIndex = Object.keys(this.players).length % PLAYER_COLORS.length;
    const color = PLAYER_COLORS[colorIndex];
    const isHost = Object.keys(this.players).length === 0;

    this.players[socketId] = {
      id: socketId,
      name,
      color: color.value,
      colorHex: color.hex,
      x: 0,
      z: 0,
      rotY: 0,
      isHost,
    };
    this.scores[socketId] = 0;
    return this.players[socketId];
  }

  removePlayer(socketId) {
    delete this.players[socketId];
    delete this.scores[socketId];
    // Reassign host if needed
    const remaining = Object.values(this.players);
    if (remaining.length > 0 && !remaining.some((p) => p.isHost)) {
      remaining[0].isHost = true;
    }
  }

  startGame() {
    if (this.phase !== 'lobby') return false;
    const playerIds = Object.keys(this.players);
    if (playerIds.length < 2) return false;

    this.phase = 'playing';
    this.lists = generateLists(playerIds);
    this.worldItems = generateWorldItems(this.lists);
    this.timer = GAME_DURATION;
    this.clearanceDone = false;

    this.io.to(this.roomCode).emit('game_start', {
      lists: this.lists,
      worldItems: this.worldItems,
      seed: Date.now() & 0xffffffff,
    });

    this.startTimer();
    return true;
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timer--;
      this.io.to(this.roomCode).emit('timer_tick', { secondsLeft: this.timer });

      if (!this.clearanceDone && this.timer <= CLEARANCE_SALE_TIME) {
        this.clearanceDone = true;
        this.triggerClearanceSale();
      }

      if (this.timer <= 0) {
        this.endGame();
      }
    }, 1000);
  }

  triggerClearanceSale() {
    const targetX = (Math.random() - 0.5) * 20;
    const targetZ = (Math.random() - 0.5) * 20;
    const radius = 25;

    // Teleport all uncollected items to a cluster near center
    for (const item of Object.values(this.worldItems)) {
      if (item.collectedBy) continue;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      item.x = targetX + Math.cos(angle) * r;
      item.z = targetZ + Math.sin(angle) * r;
      item.onFloor = false;
    }

    this.io.to(this.roomCode).emit('clearance_sale', { targetX, targetZ });

    // Sync all item positions via respawn events
    for (const item of Object.values(this.worldItems)) {
      if (!item.collectedBy) {
        this.io.to(this.roomCode).emit('item_respawned', {
          itemId: item.instanceId,
          x: item.x,
          z: item.z,
        });
      }
    }
  }

  handlePickup(socketId, itemId) {
    const item = this.worldItems[itemId];
    if (!item) return;
    if (item.collectedBy) return;

    const playerList = this.lists[socketId] ?? [];
    if (!playerList.includes(item.defId)) return;

    // Check player hasn't already collected this defId
    const alreadyCollected = Object.values(this.worldItems).some(
      (wi) => wi.collectedBy === socketId && wi.defId === item.defId
    );
    if (alreadyCollected) return;

    item.collectedBy = socketId;
    this.scores[socketId] = (this.scores[socketId] ?? 0) + 1;

    this.io.to(this.roomCode).emit('item_collected', { itemId, byPlayerId: socketId });
    this.io.to(this.roomCode).emit('score_update', this.scores);

    // Win condition: player collected all LIST_SIZE items
    if (this.scores[socketId] >= LIST_SIZE) {
      this.endGame(socketId);
    }
  }

  handleCollision(attackerId, targetId, speed) {
    if (this.phase !== 'playing') return;
    if (!this.players[targetId]) return;

    const cooldownKey = `${attackerId}:${targetId}`;
    const now = Date.now();
    if (this.collisionCooldowns[cooldownKey] && now - this.collisionCooldowns[cooldownKey] < 1500) return;
    this.collisionCooldowns[cooldownKey] = now;

    // Find a random item in target's virtual trolley (an item they haven't collected yet on their list)
    // For fun we drop any random item from the world that's near the target position
    const targetPlayer = this.players[targetId];
    const nearbyItems = Object.values(this.worldItems).filter(
      (wi) =>
        !wi.collectedBy &&
        Math.hypot(wi.x - targetPlayer.x, wi.z - targetPlayer.z) < 15
    );

    if (nearbyItems.length === 0) return;

    const victim = nearbyItems[Math.floor(Math.random() * nearbyItems.length)];
    const dropX = targetPlayer.x + (Math.random() - 0.5) * 4;
    const dropZ = targetPlayer.z + (Math.random() - 0.5) * 4;
    victim.x = dropX;
    victim.z = dropZ;
    victim.onFloor = true;

    this.io.to(this.roomCode).emit('item_dropped', {
      itemId: victim.instanceId,
      x: dropX,
      z: dropZ,
    });

    // Respawn item to shelf after delay
    setTimeout(() => {
      if (!victim.collectedBy) {
        victim.onFloor = false;
        this.io.to(this.roomCode).emit('item_respawned', {
          itemId: victim.instanceId,
          x: victim.x,
          z: victim.z,
        });
      }
    }, ITEM_RESPAWN_DELAY);
  }

  updatePosition(socketId, x, z, rotY) {
    if (this.players[socketId]) {
      this.players[socketId].x = x;
      this.players[socketId].z = z;
      this.players[socketId].rotY = rotY;
    }
  }

  broadcastPositions() {
    const positions = {};
    for (const [id, p] of Object.entries(this.players)) {
      positions[id] = { x: p.x, z: p.z, rotY: p.rotY };
    }
    this.io.to(this.roomCode).emit('player_positions', positions);
  }

  endGame(winnerId = null) {
    if (this.phase !== 'playing') return;
    this.phase = 'results';
    clearInterval(this.timerInterval);

    // If no explicit winner, determine by highest score
    if (!winnerId) {
      let max = -1;
      for (const [id, score] of Object.entries(this.scores)) {
        if (score > max) {
          max = score;
          winnerId = id;
        }
      }
    }

    const winnerName = this.players[winnerId]?.name ?? 'Unknown';
    this.io.to(this.roomCode).emit('game_over', {
      winnerId,
      winnerName,
      finalScores: this.scores,
    });
  }

  resetForPlayAgain() {
    this.phase = 'lobby';
    this.worldItems = {};
    this.lists = {};
    this.scores = {};
    clearInterval(this.timerInterval);
    this.timer = GAME_DURATION;
    this.clearanceDone = false;
    for (const p of Object.values(this.players)) {
      p.x = 0;
      p.z = 0;
      p.rotY = 0;
    }
  }

  getRoomState() {
    return { players: this.players, roomCode: this.roomCode };
  }
}

module.exports = GameRoom;
