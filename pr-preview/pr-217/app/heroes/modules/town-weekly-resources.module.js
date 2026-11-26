import { calendarDateOfTurn } from '../../../game/heroes/calendar.js'
import { townBuildingsCatalogue } from '../../../game/heroes/town-buildings.js'
import { rollWeeklyResourcesOfTown } from '../../../game/heroes/town-income.js'
import {
  APP_FACT_TOWN_RESOURCES_PRODUCED,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

// As a week starts, each owned town's buildings with weekly resources (the Mystic Pond) roll what
// they make for the town's owner.
export const registerTownWeeklyResourcesModule = defineModule(
  ({ emitAll, config, state }) => {
    const random = typeof config?.random === 'function' ? config.random : Math.random
    let definitions = {}
    // Facts replayed on load already include what the towns made then.
    let isRestoring = false

    function produce(turnNumber) {
      if (isRestoring || calendarDateOfTurn(turnNumber).day !== 1) {
        return
      }
      const towns = Object.entries(state.get().towns.byId).filter(([, town]) => town.owner)
      emitAll(
        towns.flatMap(([townId, town]) => {
          const resources = rollWeeklyResourcesOfTown({
            buildings: townBuildingsCatalogue(definitions, town.type).buildings,
            built: town.built,
            random
          })
          return resources
            ? [
                {
                  type: APP_FACT_TOWN_RESOURCES_PRODUCED,
                  detail: { entityId: townId, player: town.owner, resources }
                }
              ]
            : []
        })
      )
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions ?? {}
          }
        },
        { type: APP_FACT_TURN_ENDED, handler: ({ detail }) => produce(detail.turnNumber) },
        { type: APP_UI_RESTORE_STARTED, handler: () => (isRestoring = true) },
        { type: APP_UI_RESTORE_COMPLETED, handler: () => (isRestoring = false) }
      ]
    }
  },
  {
    id: 'town-weekly-resources',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_TURN_ENDED,
      APP_UI_RESTORE_STARTED,
      APP_UI_RESTORE_COMPLETED
    ],
    produces: [APP_FACT_TOWN_RESOURCES_PRODUCED]
  }
)
