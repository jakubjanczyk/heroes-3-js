import { isEntityKind } from '../../../game/domain/entity-queries.js'
import { treasureChestContents } from '../../../game/heroes/state/map-objects.js'
import { isChestRolled, rollChestContents } from '../../../game/heroes/treasure-chest.js'
import {
  APP_COMMAND_GAME_SETUP_REQUESTED,
  APP_FACT_TREASURE_CHESTS_ROLLED,
  APP_FACT_WORLD_READY
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerTreasureChestsModule = defineModule(
  ({ emit, config, state }) => {
    const random = typeof config?.random === 'function' ? config.random : Math.random
    let definitions = {}
    let chestIds = []

    function rollMissingContents() {
      const contents = Object.fromEntries(
        chestIds
          .map((chestId) => [chestId, treasureChestContents(state.get(), chestId)])
          .filter(([, chest]) => !isChestRolled(chest))
          .map(([chestId, chest]) => [chestId, rollChestContents(chest, definitions, random)])
      )
      if (Object.keys(contents).length > 0) {
        emit(APP_FACT_TREASURE_CHESTS_ROLLED, { contents })
      }
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions ?? {}
            chestIds = (event.detail.scenario?.entities ?? [])
              .filter((entity) => isEntityKind(entity, 'TREASURE_CHEST'))
              .map((chest) => chest.id)
          }
        },
        { type: APP_COMMAND_GAME_SETUP_REQUESTED, handler: rollMissingContents }
      ]
    }
  },
  {
    id: 'treasure-chests',
    phase: 'domain',
    consumes: [APP_FACT_WORLD_READY, APP_COMMAND_GAME_SETUP_REQUESTED],
    produces: [APP_FACT_TREASURE_CHESTS_ROLLED]
  }
)
