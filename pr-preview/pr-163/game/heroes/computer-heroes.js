import { heroOwner, isRemoved, isTileExplored } from '../state/queries.js'
import { dwellingRecruitCount } from './computer-recruiting.js'
import {
  MOVEMENT_INTERACTION_KIND_DWELLING_VISIT,
  MOVEMENT_INTERACTION_KIND_MINE_ENTER,
  MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT
} from './interaction-kinds.js'
import { dwellingGuardsAgainst, dwellingOwner, mineOwner } from './state/map-objects.js'

export const COMPUTER_HERO_TARGET_KINDS = Object.freeze([
  MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT,
  MOVEMENT_INTERACTION_KIND_MINE_ENTER,
  MOVEMENT_INTERACTION_KIND_DWELLING_VISIT
])

const isWorthGoingTo = {
  [MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT]: (state, target) => !isRemoved(state, target.id),
  [MOVEMENT_INTERACTION_KIND_MINE_ENTER]: (state, target, { player }) =>
    mineOwner(state, target.id) !== player,
  [MOVEMENT_INTERACTION_KIND_DWELLING_VISIT]: (state, target, { player, heroId, definitions }) =>
    dwellingOwner(state, target.id) === player
      ? dwellingRecruitCount({ state, dwellingId: target.id, heroId, definitions }) > 0
      : dwellingGuardsAgainst(state, target.id, player) === 0
}

function byCostThenTile(a, b) {
  return a.cost - b.cost || a.tile.y - b.tile.y || a.tile.x - b.tile.x
}

const NEIGHBOUR_OFFSETS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
]

function touchesUnexplored(state, player, map, tile) {
  return NEIGHBOUR_OFFSETS.some(([dx, dy]) => {
    const neighbour = { x: tile.x + dx, y: tile.y + dy }
    return map.inBounds(neighbour) && !isTileExplored(state, player, neighbour)
  })
}

// A hero only walks on tiles its owner has explored, so it explores from the edge of them.
function explorationTiles({ state, player, map, isEmpty }) {
  const tiles = []
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tile = { x, y }
      if (
        isTileExplored(state, player, tile) &&
        map.isPassable(tile) &&
        isEmpty(tile) &&
        touchesUnexplored(state, player, map, tile)
      ) {
        tiles.push(tile)
      }
    }
  }
  return tiles
}

function nearestReachable(tiles, routes) {
  const paths = routes.planRoutes(tiles)
  const [nearest] = tiles
    .map((tile, index) => ({ tile, path: paths[index] }))
    .filter(({ path }) => path !== null && routes.getPathToBattle(path) === null)
    .map((target) => ({ ...target, cost: routes.routeCost(target.path) }))
    .sort(byCostThenTile)
  return nearest ?? null
}

export function decideComputerHeroMove({ state, map, heroId, targets, routes, definitions }) {
  const player = heroOwner(state, heroId)
  const open = targets.filter((target) =>
    isWorthGoingTo[target.kind](state, target, { player, heroId, definitions })
  )
  const nearest =
    nearestReachable(
      open.map((target) => target.tile),
      routes
    ) ?? nearestReachable(explorationTiles({ state, player, map, isEmpty: routes.isEmpty }), routes)

  if (!nearest || routes.chargeStepsToday(nearest.path).length === 0) {
    return null
  }
  return { targetTile: nearest.tile, path: nearest.path }
}
