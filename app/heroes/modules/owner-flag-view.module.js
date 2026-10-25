import { viewingPlayersTownIds } from '../../../game/heroes/state/towns.js'
import {
  APP_FACT_MINE_CAPTURED,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_WORLD_READY
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerOwnerFlagViewModule = defineModule(
  ({ env, state }) => {
    const entityLayer = env.document?.querySelector('.entity-layer')

    function showFlagOn(entityId) {
      const entityEl = entityLayer?.querySelector(`[data-entity-id="${entityId}"]`)
      if (!entityEl || entityEl.querySelector('.owner-flag')) {
        return
      }

      const flag = env.document.createElement('div')
      flag.className = 'owner-flag'
      flag.setAttribute('role', 'img')
      flag.setAttribute('aria-label', 'Red player flag')
      entityEl.appendChild(flag)
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: () => viewingPlayersTownIds(state.get()).forEach(showFlagOn)
        },
        { type: APP_FACT_MINE_CAPTURED, handler: (event) => showFlagOn(event.detail.entityId) },
        { type: APP_FACT_TOWN_CAPTURED, handler: (event) => showFlagOn(event.detail.entityId) }
      ]
    }
  },
  {
    id: 'owner-flag-view',
    phase: 'view',
    consumes: [APP_FACT_WORLD_READY, APP_FACT_MINE_CAPTURED, APP_FACT_TOWN_CAPTURED],
    produces: []
  }
)
