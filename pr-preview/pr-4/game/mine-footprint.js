import { isMine } from './domain/entity-queries.js';
import { createFootprintBlockers } from './footprint-utils.js';

export const MINE_BLOCKER_KIND = 'MINE_BLOCKER';

export const MINE_BLOCKED_OFFSETS = Object.freeze([
  Object.freeze({ x: -1, y: -1 }),
  Object.freeze({ x: 0, y: -1 }),
  Object.freeze({ x: 1, y: -1 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 1, y: 0 })
]);

export function createMineFootprintBlockers({ entities, map, occupiedTiles = null }) {
  if (!map || typeof map.inBounds !== 'function') {
    return [];
  }

  return createFootprintBlockers({
    entities,
    map,
    blockedOffsets: MINE_BLOCKED_OFFSETS,
    occupiedTiles,
    isFootprintEntity: isMine,
    makeBlocker: ({ entity, tile, offset }) => ({
      id: `${entity.id}-blocker-${offset.x},${offset.y}`,
      kind: MINE_BLOCKER_KIND,
      mineId: entity.id,
      tile
    })
  });
}
