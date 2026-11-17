import { sameTile } from '../../engine/tile-utils.js'
import {
  enemiesOf,
  heroIdAt,
  heroIdsOf,
  heroOwner,
  heroTile,
  isRemoved,
  isTileExplored
} from '../state/queries.js'
import { hasFullBackpack } from './artifacts.js'
import { computerChoiceAt } from './computer-choices.js'
import { dwellingRecruitCount } from './computer-recruiting.js'
import { canBeat, heroStrength, outmatches } from './computer-strength.js'
import { createDangerMap } from './computer-threats.js'
import { createTargetWorth } from './computer-worth.js'
import {
  MOVEMENT_INTERACTION_KIND_ARTIFACT_PICK_UP,
  MOVEMENT_INTERACTION_KIND_BONUS_OBJECT_VISIT,
  MOVEMENT_INTERACTION_KIND_DWELLING_VISIT,
  MOVEMENT_INTERACTION_KIND_HERO_MEET,
  MOVEMENT_INTERACTION_KIND_MINE_ENTER,
  MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT,
  MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT,
  MOVEMENT_INTERACTION_KIND_RESOURCE_GENERATOR_VISIT,
  MOVEMENT_INTERACTION_KIND_TOWN_VISIT,
  MOVEMENT_INTERACTION_KIND_TREASURE_CHEST_OPEN
} from './interaction-kinds.js'
import { getArmyStrength } from './monster-stacks.js'
import { heroById } from './state/hero-details.js'
import {
  artifactGuards,
  dwellingGuardsAgainst,
  dwellingOwner,
  mineOwner,
  monsterCount
} from './state/map-objects.js'
import { townGarrison, townIdAt, townOwner } from './state/towns.js'
import { joinGarrison } from './town-garrison.js'
import { visitOffer } from './visitable-objects/visits.js'

export const COMPUTER_HERO_TARGET_KINDS = Object.freeze([
  MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT,
  MOVEMENT_INTERACTION_KIND_MINE_ENTER,
  MOVEMENT_INTERACTION_KIND_DWELLING_VISIT,
  MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT,
  MOVEMENT_INTERACTION_KIND_TOWN_VISIT,
  MOVEMENT_INTERACTION_KIND_ARTIFACT_PICK_UP,
  MOVEMENT_INTERACTION_KIND_TREASURE_CHEST_OPEN,
  MOVEMENT_INTERACTION_KIND_RESOURCE_GENERATOR_VISIT,
  MOVEMENT_INTERACTION_KIND_BONUS_OBJECT_VISIT
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

// A hero standing in the town defends it with the garrison's stacks beside its own.
function townDefenders(state, target) {
  const garrison = townGarrison(state, target.id)
  const defenderId = heroIdAt(state, target.tile)
  return defenderId === null
    ? garrison
    : joinGarrison(heroById(state, defenderId).army, garrison).army
}

function canTakeTown(state, target, { player, heroId, definitions }) {
  const defenders = townDefenders(state, target).filter(Boolean)
  return (
    townOwner(state, target.id) !== player &&
    (defenders.length === 0 ||
      canBeat({ hero: heroById(state, heroId), enemyArmy: defenders, definitions }))
  )
}

function canTakeArtifact(state, target, { heroId, definitions }) {
  const hero = heroById(state, heroId)
  const guards = artifactGuards(state, target.id)
  return (
    !isRemoved(state, target.id) &&
    !hasFullBackpack(hero.artifacts) &&
    (guards.length === 0 || canBeat({ hero, enemyArmy: guards, definitions }))
  )
}

// An object is worth a visit when it would give the hero something it would take.
function gainsFromVisit(state, target, { heroId, definitions }) {
  const entity = { id: target.id, kind: target.entityKind, type: target.type }
  const offer = visitOffer({ state, definitions, entity, heroId })
  return (
    offer !== null &&
    (offer.choices === null ||
      computerChoiceAt({ hero: heroById(state, heroId), choices: offer.choices, definitions }) !==
        null)
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
    }),
  [MOVEMENT_INTERACTION_KIND_TOWN_VISIT]: canTakeTown,
  [MOVEMENT_INTERACTION_KIND_ARTIFACT_PICK_UP]: canTakeArtifact,
  [MOVEMENT_INTERACTION_KIND_TREASURE_CHEST_OPEN]: (state, target) => !isRemoved(state, target.id),
  [MOVEMENT_INTERACTION_KIND_RESOURCE_GENERATOR_VISIT]: gainsFromVisit,
  [MOVEMENT_INTERACTION_KIND_BONUS_OBJECT_VISIT]: gainsFromVisit
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

function emptyExploredTiles({ state, player, map, isEmpty }) {
  const tiles = []
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tile = { x, y }
      if (isTileExplored(state, player, tile) && map.isPassable(tile) && isEmpty(tile)) {
        tiles.push(tile)
      }
    }
  }
  return tiles
}

