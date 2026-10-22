import { tileKey } from '../../../engine/tile-utils.js'

const SURROUNDING_OFFSETS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
]

function isWater(map, tile) {
  return map?.getTerrainType(tile)?.isWater === true
}

// The guards of each tile around them, in the order `guards` lists them, which is the order
// their battles are fought in. As in Heroes 3, a guard on land does not guard water, nor the
// other way round.
export function indexGuardedTiles(guards, map) {
  const guardsByTile = new Map()
  for (const guard of guards) {
    for (const [dx, dy] of SURROUNDING_OFFSETS) {
      const tile = { x: guard.tile.x + dx, y: guard.tile.y + dy }
      if (isWater(map, tile) !== isWater(map, guard.tile)) {
        continue
      }

      const key = tileKey(tile)
      guardsByTile.set(key, [...(guardsByTile.get(key) ?? []), guard])
    }
  }

  return {
    getGuardsAt: (tile) => guardsByTile.get(tileKey(tile)) ?? []
  }
}
