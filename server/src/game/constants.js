const PLAYER_COLORS = [
  '#7c3aed', // purple
  '#06b6d4', // teal
  '#f59e0b', // gold
  '#10b981', // emerald
  '#f43f5e', // rose
  '#3b82f6', // blue
  '#a855f7', // violet
  '#14b8a6', // cyan
];

const ROOM_OBJECTS = [
  { id: 'obj1', x: 150, y: 110, label: 'Upside-Down Clock' },
  { id: 'obj2', x: 400, y: 80,  label: 'Screaming Couch' },
  { id: 'obj3', x: 650, y: 120, label: 'Floating Teapot' },
  { id: 'obj4', x: 120, y: 330, label: 'Melting Bookshelf' },
  { id: 'obj5', x: 400, y: 300, label: 'Infinite Staircase' },
  { id: 'obj6', x: 680, y: 320, label: 'Mirror of Nothing' },
  { id: 'obj7', x: 180, y: 510, label: 'Whispering Door' },
  { id: 'obj8', x: 620, y: 490, label: 'Backwards Piano' },
];

module.exports = {
  ROOM_CODE_LENGTH: 4,
  MAX_PLAYERS: 8,
  MIN_PLAYERS: 2,
  ROUND_DURATION_MS: 90_000,
  VOTE_DURATION_MS: 30_000,
  TASK_HOLD_MS: 2000,
  COHERENCE_PER_TASK: 12,
  NIGHTMARE_PER_CORRUPT: 15,
  COHERENCE_PENALTY_WRONG_VOTE: 15,
  GAME_STATE_TICK_MS: 100,
  TASK_SPAWN_INTERVAL_MS: 12_000,
  MAX_SIMULTANEOUS_TASKS: 3,
  ROUNDS_TO_WIN: 2,
  INTERACTION_RADIUS: 80,
  PLAYER_COLORS,
  ROOM_OBJECTS,
};
