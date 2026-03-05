import { isMine } from './domain/entity-queries.js';

export const MINE_BLOCKER_KIND = 'MINE_BLOCKER';

export const MINE_BLOCKED_OFFSETS = Object.freeze([
  Object.freeze({ x: -1, y: -1 }),
  Object.freeze({ x: 0, y: -1 }),
  Object.freeze({ x: 1, y: -1 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 1, y: 0 })
]);

function tileKey(tile) {
  return `${tile.x},${tile.y}`;
}

export function createMineFootprintBlockers({ entities, map, occupiedTiles = null }) {
  if (!map || typeof map.inBounds !== 'function') {
    return [];
  }

  const occupied =
    occupiedTiles instanceof Set
      ? new Set(occupiedTiles)
      : new Set((entities ?? []).map((entity) => tileKey(entity.tile)));
  const blockers = [];

  for (const entity of entities ?? []) {
    if (!isMine(entity)) {
      continue;
    }

    const center = entity.tile;
    for (const offset of MINE_BLOCKED_OFFSETS) {
      const blockerTile = {
        x: center.x + offset.x,
        y: center.y + offset.y
      };
      if (!map.inBounds(blockerTile)) {
        continue;
      }

      const key = tileKey(blockerTile);
      if (occupied.has(key)) {
        continue;
      }
      occupied.add(key);

      blockers.push({
        id: `${entity.id}-blocker-${offset.x},${offset.y}`,
        kind: MINE_BLOCKER_KIND,
        mineId: entity.id,
        tile: blockerTile
      });
    }
  }

  return blockers;
}
