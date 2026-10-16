import { tileKey } from '../engine/tile-utils.js'

export const FOOTPRINT_BLOCKER_KIND = 'FOOTPRINT_BLOCKER'

// One blocker per footprint tile, skipping tiles off the map or already taken by an entity
// or an earlier footprint.
export function createFootprintBlockers({ entities, map, getFootprintOffsets }) {
  const occupied = new Set((entities ?? []).map((entity) => tileKey(entity.tile)))
  const blockers = []

  for (const entity of entities ?? []) {
    for (const offset of getFootprintOffsets(entity)) {
      const tile = { x: entity.tile.x + offset.x, y: entity.tile.y + offset.y }
      const key = tileKey(tile)
      if (!map.inBounds(tile) || occupied.has(key)) {
        continue
      }

      occupied.add(key)
      blockers.push({
        id: `${entity.id}__footprint_${offset.x},${offset.y}`,
        kind: FOOTPRINT_BLOCKER_KIND,
        ownerId: entity.id,
        tile
      })
    }
  }

  return blockers
}
