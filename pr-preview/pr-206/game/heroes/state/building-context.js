import { resourcesOf } from './kingdoms.js'
import { builtIn, hasBuiltToday, townIdsOf, townOwner } from './towns.js'

export function buildingContextOf(state, townId, { isNextToWater }) {
  const owner = townOwner(state, townId)
  return {
    town: {
      built: builtIn(state, townId),
      hasBuiltToday: hasBuiltToday(state, townId),
      isNextToWater
    },
    builtElsewhere: (buildingId) =>
      townIdsOf(state, owner).some(
        (otherTownId) => otherTownId !== townId && builtIn(state, otherTownId).has(buildingId)
      ),
    treasury: resourcesOf(state, owner)
  }
}
