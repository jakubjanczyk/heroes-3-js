import {
  APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
  APP_FACT_BATTLE_ENDED,
  APP_FACT_BATTLE_STARTED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_WORLD_READY
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

// The battle the hero is fighting. Stacks cannot act yet: Auto combat wins it outright.
export const registerBattleModule = defineModule(
  ({ emit }) => {
    let battle = null

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: () => {
            battle = null
          }
        },
        {
          type: APP_FACT_BATTLE_STARTED,
          handler: (event) => {
            battle = event.detail
          }
        },
        {
          type: APP_FACT_BATTLE_ENDED,
          handler: () => {
            battle = null
          }
        },
        {
          type: APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
          handler: () => {
            if (!battle) {
              return
            }

            const { entityId, entityType, tile } = battle
            emit(APP_FACT_BATTLE_ENDED, { entityId, winner: 'attacker' })
            emit(APP_FACT_MONSTER_DEFEATED, { entityId, entityType, tile })
            emit(APP_FACT_ENTITY_REMOVED, { entityId })
          }
        }
      ]
    }
  },
  {
    id: 'battle',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_BATTLE_STARTED,
      APP_FACT_BATTLE_ENDED,
      APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED
    ],
    produces: [APP_FACT_BATTLE_ENDED, APP_FACT_MONSTER_DEFEATED, APP_FACT_ENTITY_REMOVED]
  }
)
