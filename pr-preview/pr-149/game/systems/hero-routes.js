import { indexGuardedTiles } from '../domain/movement/guards.js'
import { countTravelDays } from '../domain/movement/travel-days.js'
import { NO_REMOVED_ENTITIES } from '../domain/removed-entities.js'
import { getOccupantAt } from '../domain/tile-occupant.js'
import {
  heroIdAt,
  heroMovementPoints,
  heroOwner,
  heroTile,
  isTileExplored,
  selectedHeroIdOf,
  viewingPlayer
} from '../state/queries.js'
import { createMovementSystem } from './movement-system.js'

// What the selected hero's routes depend on: where it stands, what is still on the map, where the
// other heroes stand, which tiles monsters guard, and how far and how the hero moves today, read
// from the game state.
export function createHeroRoutes({ entityBehaviors, movementRules, getState }) {
  let map = null
  let staticOccupancy = null
  let guards = []
  let indexedRemovedIds = null
  let removedIds = NO_REMOVED_ENTITIES
  let guardedTiles = indexGuardedTiles([], map)

  function currentRemovedIds() {
    const ids = getState().mapObjects.removedEntityIds
    if (ids !== indexedRemovedIds) {
      indexedRemovedIds = ids
      removedIds = new Set(ids)
      guardedTiles = indexGuardedTiles(
        guards.filter((guard) => !removedIds.has(guard.id)),
        map
      )
    }

    return removedIds
  }

  function selectedHeroId() {
    return selectedHeroIdOf(getState(), viewingPlayer(getState()))
  }

  function objectAt(tile) {
    return getOccupantAt({ tile, staticOccupancy, removedIds: currentRemovedIds() })
  }

  const occupancy = {
    getAt: (tile) => {
      const heroId = heroIdAt(getState(), tile)
      return heroId ? { id: heroId, kind: 'HERO', tile } : objectAt(tile)
    },
    // What stands on `tile` whether or not a hero stands there too.
    getObjectAt: objectAt
  }

  // null once the hero is lost in battle.
  function getHero() {
    const heroId = selectedHeroId()
    return heroId && !currentRemovedIds().has(heroId)
      ? { id: heroId, tile: heroTile(getState(), heroId) }
      : null
  }

  function canLand(tile) {
    const occupant = occupancy.getAt(tile)
    return map.isPassable(tile) && (occupant === null || occupant.id === selectedHeroId())
  }

  function flight() {
    const heroId = selectedHeroId()
    return heroId ? movementRules.flightOf(getState(), heroId) : null
  }

  function movementPoints() {
    return heroMovementPoints(getState(), selectedHeroId())
  }

  function getFlightPoints() {
    return flight() ? (movementPoints()?.value ?? 0) : null
  }

  // A flight lasts the day: steps the hero can't pay today are walked.
  function getStepCost(from, to, routeCost) {
    const flightToday = flight()
    if (flightToday) {
      const flyingCost = movementRules.stepCost({ map, from, to, flight: flightToday, canLand })
      if (routeCost + flyingCost <= getFlightPoints()) {
        return flyingCost
      }
    }
    return movementRules.stepCost({ map, from, to, flight: null, canLand })
  }

  // What each step of `path` the selected hero can still take today costs.
  function chargeSteps(path, remainingMovementPoints, { flies = true } = {}) {
    return movementRules.chargeSteps({
      map,
      path,
      remainingMovementPoints,
      flight: flies ? flight() : null,
      canLand
    })
  }

  function chargeStepsToday(path) {
    return chargeSteps(path, movementPoints()?.value ?? Number.POSITIVE_INFINITY)
  }

  // On which day the selected hero gets to the end of `path` (see `countTravelDays`); a hero
  // whose movement points the state doesn't hold has `fallbackMovementPoints` a day.
  function travelDays(path, fallbackMovementPoints) {
    const points = movementPoints()
    return countTravelDays({
      path,
      chargeSteps: ({ path: pathLeft, remainingMovementPoints, day }) =>
        chargeSteps(pathLeft, remainingMovementPoints, { flies: day === 1 }),
      remainingMovementPoints: points?.value ?? fallbackMovementPoints,
      maxMovementPoints: points?.max ?? fallbackMovementPoints
    })
  }

  function arrivalContext() {
    return { state: getState(), heroId: selectedHeroId() }
  }

  return {
    occupancy,
    getHero,
    arrivalContext,
    chargeStepsToday,
    travelDays,
    onWorldReady(world) {
      map = world.map
      staticOccupancy = world.staticOccupancy
      guards = world.scenario.entities.filter(entityBehaviors.guardsSurroundings)
      indexedRemovedIds = null
    },
    // A movement system over the current world; `options` adds what moving the hero needs.
    createMovementSystem(options = {}) {
      return createMovementSystem({
        getHero,
        map,
        occupancy,
        entityBehaviors,
        getGuardsAt: (tile) => {
          currentRemovedIds()
          return guardedTiles.getGuardsAt(tile)
        },
        getStepCost,
        getStepCharges: chargeStepsToday,
        getFlightPoints,
        getArrivalContext: arrivalContext,
        // A hero never walks through tiles its owner has not explored.
        isExplored: (tile) =>
          isTileExplored(getState(), heroOwner(getState(), selectedHeroId()), tile),
        ...options
      })
    }
  }
}
