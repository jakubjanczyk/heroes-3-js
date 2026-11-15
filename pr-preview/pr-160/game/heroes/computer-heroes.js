import { heroOwner, heroTile, isRemoved } from '../state/queries.js'
import {
  MOVEMENT_INTERACTION_KIND_DWELLING_VISIT,
  MOVEMENT_INTERACTION_KIND_MINE_ENTER,
  MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT
} from './interaction-kinds.js'
import { dwellingGuardsAgainst, dwellingOwner, mineOwner } from './state/map-objects.js'
import { townIdAt, townOwner } from './state/towns.js'

export const COMPUTER_HERO_TARGET_KINDS = Object.freeze([
  MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT,
  MOVEMENT_INTERACTION_KIND_MINE_ENTER,
  MOVEMENT_INTERACTION_KIND_DWELLING_VISIT
])

const isWorthGoingTo = {
  [MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT]: (state, target) => !isRemoved(state, target.id),
  [MOVEMENT_INTERACTION_KIND_MINE_ENTER]: (state, target, player) =>
    mineOwner(state, target.id) !== player,
  [MOVEMENT_INTERACTION_KIND_DWELLING_VISIT]: (state, target, player) =>
    dwellingOwner(state, target.id) !== player &&
    dwellingGuardsAgainst(state, target.id, player) === 0
}

function isInOwnTown(state, heroId) {
  const townId = townIdAt(state, heroTile(state, heroId))
  return townId !== null && townOwner(state, townId) === heroOwner(state, heroId)
}

function byCostThenTile(a, b) {
  return a.cost - b.cost || a.tile.y - b.tile.y || a.tile.x - b.tile.x
}

export function decideComputerHeroMove({ state, heroId, targets, routes }) {
  if (isInOwnTown(state, heroId)) {
    return null
  }

  const player = heroOwner(state, heroId)
  const open = targets.filter((target) => isWorthGoingTo[target.kind](state, target, player))
  const paths = routes.planRoutes(open.map((target) => target.tile))
  const [nearest] = open
    .map((target, index) => ({ tile: target.tile, path: paths[index] }))
    .filter(({ path }) => path !== null && routes.getPathToBattle(path) === null)
    .map((target) => ({ ...target, cost: routes.routeCost(target.path) }))
    .sort(byCostThenTile)

  if (!nearest || routes.chargeStepsToday(nearest.path).length === 0) {
    return null
  }
  return { targetTile: nearest.tile, path: nearest.path }
}
