import { sameTile } from '../../../engine/tile-utils.js'
import { findHero } from '../../../game/domain/entity-queries.js'
import { applyEntityRemoved, NO_REMOVED_ENTITIES } from '../../../game/domain/removed-entities.js'
import { getOccupantAt } from '../../../game/domain/tile-occupant.js'
import { FOOTPRINT_BLOCKER_KIND } from '../../../game/footprint-utils.js'
import { getRolloverText } from '../../../game/heroes/rollover-text.js'
import {
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_MOVED,
  APP_FACT_WORLD_READY,
  APP_UI_TILE_HOVERED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

// The Heroes 3 rollover bar under the map: names whatever the mouse is over.
export const registerRolloverBarModule = defineModule(
  ({ env }) => {
    const rolloverBar = env.document.getElementById('rollover-bar')

    let map = null
    let staticOccupancy = null
    let definitions = {}
    let entitiesById = new Map()
    let removedIds = NO_REMOVED_ENTITIES
    let hero = null
    let heroTile = null

    function getEntityAt(tile) {
      if (sameTile(tile, heroTile)) {
        return hero
      }

      const occupant = getOccupantAt({ tile, staticOccupancy, removedIds })
      if (occupant?.kind !== FOOTPRINT_BLOCKER_KIND) {
        return occupant
      }

      return removedIds.has(occupant.ownerId) ? null : entitiesById.get(occupant.ownerId)
    }

    function showText(text) {
      rolloverBar.textContent = text
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const { scenario } = event.detail
            map = event.detail.map
            staticOccupancy = event.detail.staticOccupancy
            definitions = event.detail.definitions
            entitiesById = new Map(scenario.entities.map((entity) => [entity.id, entity]))
            removedIds = NO_REMOVED_ENTITIES
            hero = findHero(scenario.entities)
            heroTile = hero.tile
          }
        },
        {
          type: APP_FACT_HERO_MOVED,
          handler: (event) => {
            heroTile = event.detail.to
          }
        },
        {
          type: APP_FACT_ENTITY_REMOVED,
          handler: (event) => {
            removedIds = applyEntityRemoved(removedIds, event.detail.entityId)
          }
        },
        {
          type: APP_UI_TILE_HOVERED,
          handler: (event) => {
            const { tile } = event.detail
            if (!tile) {
              showText('')
              return
            }

            showText(
              getRolloverText({
                entity: getEntityAt(tile),
                terrainName: map.getTerrainType(tile).name,
                definitions
              })
            )
          }
        }
      ]
    }
  },
  {
    id: 'rollover-bar',
    phase: 'view',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_MOVED,
      APP_FACT_ENTITY_REMOVED,
      APP_UI_TILE_HOVERED
    ],
    produces: []
  }
)
