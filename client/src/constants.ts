import type { ItemDef } from './types';

export const ITEM_POOL: ItemDef[] = [
  { id: 'milk',      name: 'Milk',      emoji: '🥛', color: 0xffffff, aisle: 0 },
  { id: 'eggs',      name: 'Eggs',      emoji: '🥚', color: 0xfff9c4, aisle: 0 },
  { id: 'cheese',    name: 'Cheese',    emoji: '🧀', color: 0xffa726, aisle: 0 },
  { id: 'yogurt',    name: 'Yogurt',    emoji: '🫙', color: 0xf8bbd9, aisle: 0 },
  { id: 'steak',     name: 'Steak',     emoji: '🥩', color: 0xc62828, aisle: 0 },
  { id: 'fish',      name: 'Fish',      emoji: '🐟', color: 0x29b6f6, aisle: 0 },
  { id: 'bread',     name: 'Bread',     emoji: '🍞', color: 0xd4a574, aisle: 1 },
  { id: 'chips',     name: 'Chips',     emoji: '🥨', color: 0xffcc02, aisle: 1 },
  { id: 'cereal',    name: 'Cereal',    emoji: '🥣', color: 0xff6b35, aisle: 1 },
  { id: 'pasta',     name: 'Pasta',     emoji: '🍝', color: 0xffe082, aisle: 1 },
  { id: 'rice',      name: 'Rice',      emoji: '🍚', color: 0xf5f5f5, aisle: 1 },
  { id: 'chocolate', name: 'Choc',      emoji: '🍫', color: 0x5d4037, aisle: 1 },
  { id: 'apple',     name: 'Apple',     emoji: '🍎', color: 0xe53935, aisle: 2 },
  { id: 'banana',    name: 'Banana',    emoji: '🍌', color: 0xffeb3b, aisle: 2 },
  { id: 'grapes',    name: 'Grapes',    emoji: '🍇', color: 0x7b1fa2, aisle: 2 },
  { id: 'tomato',    name: 'Tomato',    emoji: '🍅', color: 0xd32f2f, aisle: 2 },
  { id: 'juice',     name: 'OJ',        emoji: '🧃', color: 0xff9800, aisle: 3 },
  { id: 'water',     name: 'Water',     emoji: '💧', color: 0x81d4fa, aisle: 3 },
  { id: 'cola',      name: 'Cola',      emoji: '🥤', color: 0x3e2723, aisle: 3 },
  { id: 'coffee',    name: 'Coffee',    emoji: '☕', color: 0x4e342e, aisle: 3 },
  { id: 'pizza',     name: 'Pizza',     emoji: '🍕', color: 0xef5350, aisle: 4 },
  { id: 'icecream',  name: 'Ice Cream', emoji: '🍦', color: 0xfce4ec, aisle: 4 },
];

export const PLAYER_COLORS = [
  { value: 0xff4757, hex: '#ff4757' },
  { value: 0x2ed573, hex: '#2ed573' },
  { value: 0x1e90ff, hex: '#1e90ff' },
  { value: 0xffa502, hex: '#ffa502' },
];

export const MAP_HALF = 52;
export const LIST_SIZE = 5;
export const GAME_DURATION = 120;
export const CLEARANCE_SALE_TIME = 60;
export const COLLISION_SPEED_THRESHOLD = 3;
export const PICKUP_RADIUS = 2.2;
export const JUICE_PUDDLE_COUNT = 5;
export const JUICE_PUDDLE_RADIUS = 4;
export const ITEM_RESPAWN_DELAY = 10000;

export const AISLE_Z_POSITIONS = [-30, -18, -6, 6, 18];
