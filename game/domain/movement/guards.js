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

// The guards of each tile around them, in the order `guards` lists them, which is the order
// their battles are fought in.
export function indexGuardedTiles(guards) {
  const guardsByTile = new Map()
  for (const guard of guards) {
    for (const [dx, dy] of SURROUNDING_OFFSETS) {
      const key = tileKey({ x: guard.tile.x + dx, y: guard.tile.y + dy })
      guardsByTile.set(key, [...(guardsByTile.get(key) ?? []), guard])
    }
  }

  return {
    getGuardsAt: (tile) => guardsByTile.get(tileKey(tile)) ?? []
  }
}
