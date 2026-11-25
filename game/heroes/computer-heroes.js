import { sameTile } from '../../engine/tile-utils.js'
import {
  enemiesOf,
  heroIdAt,
  heroIdsOf,
  heroMovementPoints,
  heroOwner,
  heroTile,
  isRemoved,
  isTileExplored,
  unexploredTilesInSight
} from '../state/queries.js'
import { hasFullBackpack } from './artifacts.js'
import { computerChoiceAt } from './computer-choices.js'
import { dwellingRecruitCount, stacksLedOutOfTown } from './computer-recruiting.js'
import { canBeat, heroStrength, outmatches, withWalls } from './computer-strength.js'
import { createDangerMap } from './computer-threats.js'
import { createTargetWorth, heroRisk, teachesWorthlessSkill } from './computer-worth.js'
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
import { HERO_SIGHT_RADIUS } from './state/fog.js'
import { heroById } from './state/hero-details.js'
import {
  artifactGuards,
  dwellingGuardsAgainst,
  dwellingOwner,
  mineOwner,
  monsterCount
} from './state/map-objects.js'
import { townGarrison, townIdAt, townOwner, townType } from './state/towns.js'
import { townBuildingsCatalogue } from './town-buildings.js'
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

function canTakeTown(state, target, { heroId, definitions }) {
  const defenders = townDefenders(state, target).filter(Boolean)
  return (
    defenders.length === 0 ||
    outmatches(
      heroStrength(heroById(state, heroId), definitions),
      withWalls(state, target.id, getArmyStrength(defenders, definitions))
    )
  )
}

// Its owner's town, with no hero in it, the hero goes back to for what it would lead out.
function leadsOutOf(state, target, { heroId, definitions, treasury }) {
  const { buildings } = townBuildingsCatalogue(definitions, townType(state, target.id))
  return (
    heroIdAt(state, target.tile) === null &&
    stacksLedOutOfTown({
      state,
      townId: target.id,
      heroId,
      buildings,
      monsters: definitions?.monsters,
      treasury
    }).length > 0
  )
}

