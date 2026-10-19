import { APP_FACT_MINE_CAPTURED } from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerMineFlagViewModule = defineModule(
  ({ env }) => {
    const entityLayer = env.document?.querySelector('.entity-layer')

    return {
      subscriptions: [
        {
          type: APP_FACT_MINE_CAPTURED,
          handler: (event) => {
            const mineEl = entityLayer?.querySelector(`[data-entity-id="${event.detail.entityId}"]`)
            if (!mineEl || mineEl.querySelector('.mine-flag')) {
              return
            }

            const flag = env.document.createElement('div')
            flag.className = 'mine-flag'
            flag.setAttribute('role', 'img')
            flag.setAttribute('aria-label', 'Red player flag')
            mineEl.appendChild(flag)
          }
        }
      ]
    }
  },
  {
    id: 'mine-flag-view',
    phase: 'view',
    consumes: [APP_FACT_MINE_CAPTURED],
    produces: []
  }
)
