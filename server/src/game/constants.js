const ITEM_POOL = [
  { id: 'milk',      name: 'Milk',      emoji: '🥛', aisle: 0 },
  { id: 'eggs',      name: 'Eggs',      emoji: '🥚', aisle: 0 },
  { id: 'cheese',    name: 'Cheese',    emoji: '🧀', aisle: 0 },
  { id: 'yogurt',    name: 'Yogurt',    emoji: '🫙', aisle: 0 },
  { id: 'steak',     name: 'Steak',     emoji: '🥩', aisle: 0 },
  { id: 'fish',      name: 'Fish',      emoji: '🐟', aisle: 0 },
  { id: 'bread',     name: 'Bread',     emoji: '🍞', aisle: 1 },
  { id: 'chips',     name: 'Chips',     emoji: '🥨', aisle: 1 },
  { id: 'cereal',    name: 'Cereal',    emoji: '🥣', aisle: 1 },
  { id: 'pasta',     name: 'Pasta',     emoji: '🍝', aisle: 1 },
  { id: 'rice',      name: 'Rice',      emoji: '🍚', aisle: 1 },
  { id: 'chocolate', name: 'Choc',      emoji: '🍫', aisle: 1 },
  { id: 'apple',     name: 'Apple',     emoji: '🍎', aisle: 2 },
  { id: 'banana',    name: 'Banana',    emoji: '🍌', aisle: 2 },
  { id: 'grapes',    name: 'Grapes',    emoji: '🍇', aisle: 2 },
  { id: 'tomato',    name: 'Tomato',    emoji: '🍅', aisle: 2 },
  { id: 'juice',     name: 'OJ',        emoji: '🧃', aisle: 3 },
  { id: 'water',     name: 'Water',     emoji: '💧', aisle: 3 },
  { id: 'cola',      name: 'Cola',      emoji: '🥤', aisle: 3 },
  { id: 'coffee',    name: 'Coffee',    emoji: '☕', aisle: 3 },
  { id: 'pizza',     name: 'Pizza',     emoji: '🍕', aisle: 4 },
  { id: 'icecream',  name: 'Ice Cream', emoji: '🍦', aisle: 4 },
];

const PLAYER_COLORS = [
  { value: 0xff4757, hex: '#ff4757' },
  { value: 0x2ed573, hex: '#2ed573' },
  { value: 0x1e90ff, hex: '#1e90ff' },
  { value: 0xffa502, hex: '#ffa502' },
];

const AISLE_Z_POSITIONS = [-30, -18, -6, 6, 18];
const MAP_HALF = 52;
const LIST_SIZE = 5;
const GAME_DURATION = 120;
const CLEARANCE_SALE_TIME = 60;
const ITEM_RESPAWN_DELAY = 10000;
const COLLISION_SPEED_THRESHOLD = 3;

module.exports = {
  ITEM_POOL,
  PLAYER_COLORS,
  AISLE_Z_POSITIONS,
  MAP_HALF,
  LIST_SIZE,
  GAME_DURATION,
  CLEARANCE_SALE_TIME,
  ITEM_RESPAWN_DELAY,
  COLLISION_SPEED_THRESHOLD,
};
