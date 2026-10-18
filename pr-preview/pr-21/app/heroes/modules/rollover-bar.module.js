import { getRolloverText } from '../../../game/heroes/rollover-text.js'
import {
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_MOVED,
  APP_FACT_WORLD_READY,
  APP_UI_TILE_HOVERED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createMapObjects } from '../map-objects.js'

// The Heroes 3 rollover bar under the map: names whatever the mouse is over.
export const registerRolloverBarModule = defineModule(
  ({ env }) => {
    const rolloverBar = env.document.getElementById('rollover-bar')
    const mapObjects = createMapObjects()

    let definitions = {}

    function showText(text) {
      rolloverBar.textContent = text
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            mapObjects.onWorldReady(event.detail)
            definitions = event.detail.definitions
          }
        },
        {
          type: APP_FACT_HERO_MOVED,
          handler: (event) => {
            mapObjects.onHeroMoved(event.detail.to)
          }
        },
        {
          type: APP_FACT_ENTITY_REMOVED,
          handler: (event) => {
            mapObjects.onEntityRemoved(event.detail.entityId)
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
                entity: mapObjects.getEntityAt(tile),
                terrainName: mapObjects.getTerrainName(tile),
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
