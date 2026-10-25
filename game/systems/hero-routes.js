import { indexGuardedTiles } from '../domain/movement/guards.js'
import { NO_REMOVED_ENTITIES } from '../domain/removed-entities.js'
import { getOccupantAt } from '../domain/tile-occupant.js'
import {
  heroIdAt,
  heroOwner,
  heroTile,
  isTileExplored,
  selectedHeroIdOf,
  viewingPlayer
} from '../state/queries.js'
import { createMovementSystem } from './movement-system.js'

// What the selected hero's routes depend on: where it stands, what is still on the map, where the
// other heroes stand and which tiles monsters guard, read from the game state.
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

  const occupancy = {
    getAt: (tile) => {
      const heroId = heroIdAt(getState(), tile)
      return heroId
        ? { id: heroId, kind: 'HERO', tile }
        : getOccupantAt({ tile, staticOccupancy, removedIds: currentRemovedIds() })
    }
  }

  // null once the hero is lost in battle.
  function getHero() {
    const heroId = selectedHeroId()
    return heroId && !currentRemovedIds().has(heroId)
      ? { id: heroId, tile: heroTile(getState(), heroId) }
      : null
  }

  return {
    occupancy,
    getHero,
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
        getStepCost: (from, to) => movementRules.stepCost({ map, from, to }),
        // A hero never walks through tiles its owner has not explored.
        isExplored: (tile) =>
          isTileExplored(getState(), heroOwner(getState(), selectedHeroId()), tile),
        ...options
      })
    }
  }
}
