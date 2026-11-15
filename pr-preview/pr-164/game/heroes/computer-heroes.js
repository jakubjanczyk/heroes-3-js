import { heroOwner, isRemoved, isTileExplored } from '../state/queries.js'
import { dwellingRecruitCount } from './computer-recruiting.js'
import { canBeat } from './computer-strength.js'
import {
  MOVEMENT_INTERACTION_KIND_DWELLING_VISIT,
  MOVEMENT_INTERACTION_KIND_MINE_ENTER,
  MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT,
  MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT
} from './interaction-kinds.js'
import { heroById } from './state/hero-details.js'
import {
  dwellingGuardsAgainst,
  dwellingOwner,
  mineOwner,
  monsterCount
} from './state/map-objects.js'

export const COMPUTER_HERO_TARGET_KINDS = Object.freeze([
  MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT,
  MOVEMENT_INTERACTION_KIND_MINE_ENTER,
  MOVEMENT_INTERACTION_KIND_DWELLING_VISIT,
  MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT
])

function canBeatGuards(state, target, { player, heroId, definitions }) {
  const guards = dwellingGuardsAgainst(state, target.id, player)
  const creature = definitions?.dwellings?.[target.type]?.creature
  return (
    guards === 0 ||
    canBeat({
      hero: heroById(state, heroId),
      enemyArmy: [{ creature, count: guards }],
      definitions
    })
  )
}

const isWorthGoingTo = {
  [MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT]: (state, target) => !isRemoved(state, target.id),
  [MOVEMENT_INTERACTION_KIND_MINE_ENTER]: (state, target, { player }) =>
    mineOwner(state, target.id) !== player,
  [MOVEMENT_INTERACTION_KIND_DWELLING_VISIT]: (state, target, { player, heroId, definitions }) =>
    dwellingOwner(state, target.id) === player
      ? dwellingRecruitCount({ state, dwellingId: target.id, heroId, definitions }) > 0
      : canBeatGuards(state, target, { player, heroId, definitions }),
  [MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT]: (state, target, { heroId, definitions }) =>
    !isRemoved(state, target.id) &&
    canBeat({
      hero: heroById(state, heroId),
      enemyArmy: [{ creature: target.type, count: monsterCount(state, target.id) ?? target.count }],
      definitions
    })
}

// A monster is reached by fighting it, and only it; anything else without a fight.
function reachesTarget(routes, target, path) {
  const pathToBattle = routes.getPathToBattle(path)
  if (target.kind !== MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT) {
    return pathToBattle === null
  }
  if (pathToBattle === null || pathToBattle.length === path.length) {
    return pathToBattle !== null
  }
  const battles = routes.battlesOnArrivalAt(pathToBattle.at(-1))
  return (
    pathToBattle.length === path.length - 1 &&
    battles.length > 0 &&
    battles.every(({ entityId }) => entityId === target.id)
  )
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

function nearestReachable(targets, routes) {
  const paths = routes.planRoutes(targets.map(({ tile }) => tile))
  const [nearest] = targets
    .map((target, index) => ({ target, tile: target.tile, path: paths[index] }))
    .filter(({ target, path }) => path !== null && reachesTarget(routes, target, path))
    .map((target) => ({ ...target, cost: routes.routeCost(target.path) }))
    .sort(byCostThenTile)
  return nearest ?? null
}

export function decideComputerHeroMove({ state, map, heroId, targets, routes, definitions }) {
  const player = heroOwner(state, heroId)
  const open = targets.filter((target) =>
    isWorthGoingTo[target.kind](state, target, { player, heroId, definitions })
  )
  const exploration = () =>
    explorationTiles({ state, player, map, isEmpty: routes.isEmpty }).map((tile) => ({ tile }))
  const nearest = nearestReachable(open, routes) ?? nearestReachable(exploration(), routes)

  if (!nearest || routes.chargeStepsToday(nearest.path).length === 0) {
    return null
  }
  return { targetTile: nearest.tile, path: nearest.path }
}
