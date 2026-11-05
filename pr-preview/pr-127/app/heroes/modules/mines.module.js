import { heroOwner } from '../../../game/state/queries.js'
import { APP_FACT_INTERACTION_REACHED, APP_FACT_MINE_CAPTURED } from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

// A hero arriving at a mine captures it for the hero's owner. The mines' income is paid with each
// new day as part of the game state.
export const registerMinesModule = defineModule(
  ({ emit, state }) => ({
    subscriptions: [
      {
        type: APP_FACT_INTERACTION_REACHED,
        handler: (event) => {
          const { entityId, heroId } = event.detail
          const current = state.get()
          const mine = current.mines[entityId]
          const owner = heroOwner(current, heroId)
          if (mine && owner && mine.owner !== owner) {
            emit(APP_FACT_MINE_CAPTURED, { entityId, entityType: mine.type, owner })
          }
        }
      }
    ]
  }),
  {
    id: 'mines',
    phase: 'domain',
    consumes: [APP_FACT_INTERACTION_REACHED],
    produces: [APP_FACT_MINE_CAPTURED]
  }
)
