const PLAYER_COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#10b981',
  '#f43f5e', '#3b82f6', '#a855f7', '#14b8a6',
];

const PROP_TYPES = [
  { id: 'crate',    label: 'Wooden Crate',   shape: 'box',      w: 1.5, h: 1.5, d: 1.5 },
  { id: 'barrel',   label: 'Barrel',         shape: 'cylinder', r: 0.55, h: 1.4 },
  { id: 'chair',    label: 'Chair',          shape: 'box',      w: 0.8, h: 1.2, d: 0.8 },
  { id: 'table',    label: 'Table',          shape: 'box',      w: 2.0, h: 0.9, d: 1.0 },
  { id: 'shelf',    label: 'Bookshelf',      shape: 'box',      w: 1.2, h: 3.2, d: 0.4 },
  { id: 'tv',       label: 'Television',     shape: 'box',      w: 2.0, h: 1.2, d: 0.25 },
  { id: 'sofa',     label: 'Sofa',           shape: 'box',      w: 2.5, h: 1.0, d: 1.0 },
  { id: 'plant',    label: 'Plant Pot',      shape: 'cylinder', r: 0.45, h: 1.3 },
  { id: 'cabinet',  label: 'Filing Cabinet', shape: 'box',      w: 0.6, h: 2.0, d: 0.5 },
  { id: 'locker',   label: 'Locker',         shape: 'box',      w: 0.9, h: 2.5, d: 0.5 },
  { id: 'smallbox', label: 'Small Box',      shape: 'box',      w: 0.8, h: 0.8, d: 0.8 },
  { id: 'pc',       label: 'Desktop PC',     shape: 'box',      w: 0.5, h: 1.5, d: 0.4 },
];

const SCENE_OBJECTS = [
  { id: 'so1',  typeId: 'shelf',    x: 0.4,  z: 4.0  },
  { id: 'so2',  typeId: 'shelf',    x: 0.4,  z: 10.0 },
  { id: 'so3',  typeId: 'crate',    x: 3.0,  z: 2.0  },
  { id: 'so4',  typeId: 'crate',    x: 5.0,  z: 2.0  },
  { id: 'so5',  typeId: 'barrel',   x: 14.5, z: 2.0  },
  { id: 'so6',  typeId: 'barrel',   x: 16.0, z: 2.0  },
  { id: 'so7',  typeId: 'table',    x: 10.0, z: 10.0 },
  { id: 'so8',  typeId: 'chair',    x: 8.5,  z: 9.5  },
  { id: 'so9',  typeId: 'chair',    x: 11.5, z: 9.5  },
  { id: 'so10', typeId: 'sofa',     x: 10.0, z: 17.5 },
  { id: 'so11', typeId: 'plant',    x: 1.0,  z: 18.5 },
  { id: 'so12', typeId: 'plant',    x: 19.0, z: 18.5 },
  { id: 'so13', typeId: 'cabinet',  x: 19.4, z: 5.0  },
  { id: 'so14', typeId: 'cabinet',  x: 19.4, z: 6.5  },
  { id: 'so15', typeId: 'locker',   x: 19.4, z: 12.0 },
  { id: 'so16', typeId: 'locker',   x: 19.4, z: 13.5 },
  { id: 'so17', typeId: 'smallbox', x: 4.0,  z: 17.5 },
  { id: 'so18', typeId: 'smallbox', x: 16.0, z: 17.5 },
  { id: 'so19', typeId: 'pc',       x: 5.0,  z: 5.0  },
  { id: 'so20', typeId: 'smallbox', x: 7.0,  z: 14.0 },
];

const PROP_SPAWNS = [
  { x: 10, z: 10 }, { x: 6,  z: 8  }, { x: 14, z: 8  },
  { x: 8,  z: 14 }, { x: 12, z: 14 }, { x: 6,  z: 16 },
  { x: 14, z: 16 }, { x: 10, z: 6  },
];

const HUNTER_SPAWNS = [
  { x: 10, z: 1.5 }, { x: 8, z: 1.5 }, { x: 12, z: 1.5 },
];

module.exports = {
  ROOM_CODE_LENGTH: 4,
  MAX_PLAYERS: 8,
  MIN_PLAYERS: 2,
  GAME_STATE_TICK_MS: 80,
  HIDING_DURATION_MS: 30_000,
  HUNTING_DURATION_MS: 180_000,
  ROUNDS_TO_WIN: 2,
  PROP_MOVES_PER_ROUND: 3,
  MOVE_WINDOW_MS: 3_000,
  TAUNT_COOLDOWN_MS: 15_000,
  SHOOT_MAX_RANGE: 30,
  ROOM_SIZE: 20,
  ROOM_HEIGHT: 4,
  PLAYER_COLORS,
  PROP_TYPES,
  SCENE_OBJECTS,
  PROP_SPAWNS,
  HUNTER_SPAWNS,
};
