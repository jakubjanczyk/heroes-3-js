import { findHero } from '../domain/entity-queries.js'
import { indexGuardedTiles } from '../domain/movement/guards.js'
import { applyEntityRemoved, NO_REMOVED_ENTITIES } from '../domain/removed-entities.js'
import { getOccupantAt } from '../domain/tile-occupant.js'
import { createMovementSystem } from './movement-system.js'

// What the hero's routes depend on: where it stands, what is still on the map and which tiles
// monsters guard. Kept up to date from facts, so the module moving the hero and a view that only
// plans routes, such as the cursor, each keep their own copy.
export function createHeroRoutes({ entityBehaviors, movementRules }) {
  let map = null
  let staticOccupancy = null
  let heroId = null
  let heroTile = null
  let removedIds = NO_REMOVED_ENTITIES
  let guards = []
  let guardedTiles = indexGuardedTiles([], map)

  const occupancy = {
    getAt: (tile) => getOccupantAt({ tile, staticOccupancy, removedIds })
  }

  function indexGuards() {
    guardedTiles = indexGuardedTiles(
      guards.filter((guard) => !removedIds.has(guard.id)),
      map
    )
  }

  // null once the hero is lost in battle.
  function getHero() {
    return heroId && !removedIds.has(heroId) ? { id: heroId, tile: heroTile } : null
  }

  return {
    occupancy,
    getHero,
    onWorldReady(world) {
      map = world.map
      staticOccupancy = world.staticOccupancy
      const hero = findHero(world.scenario.entities)
      heroId = hero?.id ?? null
      heroTile = hero?.tile ?? null
      removedIds = NO_REMOVED_ENTITIES
      guards = world.scenario.entities.filter(entityBehaviors.guardsSurroundings)
      indexGuards()
    },
    onHeroMoved({ heroId: movedHeroId, to }) {
      if (movedHeroId === heroId && to) {
        heroTile = to
      }
    },
    onEntityRemoved(entityId) {
      removedIds = applyEntityRemoved(removedIds, entityId)
      indexGuards()
    },
    // A movement system over the current world; `options` adds what moving the hero needs.
    createMovementSystem(options = {}) {
      return createMovementSystem({
        getHero,
        map,
        occupancy,
        entityBehaviors,
        getGuardsAt: (tile) => guardedTiles.getGuardsAt(tile),
        getStepCost: (from, to) => movementRules.stepCost({ map, from, to }),
        ...options
      })
    }
  }
}
