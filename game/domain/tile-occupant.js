import { sameTile } from '../../engine/tile-utils.js';

// What stands on a tile: another hero first, then whatever the static map holds there,
// unless it was removed. `excludeHeroId` is the hero asking, which never blocks itself.
export function getOccupantAt({
  tile,
  staticOccupancy,
  heroPositions = {},
  removedIds = new Set(),
  excludeHeroId = null
}) {
  for (const [heroId, heroTile] of Object.entries(heroPositions)) {
    if (heroId !== excludeHeroId && sameTile(heroTile, tile)) {
      return { id: heroId, kind: 'HERO', tile: heroTile };
    }
  }

  const occupant = staticOccupancy?.getAt?.(tile) ?? null;
  if (!occupant || removedIds.has(occupant.id)) {
    return null;
  }

  return occupant;
}
