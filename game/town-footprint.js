export const TOWN_BLOCKER_KIND = 'TOWN_BLOCKER';

export const TOWN_BLOCKED_OFFSETS = Object.freeze([
  Object.freeze({ x: -1, y: -2 }),
  Object.freeze({ x: 0, y: -2 }),
  Object.freeze({ x: 1, y: -2 }),
  Object.freeze({ x: -2, y: -1 }),
  Object.freeze({ x: -1, y: -1 }),
  Object.freeze({ x: 0, y: -1 }),
  Object.freeze({ x: 1, y: -1 }),
  Object.freeze({ x: 2, y: -1 }),
  Object.freeze({ x: -2, y: 0 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: 2, y: 0 })
]);

function tileKey(tile) {
  return `${tile.x},${tile.y}`;
}

function canPlaceOnMap(map, tile) {
  if (typeof map?.inBounds !== 'function') {
    return true;
  }

  return map.inBounds(tile);
}

export function createTownFootprintBlockers({ entities, map }) {
  const blockers = [];
  const occupiedTiles = new Set((entities ?? []).map((entity) => tileKey(entity.tile)));

  for (const entity of entities ?? []) {
    if (entity.kind !== 'TOWN') {
      continue;
    }

    for (let index = 0; index < TOWN_BLOCKED_OFFSETS.length; index += 1) {
      const offset = TOWN_BLOCKED_OFFSETS[index];
      const tile = {
        x: entity.tile.x + offset.x,
        y: entity.tile.y + offset.y
      };

      if (!canPlaceOnMap(map, tile)) {
        continue;
      }

      const key = tileKey(tile);
      if (occupiedTiles.has(key)) {
        continue;
      }

      occupiedTiles.add(key);
      blockers.push({
        id: `${entity.id}__blocker_${index}`,
        kind: TOWN_BLOCKER_KIND,
        townId: entity.id,
        type: entity.type,
        tile
      });
    }
  }

  return blockers;
}
