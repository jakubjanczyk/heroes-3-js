import { sameTile } from '../../engine/tile-utils.js'
import { getOccupantAt } from '../../game/domain/tile-occupant.js'
import { FOOTPRINT_BLOCKER_KIND } from '../../game/footprint-utils.js'
import { heroById } from '../../game/heroes/state/hero-details.js'
import { monsterCount } from '../../game/heroes/state/map-objects.js'
import { townGarrison } from '../../game/heroes/state/towns.js'

// What stands on each map tile, for views that describe a tile: a hero, what is still on the map,
// how many creatures a monster has left, what a town's garrison holds, and every tile of a mine's
// or town's footprint.
export function createMapObjects(gameState) {
  let map = null
  let staticOccupancy = null
  let entitiesById = new Map()

  function heroAt(state, tile) {
    const heroId = Object.keys(state.heroes).find(
      (id) => !state.heroes[id].removed && sameTile(tile, state.heroes[id].tile)
    )
    return heroId ? { ...entitiesById.get(heroId), ...heroById(state, heroId) } : null
  }

  function withState(state, entity) {
    if (!entity) {
      return entity
    }

    const count = monsterCount(state, entity.id)
    if (count !== null) {
      return { ...entity, count }
    }

    return state.towns.byId[entity.id]
      ? { ...entity, garrison: townGarrison(state, entity.id) }
      : entity
  }

  return {
    onWorldReady(world) {
      map = world.map
      staticOccupancy = world.staticOccupancy
      entitiesById = new Map(world.scenario.entities.map((entity) => [entity.id, entity]))
    },
    getEntityAt(tile) {
      const state = gameState.get()
      const hero = heroAt(state, tile)
      if (hero) {
        return hero
      }

      const removedIds = new Set(state.mapObjects.removedEntityIds)
      const occupant = getOccupantAt({ tile, staticOccupancy, removedIds })
      if (occupant?.kind !== FOOTPRINT_BLOCKER_KIND) {
        return withState(state, occupant)
      }

      return removedIds.has(occupant.ownerId)
        ? null
        : withState(state, entitiesById.get(occupant.ownerId))
    },
    getTerrainName(tile) {
      return map.getTerrainType(tile).name
    }
  }
}
