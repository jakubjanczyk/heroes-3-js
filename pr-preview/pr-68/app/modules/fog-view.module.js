import { renderFogLayer, revealFogTiles } from '../../engine/layers/fog-layer.js'
import { isTileExplored, tilesExploredSince, viewingPlayer } from '../../game/state/queries.js'
import { APP_FACT_HERO_MOVED, APP_FACT_TOWN_CAPTURED, APP_FACT_WORLD_READY } from '../events.js'
import { defineModule } from './shared/module-runtime.js'

export const registerFogViewModule = defineModule(
  ({ env, state }) => {
    const fogLayer = env.document?.querySelector('.fog-layer')
    const createElement = env.document?.createElement?.bind(env.document)

    let covers = new Map()
    let shownState = null

    function revealExplored() {
      const current = state.get()
      revealFogTiles(covers, tilesExploredSince(shownState, current, viewingPlayer(current)))
      shownState = current
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            if (!fogLayer) {
              return
            }

            const current = state.get()
            const player = viewingPlayer(current)
            covers = renderFogLayer({
              container: fogLayer,
              map: event.detail.map,
              isExplored: (tile) => isTileExplored(current, player, tile),
              createElement
            })
            shownState = current
          }
        },
        { type: APP_FACT_HERO_MOVED, handler: revealExplored },
        { type: APP_FACT_TOWN_CAPTURED, handler: revealExplored }
      ]
    }
  },
  {
    id: 'fog-view',
    phase: 'view',
    consumes: [APP_FACT_WORLD_READY, APP_FACT_HERO_MOVED, APP_FACT_TOWN_CAPTURED],
    produces: []
  }
)
