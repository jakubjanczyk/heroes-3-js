import { heroOwner } from '../../../game/state/queries.js'
import { APP_FACT_DWELLING_FLAGGED, APP_FACT_INTERACTION_REACHED } from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerDwellingsModule = defineModule(
  ({ emit, state }) => ({
    subscriptions: [
      {
        type: APP_FACT_INTERACTION_REACHED,
        handler: (event) => {
          const { entityId, heroId } = event.detail
          const current = state.get()
          const dwelling = current.dwellings[entityId]
          const owner = heroOwner(current, heroId)
          if (dwelling && owner && dwelling.owner !== owner) {
            emit(APP_FACT_DWELLING_FLAGGED, { entityId, entityType: dwelling.type, owner })
          }
        }
      }
    ]
  }),
  {
    id: 'dwellings',
    phase: 'domain',
    consumes: [APP_FACT_INTERACTION_REACHED],
    produces: [APP_FACT_DWELLING_FLAGGED]
  }
)
