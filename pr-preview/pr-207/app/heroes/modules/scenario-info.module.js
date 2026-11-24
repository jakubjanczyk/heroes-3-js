import { scenarioInfo } from '../../../game/heroes/scenario-info.js'
import {
  APP_COMMAND_SCENARIO_INFO_OPEN_REQUESTED,
  APP_FACT_WORLD_READY,
  APP_UI_SCENARIO_INFO_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerScenarioInfoModule = defineModule(
  ({ emit, state }) => {
    let scenario = null
    let definitions = {}

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            scenario = event.detail.scenario ?? null
            definitions = event.detail.definitions ?? {}
          }
        },
        {
          type: APP_COMMAND_SCENARIO_INFO_OPEN_REQUESTED,
          handler: () =>
            emit(
              APP_UI_SCENARIO_INFO_UPDATED,
              scenarioInfo({ state: state.get(), scenario, definitions })
            )
        }
      ]
    }
  },
  {
    id: 'scenario-info',
    phase: 'domain',
    consumes: [APP_FACT_WORLD_READY, APP_COMMAND_SCENARIO_INFO_OPEN_REQUESTED],
    produces: [APP_UI_SCENARIO_INFO_UPDATED]
  }
)