// A hero only walks on tiles its owner has explored, so it explores from the edge of them.
function explorationTiles(where) {
  return emptyExploredTiles(where).filter((tile) =>
    touchesUnexplored(where.state, where.player, where.map, tile)
  )
}

// The targets the hero can reach, each with its route and what the route costs, nearest first
// unless `order` says otherwise.
function reachableByCost(targets, routes, order = byCostThenTile) {
  const paths = routes.planRoutes(targets.map(({ tile }) => tile))
  return targets
    .map((target, index) => ({ target, tile: target.tile, path: paths[index] }))
    .filter(({ target, path }) => path !== null && reachesTarget(routes, target, path))
    .map((target) => ({ ...target, cost: routes.routeCost(target.path) }))
    .sort(order)
}

// A target's score is its worth over the days the route takes, the movement points it costs over
// the hero's day of them; the highest first, then the nearest.
function byWorthForDays({ worthOf, maxMovementPoints }) {
  const scores = new Map()
  const scoreOf = (candidate) => {
    if (!scores.has(candidate)) {
      const days = Math.max(candidate.cost, 1) / maxMovementPoints
      scores.set(candidate, worthOf(candidate.target) / days)
    }
    return scores.get(candidate)
  }
  return (a, b) => scoreOf(b) - scoreOf(a) || byCostThenTile(a, b)
}

function reachesToday(routes, path) {
  return routes.chargeStepsToday(path).length === path.length - 1
}

// A hero fighting at a monster or another hero stays on the tile before it.
function standingTile({ target, path }) {
  return [MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT, MOVEMENT_INTERACTION_KIND_HERO_MEET].includes(
    target.kind
  )
    ? path.at(-2)
    : path.at(-1)
}

// A hero standing in a town is attacked with the town.
function enemyHeroTargets({ state, player, heroId, definitions }) {
  const hero = heroById(state, heroId)
  return enemiesOf(state, player)
    .flatMap((enemy) => heroIdsOf(state, enemy))
    .map((enemyHeroId) => ({ id: enemyHeroId, tile: heroTile(state, enemyHeroId) }))
    .filter(
      ({ id, tile }) =>
        isTileExplored(state, player, tile) &&
        townIdAt(state, tile) === null &&
        canBeat({ hero, enemyArmy: heroById(state, id).army, definitions })
    )
    .map((target) => ({ ...target, kind: MOVEMENT_INTERACTION_KIND_HERO_MEET }))
}

function ownTownsOf(state, targets, player) {
  return targets.filter(
    (target) =>
      target.kind === MOVEMENT_INTERACTION_KIND_TOWN_VISIT && townOwner(state, target.id) === player
  )
}

function strengthInTown(decision, town) {
  const { state, hero, definitions } = decision
  const army = joinGarrison(hero.army, townGarrison(state, town.id)).army
  return heroStrength({ ...hero, army }, definitions)
}

function strengthAt(decision, tile) {
  const town = decision.ownTowns.find((ownTown) => sameTile(ownTown.tile, tile))
  return town ? strengthInTown(decision, town) : heroStrength(decision.hero, decision.definitions)
}

function isSafeAt(decision, tile, danger) {
  return danger === 0 || outmatches(strengthAt(decision, tile), danger)
}

