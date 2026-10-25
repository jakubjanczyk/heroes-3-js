import { getStatusBarText } from '../../../game/heroes/status-bar-text.js'
import {
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MONSTER_COUNT_CHANGED,
  APP_FACT_WORLD_READY,
  APP_UI_TILE_HOVERED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createMapObjects } from '../map-objects.js'

const INFO_BOX_HOVER_TEXT = 'Status Window'

// The Heroes 3 status bar under the map: names whatever the mouse is over.
export const registerStatusBarModule = defineModule(
  ({ env }) => {
    const statusBar = env.document.getElementById('status-bar')
    const infoBox = env.document.getElementById('hero-info')
    const mapObjects = createMapObjects()

    let definitions = {}

    function showText(text) {
      statusBar.textContent = text
    }

    return {
      // The info box has one text for all it shows.
      domSubscriptions: [
        { target: infoBox, type: 'mouseenter', handler: () => showText(INFO_BOX_HOVER_TEXT) },
        { target: infoBox, type: 'mouseleave', handler: () => showText('') }
      ],
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
          type: APP_FACT_MONSTER_COUNT_CHANGED,
          handler: (event) => {
            mapObjects.onMonsterCountChanged(event.detail.entityId, event.detail.count)
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
              getStatusBarText({
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
    id: 'status-bar',
    phase: 'view',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_MOVED,
      APP_FACT_ENTITY_REMOVED,
      APP_FACT_MONSTER_COUNT_CHANGED,
      APP_UI_TILE_HOVERED
    ],
    produces: []
  }
)
