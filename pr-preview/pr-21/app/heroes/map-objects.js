import { sameTile } from '../../engine/tile-utils.js'
import { findHero } from '../../game/domain/entity-queries.js'
import { applyEntityRemoved, NO_REMOVED_ENTITIES } from '../../game/domain/removed-entities.js'
import { getOccupantAt } from '../../game/domain/tile-occupant.js'
import { FOOTPRINT_BLOCKER_KIND } from '../../game/footprint-utils.js'

// Keeps track of what stands on each map tile, for views that describe a tile: the hero,
// what is still on the map, and every tile of a mine's or town's footprint.
export function createMapObjects() {
  let map = null
  let staticOccupancy = null
  let entitiesById = new Map()
  let removedIds = NO_REMOVED_ENTITIES
  let hero = null
  let heroTile = null

  return {
    onWorldReady(world) {
      map = world.map
      staticOccupancy = world.staticOccupancy
      entitiesById = new Map(world.scenario.entities.map((entity) => [entity.id, entity]))
      removedIds = NO_REMOVED_ENTITIES
      hero = findHero(world.scenario.entities)
      heroTile = hero.tile
    },
    onHeroMoved(tile) {
      heroTile = tile
    },
    onEntityRemoved(entityId) {
      removedIds = applyEntityRemoved(removedIds, entityId)
    },
    getEntityAt(tile) {
      if (sameTile(tile, heroTile)) {
        return hero
      }

      const occupant = getOccupantAt({ tile, staticOccupancy, removedIds })
      if (occupant?.kind !== FOOTPRINT_BLOCKER_KIND) {
        return occupant
      }

      return removedIds.has(occupant.ownerId) ? null : entitiesById.get(occupant.ownerId)
    },
    getTerrainName(tile) {
      return map.getTerrainType(tile).name
    }
  }
}
