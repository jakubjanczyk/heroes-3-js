import { deepFreeze } from '../../engine/deep-freeze.js'

// Road codes used in scenario `terrain.roads` (0 is no road).
// `movementCost` is what a straight step leaving the tile costs when both tiles have a road.
export const heroesRoadTypes = deepFreeze({
  1: { name: 'dirt', movementCost: 75 },
  2: { name: 'gravel', movementCost: 65 },
  3: { name: 'cobblestone', movementCost: 50 }
})
