import { bonusObjectVisitedText } from '../../../game/heroes/bonus-objects.js'
import { getStatusBarText } from '../../../game/heroes/status-bar-text.js'
import { isTileExplored, viewingPlayer } from '../../../game/state/queries.js'
import { APP_FACT_WORLD_READY, APP_UI_TILE_HOVERED } from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createMapObjects } from '../map-objects.js'

// The Heroes 3 status bar under the map: names whatever the mouse is over.
export const registerStatusBarModule = defineModule(
  ({ env, state }) => {
    const statusBar = env.document.getElementById('status-bar')
    const mapObjects = createMapObjects(state)

    let definitions = {}

    function showText(text) {
      statusBar.textContent = text
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
          type: APP_UI_TILE_HOVERED,
          handler: (event) => {
            const { tile } = event.detail
            if (!tile || !isTileExplored(state.get(), viewingPlayer(state.get()), tile)) {
              showText('')
              return
            }

            const entity = mapObjects.getEntityAt(tile)
            showText(
              getStatusBarText({
                entity,
                terrainName: mapObjects.getTerrainName(tile),
                definitions,
                visitedText: bonusObjectVisitedText(state.get(), entity, definitions)
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
    consumes: [APP_FACT_WORLD_READY, APP_UI_TILE_HOVERED],
    produces: []
  }
)