function isTownWorthGoingTo(state, target, context) {
  return townOwner(state, target.id) === context.player
    ? leadsOutOf(state, target, context)
    : canTakeTown(state, target, context)
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

// An object is worth a visit when it would give the hero something it would take, as far as its
// owner knows what the object gives.
function gainsFromVisit(state, target, { player, heroId, definitions, treasury }) {
  const hero = heroById(state, heroId)
  const entity = { id: target.id, kind: target.entityKind, type: target.type }
  const offer = visitOffer({ state, definitions, entity, heroId, treasury, seenBy: player })
  return (
    offer !== null &&
    !teachesWorthlessSkill(offer.rewards, { hero, definitions }) &&
    (offer.choices === null ||
      computerChoiceAt({ hero, choices: offer.choices, definitions }) !== null)
  )
}

const isWorthGoingTo = {
  [MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT]: (state, target) => !isRemoved(state, target.id),
  [MOVEMENT_INTERACTION_KIND_MINE_ENTER]: (state, target, { player }) =>
    mineOwner(state, target.id) !== player,
  [MOVEMENT_INTERACTION_KIND_DWELLING_VISIT]: (
    state,
    target,
    { player, heroId, definitions, treasury }
  ) =>
    dwellingOwner(state, target.id) === player
      ? dwellingRecruitCount({ state, dwellingId: target.id, heroId, definitions, treasury }) > 0
      : canBeatGuards(state, target, { player, heroId, definitions }),
  [MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT]: (state, target, { heroId, definitions }) =>
    !isRemoved(state, target.id) &&
    canBeat({
      hero: heroById(state, heroId),
      enemyArmy: [{ creature: target.type, count: monsterCount(state, target.id) ?? target.count }],
      definitions
    }),
  [MOVEMENT_INTERACTION_KIND_TOWN_VISIT]: isTownWorthGoingTo,
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

// A hero only walks on tiles its owner has explored, so it explores from those that would show
// it some it hasn't.
function explorationTiles(where) {
  return emptyExploredTiles(where)
    .map((tile) => ({
      tile,
      reveals: unexploredTilesInSight(where.state, where.player, tile, HERO_SIGHT_RADIUS)
    }))
    .filter(({ reveals }) => reveals > 0)
}

// Squared, so that a long walk revealing much beats creeping a tile at a time.
function revealWorth({ reveals }) {
  return reveals ** 2
}

// The targets the hero can reach, each with its route and what the route costs, nearest first.
function reachableByCost(targets, routes) {
  const paths = routes.planRoutes(targets.map(({ tile }) => tile))
  return targets
    .map((target, index) => ({ target, tile: target.tile, path: paths[index] }))
    .filter(({ target, path }) => path !== null && reachesTarget(routes, target, path))
    .map((target) => ({ ...target, cost: routes.routeCost(target.path) }))
    .sort(byCostThenTile)
}

// A target's score is its worth over the days the route takes, the movement points it costs over
// the hero's day of them; the highest first, then the nearest.
function byWorthForDays(maxMovementPoints) {
  const scoreOf = (candidate) => candidate.worth / (Math.max(candidate.cost, 1) / maxMovementPoints)
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
  return withWalls(state, town.id, heroStrength({ ...hero, army }, definitions))
}

function garrisonStrength({ state, definitions }, town) {
  return withWalls(state, town.id, getArmyStrength(townGarrison(state, town.id), definitions))
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
  const { state, heroId, routes, ownTowns, dangerAt } = decision
  const free = ownTowns.filter((town) => [null, heroId].includes(heroIdAt(state, town.tile)))
  const danger = dangerAt(free.map(({ tile }) => tile))
  const threatened = free.filter(
    (town, index) =>
      danger[index] > 0 &&
      !outmatches(garrisonStrength(decision, town), danger[index]) &&
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

// Where a stronger enemy hero can reach it next turn, a target the hero gets to today is worth
// less what the hero risks there; one further off isn't a target, as the hero would flee its
// danger the next day before getting there. An exploration tile there isn't one either. A hero
// already in such reach goes to the best target out of it, else to the best as it is.
function goTo(decision, candidates, { worthOf, risk = null }) {
  const { routes, isThreatened } = decision
  const order = byWorthForDays(decision.maxMovementPoints)
  const reachable = reachableByCost(candidates, routes)
    .map((candidate) => ({ ...candidate, worth: worthOf(candidate.target) }))
    .sort(order)
  const danger = decision.dangerAt(reachable.map(standingTile))
  const weighed = reachable
    .flatMap((candidate, index) => {
      if (isSafeAt(decision, standingTile(candidate), danger[index])) {
        return [candidate]
      }
      const worth = candidate.worth - risk
      const isWorthTheRisk = risk !== null && !isThreatened && worth > 0
      return isWorthTheRisk && reachesToday(routes, candidate.path) ? [{ ...candidate, worth }] : []
    })
    .sort(order)
  return weighed[0] ?? (decision.isThreatened ? reachable[0] : undefined)
}

// A hero standing on another target is attacked as a hero, not as what it stands on, unless it
// defends a town.
function openTargets({ state, heroId, player, targets, definitions, treasury }) {
  return [
    ...targets.filter(
      (target) =>
        (target.kind === MOVEMENT_INTERACTION_KIND_TOWN_VISIT ||
          [null, heroId].includes(heroIdAt(state, target.tile))) &&
        isWorthGoingTo[target.kind](state, target, { player, heroId, definitions, treasury })
    ),
    ...enemyHeroTargets({ state, player, heroId, definitions })
  ]
}

function bestTarget(decision, targets) {
  const { state, player, map, routes, hero, definitions } = decision
  const { worthOf } = createTargetWorth(decision)
  const exploration = () => explorationTiles({ state, player, map, isEmpty: routes.isEmpty })
  return (
    goTo(decision, openTargets({ ...decision, targets }), {
      worthOf,
      risk: heroRisk(hero, definitions)
    }) ?? goTo(decision, exploration(), { worthOf: revealWorth })
  )
}

// `treasury` is what the hero's owner may spend on recruits and objects' prices.
export function decideComputerHeroMove({
  state,
  map,
  heroId,
  targets,
  routesOf,
  definitions,
  treasury
}) {
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
    treasury,
    routes: routesOf(heroId),
    maxMovementPoints: heroMovementPoints(state, heroId)?.max || 1,
    ownTowns: ownTownsOf(state, targets, player),
    dangerAt: createDangerMap({ state, player, heroId, routesOf, definitions })
  }

  const defence = defendTown(decision)
  if (defence) {
    return defence.stays ? null : defence
  }

  decision.isThreatened = !isSafeAt(decision, tile, decision.dangerAt([tile])[0])
  const [safeTile] = decision.isThreatened ? safeTilesToday(decision) : []
  const nearest = safeTile ?? bestTarget(decision, targets)
  if (!nearest || decision.routes.chargeStepsToday(nearest.path).length === 0) {
    return null
  }
  return movesTo(nearest)
}