function movesTo(nearest) {
  return { targetTile: nearest.tile, path: nearest.path }
}

// Its own town an enemy hero could take next turn, and that the hero would hold, it goes back to
// today, or stays in.
function defendTown(decision) {
  const { state, heroId, routes, ownTowns, dangerAt, definitions } = decision
  const free = ownTowns.filter((town) => [null, heroId].includes(heroIdAt(state, town.tile)))
  const danger = dangerAt(free.map(({ tile }) => tile))
  const threatened = free.filter(
    (town, index) =>
      danger[index] > 0 &&
      !outmatches(getArmyStrength(townGarrison(state, town.id), definitions), danger[index]) &&
      outmatches(strengthInTown(decision, town), danger[index])
  )
  if (threatened.some((town) => sameTile(town.tile, decision.tile))) {
    return { stays: true }
  }
  const [nearest] = reachableByCost(threatened, routes).filter(({ path }) =>
    reachesToday(routes, path)
  )
  return nearest ? movesTo(nearest) : null
}

function safeTilesToday(decision) {
  const { state, map, player, routes, ownTowns } = decision
  const tiles = [
    ...emptyExploredTiles({ state, player, map, isEmpty: routes.isEmpty }),
    ...ownTowns.filter((town) => heroIdAt(state, town.tile) === null).map(({ tile }) => tile)
  ].map((tile) => ({ tile }))
  const reachable = reachableByCost(tiles, routes).filter(({ path }) => reachesToday(routes, path))
  const danger = decision.dangerAt(reachable.map(({ tile }) => tile))
  return reachable.filter(({ tile }, index) => isSafeAt(decision, tile, danger[index]))
}

function firstSafe(decision, reachable) {
  const danger = decision.dangerAt(reachable.map(standingTile))
  return reachable.find((candidate, index) =>
    isSafeAt(decision, standingTile(candidate), danger[index])
  )
}

// Out of an enemy's reach if it can be, else as before.
function goTo(decision, candidates, order) {
  const reachable = reachableByCost(candidates, decision.routes, order)
  const nearest = firstSafe(decision, reachable)
  return nearest ?? (decision.isThreatened ? reachable[0] : undefined)
}

// A hero standing on another target is attacked as a hero, not as what it stands on, unless it
// defends a town.
function openTargets({ state, heroId, player, targets, definitions }) {
  return [
    ...targets.filter(
      (target) =>
        (target.kind === MOVEMENT_INTERACTION_KIND_TOWN_VISIT ||
          [null, heroId].includes(heroIdAt(state, target.tile))) &&
        isWorthGoingTo[target.kind](state, target, { player, heroId, definitions })
    ),
    ...enemyHeroTargets({ state, player, heroId, definitions })
  ]
}

function nearestTarget(decision, targets) {
  const { state, player, map, routes } = decision
  const exploration = () =>
    explorationTiles({ state, player, map, isEmpty: routes.isEmpty }).map((tile) => ({ tile }))
  const weighed = byWorthForDays(createTargetWorth(decision))
  return (
    goTo(decision, openTargets({ ...decision, targets }), weighed) ?? goTo(decision, exploration())
  )
}

export function decideComputerHeroMove({ state, map, heroId, targets, routesOf, definitions }) {
  const player = heroOwner(state, heroId)
  const tile = heroTile(state, heroId)
  const decision = {
    state,
    map,
    heroId,
    player,
    tile,
    hero: heroById(state, heroId),
    definitions,
    routes: routesOf(heroId),
    ownTowns: ownTownsOf(state, targets, player),
    dangerAt: createDangerMap({ state, player, heroId, routesOf, definitions })
  }

  const defence = defendTown(decision)
  if (defence) {
    return defence.stays ? null : defence
  }

  decision.isThreatened = !isSafeAt(decision, tile, decision.dangerAt([tile])[0])
  const [safeTile] = decision.isThreatened ? safeTilesToday(decision) : []
  const nearest = safeTile ?? nearestTarget(decision, targets)
  if (!nearest || decision.routes.chargeStepsToday(nearest.path).length === 0) {
    return null
  }
  return movesTo(nearest)
}
