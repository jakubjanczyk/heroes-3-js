import { deepFreeze } from '../../engine/deep-freeze.js'

// Tile codes used in scenario terrain. 0 and 1 keep their V1 meaning (open / blocked ground).
// `movementCost` is what a straight step leaving the tile costs, as in Heroes 3.
export const heroesTerrainTypes = deepFreeze({
  0: { name: 'grass', passable: true, movementCost: 100 },
  1: { name: 'rock', passable: false },
  2: { name: 'dirt', passable: true, movementCost: 100 },
  3: { name: 'sand', passable: true, movementCost: 150 },
  4: { name: 'snow', passable: true, movementCost: 150 },
  5: { name: 'swamp', passable: true, movementCost: 175 },
  6: { name: 'rough', passable: true, movementCost: 125 },
  7: { name: 'subterranean', passable: true, movementCost: 100 },
  8: { name: 'lava', passable: true, movementCost: 100 },
  9: { name: 'water', passable: false }
})
