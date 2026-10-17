import { deepFreeze } from '../../engine/deep-freeze.js'

// Tile codes used in scenario terrain. 0 and 1 keep their V1 meaning (open / blocked ground).
export const heroesTerrainTypes = deepFreeze({
  0: { name: 'grass', passable: true },
  1: { name: 'rock', passable: false },
  2: { name: 'dirt', passable: true },
  3: { name: 'sand', passable: true },
  4: { name: 'snow', passable: true },
  5: { name: 'swamp', passable: true },
  6: { name: 'rough', passable: true },
  7: { name: 'subterranean', passable: true },
  8: { name: 'lava', passable: true },
  9: { name: 'water', passable: false }
})
