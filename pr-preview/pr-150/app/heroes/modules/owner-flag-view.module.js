import { dwellingIdsOf, mineIdsOf } from '../../../game/heroes/state/map-objects.js'
import { townIdsOf } from '../../../game/heroes/state/towns.js'
import { heroIdsOf, playerColors } from '../../../game/state/queries.js'
import {
  APP_FACT_DWELLING_FLAGGED,
  APP_FACT_HERO_HIRED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MINE_CAPTURED,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_WORLD_READY
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createPlayerFlag, paintPlayerFlag } from '../presentation/player-flag.js'

export const registerOwnerFlagViewModule = defineModule(
  ({ env, state }) => {
    const entityLayer = env.document?.querySelector('.entity-layer')

    function showFlagOn(entityId, player) {
      const entityEl = entityLayer?.querySelector(`[data-entity-id="${entityId}"]`)
      if (!entityEl) {
        return
      }

      const flag = entityEl.querySelector('.owner-flag')
      if (flag) {
        paintPlayerFlag(flag, player)
      } else {
        entityEl.appendChild(createPlayerFlag(env.document, player))
      }
    }

    // The map draws its objects again when a hero comes onto it, so every flag is put back each time.
    function showAllFlags() {
      const current = state.get()
      for (const player of playerColors(current)) {
        const ownedIds = [
          ...heroIdsOf(current, player),
          ...townIdsOf(current, player),
          ...mineIdsOf(current, player),
          ...dwellingIdsOf(current, player)
        ]
        for (const entityId of ownedIds) {
          showFlagOn(entityId, player)
        }
      }
    }

    return {
      subscriptions: [
        { type: APP_FACT_WORLD_READY, handler: showAllFlags },
        { type: APP_FACT_HERO_HIRED, handler: showAllFlags },
        { type: APP_FACT_HERO_MOVED, handler: showAllFlags },
        { type: APP_FACT_DWELLING_FLAGGED, handler: showAllFlags },
        { type: APP_FACT_MINE_CAPTURED, handler: showAllFlags },
        { type: APP_FACT_TOWN_CAPTURED, handler: showAllFlags }
      ]
    }
  },
  {
    id: 'owner-flag-view',
    phase: 'view',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_HIRED,
      APP_FACT_HERO_MOVED,
      APP_FACT_MINE_CAPTURED,
      APP_FACT_DWELLING_FLAGGED,
      APP_FACT_TOWN_CAPTURED
    ],
    produces: []
  }
)
