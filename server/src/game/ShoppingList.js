const { ITEM_POOL, LIST_SIZE, AISLE_Z_POSITIONS } = require('./constants');
const { v4: uuidv4 } = require('uuid');

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateLists(playerIds) {
  const shuffled = shuffle(ITEM_POOL);
  const lists = {};
  playerIds.forEach((id, i) => {
    lists[id] = shuffled.slice(i * LIST_SIZE, (i + 1) * LIST_SIZE).map((item) => item.id);
  });
  return lists;
}

function getShelfPositionsForAisle(aisleIdx) {
  const positions = [];
  const shelfLength = 70;
  const unitCount = 10;
  const unitW = shelfLength / unitCount;
  const z = AISLE_Z_POSITIONS[aisleIdx] ?? 0;

  for (let i = 0; i < unitCount; i++) {
    const x = -shelfLength / 2 + unitW * (i + 0.5);
    if (Math.abs(x) < 8 && aisleIdx === 2) continue;
    positions.push({ x, z: z - 2 });
  }
  return positions;
}

function generateWorldItems(lists) {
  const worldItems = {};
  const usedPositions = new Set();

  // Collect all unique item defIds needed across all lists
  const neededIds = new Set();
  for (const list of Object.values(lists)) {
    for (const id of list) neededIds.add(id);
  }

  for (const defId of neededIds) {
    const def = ITEM_POOL.find((d) => d.id === defId);
    if (!def) continue;

    const shelfPositions = getShelfPositionsForAisle(def.aisle);
    let placed = false;

    for (const pos of shuffle(shelfPositions)) {
      const key = `${Math.round(pos.x)},${Math.round(pos.z)}`;
      if (!usedPositions.has(key)) {
        usedPositions.add(key);
        const instanceId = uuidv4();
        worldItems[instanceId] = {
          instanceId,
          defId,
          x: pos.x,
          z: pos.z,
          onFloor: false,
          collectedBy: null,
        };
        placed = true;
        break;
      }
    }

    // Fallback: random position in aisle
    if (!placed) {
      const z = AISLE_Z_POSITIONS[def.aisle] ?? 0;
      const instanceId = uuidv4();
      worldItems[instanceId] = {
        instanceId,
        defId,
        x: (Math.random() - 0.5) * 60,
        z: z - 2,
        onFloor: false,
        collectedBy: null,
      };
    }
  }

  return worldItems;
}

module.exports = { generateLists, generateWorldItems };
