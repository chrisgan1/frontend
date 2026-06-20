export const PLAYER_COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#10b981',
  '#f43f5e', '#3b82f6', '#a855f7', '#14b8a6',
] as const;

export const ROOM_SIZE = 20;
export const ROOM_HEIGHT = 4;
export const EYE_HEIGHT = 1.7;
export const MOVE_SPEED_HUNTER = 5.5;
export const MOVE_SPEED_PROP = 4.0;
export const MOVE_EMIT_INTERVAL = 50;
export const MOUSE_SENSITIVITY = 0.0022;

export const PROP_TYPES = [
  { id: 'crate',    label: 'Wooden Crate',   shape: 'box'      as const, w: 1.5, h: 1.5, d: 1.5, color: 0x8B5E3C },
  { id: 'barrel',   label: 'Barrel',         shape: 'cylinder' as const, r: 0.55, h: 1.4,         color: 0xB22222 },
  { id: 'chair',    label: 'Chair',          shape: 'box'      as const, w: 0.8, h: 1.2, d: 0.8,  color: 0x888888 },
  { id: 'table',    label: 'Table',          shape: 'box'      as const, w: 2.0, h: 0.9, d: 1.0,  color: 0x5C3D2E },
  { id: 'shelf',    label: 'Bookshelf',      shape: 'box'      as const, w: 1.2, h: 3.2, d: 0.4,  color: 0x2D1B0E },
  { id: 'tv',       label: 'Television',     shape: 'box'      as const, w: 2.0, h: 1.2, d: 0.25, color: 0x111827 },
  { id: 'sofa',     label: 'Sofa',           shape: 'box'      as const, w: 2.5, h: 1.0, d: 1.0,  color: 0x1E3A5F },
  { id: 'plant',    label: 'Plant Pot',      shape: 'cylinder' as const, r: 0.45, h: 1.3,          color: 0x166534 },
  { id: 'cabinet',  label: 'Filing Cabinet', shape: 'box'      as const, w: 0.6, h: 2.0, d: 0.5,  color: 0x6B7280 },
  { id: 'locker',   label: 'Locker',         shape: 'box'      as const, w: 0.9, h: 2.5, d: 0.5,  color: 0x064E3B },
  { id: 'smallbox', label: 'Small Box',      shape: 'box'      as const, w: 0.8, h: 0.8, d: 0.8,  color: 0xA16207 },
  { id: 'pc',       label: 'Desktop PC',     shape: 'box'      as const, w: 0.5, h: 1.5, d: 0.4,  color: 0x374151 },
] as const;

export type PropTypeId = typeof PROP_TYPES[number]['id'];

export const SCENE_OBJECTS = [
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
] as const;
