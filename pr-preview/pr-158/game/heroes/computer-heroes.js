import { heroOwner, heroTile, isRemoved } from '../state/queries.js'
import { townIdAt, townOwner } from './state/towns.js'

function isInOwnTown(state, heroId) {
  const townId = townIdAt(state, heroTile(state, heroId))
  return townId !== null && townOwner(state, townId) === heroOwner(state, heroId)
}

function byCostThenTile(a, b) {
  return a.cost - b.cost || a.tile.y - b.tile.y || a.tile.x - b.tile.x
}

export function decideComputerHeroMove({ state, heroId, resourcePiles, routes }) {
  if (isInOwnTown(state, heroId)) {
    return null
  }

  const piles = resourcePiles.filter((pile) => !isRemoved(state, pile.id))
  const paths = routes.planRoutes(piles.map((pile) => pile.tile))
  const [nearest] = piles
    .map((pile, index) => ({ tile: pile.tile, path: paths[index] }))
    .filter(({ path }) => path !== null && routes.getPathToBattle(path) === null)
    .map((target) => ({ ...target, cost: routes.routeCost(target.path) }))
    .sort(byCostThenTile)

  if (!nearest || routes.chargeStepsToday(nearest.path).length === 0) {
    return null
  }
  return { targetTile: nearest.tile, path: nearest.path }
}
