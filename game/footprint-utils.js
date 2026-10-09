import { tileKey } from '../engine/tile-utils.js';

function canPlaceOnMap(map, tile) {
  if (typeof map?.inBounds !== 'function') {
    return true;
  }

  return map.inBounds(tile);
}

export function createFootprintBlockers({
  entities,
  map,
  blockedOffsets,
  occupiedTiles = null,
  isFootprintEntity = () => false,
  makeBlocker = () => null
}) {
  const occupied =
    occupiedTiles instanceof Set
      ? new Set(occupiedTiles)
      : new Set((entities ?? []).map((entity) => tileKey(entity.tile)));
  const blockers = [];

  for (const entity of entities ?? []) {
    if (!isFootprintEntity(entity)) {
      continue;
    }

    for (let index = 0; index < blockedOffsets.length; index += 1) {
      const offset = blockedOffsets[index];
      const tile = {
        x: entity.tile.x + offset.x,
        y: entity.tile.y + offset.y
      };

      if (!canPlaceOnMap(map, tile)) {
        continue;
      }

      const key = tileKey(tile);
      if (occupied.has(key)) {
        continue;
      }

      occupied.add(key);
      const blocker = makeBlocker({ entity, tile, offset, index });
      if (blocker) {
        blockers.push(blocker);
      }
    }
  }

  return blockers;
}
