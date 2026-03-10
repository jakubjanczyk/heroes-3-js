import { isTown } from './domain/entity-queries.js';
import { createFootprintBlockers } from './footprint-utils.js';

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

export function createTownFootprintBlockers({ entities, map }) {
  return createFootprintBlockers({
    entities,
    map,
    blockedOffsets: TOWN_BLOCKED_OFFSETS,
    isFootprintEntity: isTown,
    makeBlocker: ({ entity, tile, index }) => ({
      id: `${entity.id}__blocker_${index}`,
      kind: TOWN_BLOCKER_KIND,
      townId: entity.id,
      type: entity.type,
      tile
    })
  });
}
