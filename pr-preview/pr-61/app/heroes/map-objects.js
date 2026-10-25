import { sameTile } from '../../engine/tile-utils.js'
import { findHero } from '../../game/domain/entity-queries.js'
import { applyEntityRemoved, NO_REMOVED_ENTITIES } from '../../game/domain/removed-entities.js'
import { getOccupantAt } from '../../game/domain/tile-occupant.js'
import { FOOTPRINT_BLOCKER_KIND } from '../../game/footprint-utils.js'

// Keeps track of what stands on each map tile, for views that describe a tile: the hero,
// what is still on the map, how many creatures a monster or the hero's army has left, what a
// town's garrison holds, and every tile of a mine's or town's footprint.
export function createMapObjects() {
  let map = null
  let staticOccupancy = null
  let entitiesById = new Map()
  let removedIds = NO_REMOVED_ENTITIES
  let monsterCounts = new Map()
  let garrisons = new Map()
  let hero = null
  let heroTile = null

  function withGarrison(entity) {
    return garrisons.has(entity?.id) ? { ...entity, garrison: garrisons.get(entity.id) } : entity
  }

  return {
    onWorldReady(world) {
      map = world.map
      staticOccupancy = world.staticOccupancy
      entitiesById = new Map(world.scenario.entities.map((entity) => [entity.id, entity]))
      removedIds = NO_REMOVED_ENTITIES
      monsterCounts = new Map()
      garrisons = new Map()
      hero = findHero(world.scenario.entities)
      heroTile = hero.tile
    },
    onHeroMoved(tile) {
      heroTile = tile
    },
    onEntityRemoved(entityId) {
      removedIds = applyEntityRemoved(removedIds, entityId)
    },
    onHeroArmyChanged(army) {
      hero = { ...hero, army }
    },
    onMonsterCountChanged(entityId, count) {
      monsterCounts = new Map([...monsterCounts, [entityId, count]])
    },
    onTownGarrisonChanged(entityId, garrison) {
      garrisons = new Map([...garrisons, [entityId, garrison]])
    },
    getEntityAt(tile) {
      if (hero && !removedIds.has(hero.id) && sameTile(tile, heroTile)) {
        return hero
      }

      const occupant = getOccupantAt({ tile, staticOccupancy, removedIds })
      if (monsterCounts.has(occupant?.id)) {
        return { ...occupant, count: monsterCounts.get(occupant.id) }
      }

      if (occupant?.kind !== FOOTPRINT_BLOCKER_KIND) {
        return withGarrison(occupant)
      }

      return removedIds.has(occupant.ownerId)
        ? null
        : withGarrison(entitiesById.get(occupant.ownerId))
    },
    getTerrainName(tile) {
      return map.getTerrainType(tile).name
    }
  }
}
