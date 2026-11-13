import { deepFreeze } from '../../engine/deep-freeze.js'
import { buildWorld } from '../../game/build-world.js'
import { createEntityBehaviors } from '../../game/domain/entity-behaviors.js'
import { loadGame } from '../../game/load.js'
import {
  APP_COMMAND_APP_START,
  APP_FACT_WORLD_LOAD_FAILED,
  APP_FACT_WORLD_READY
} from '../events.js'
import { defineModule } from './shared/module-runtime.js'

export const registerWorldModule = defineModule(
  ({ emit, env, config }) => {
    const entityBehaviors = createEntityBehaviors(config?.content?.entityBehaviors)
    const terrainTypes = config?.content?.terrainTypes
    const roadTypes = config?.content?.roadTypes
    const primarySkills = config?.content?.primarySkills
    let hasStarted = false

    return {
      subscriptions: [
        {
          type: APP_COMMAND_APP_START,
          handler: () => {
            if (hasStarted) {
              return
            }

            hasStarted = true
            void (async () => {
              try {
                const { scenario, definitions } = await loadGame({
                  fetch: env.fetch,
                  terrainTypes,
                  primarySkills
                })

                const { map, staticOccupancy } = buildWorld({
                  scenario,
                  definitions,
                  entityBehaviors,
                  terrainTypes,
                  roadTypes
                })

                emit(
                  APP_FACT_WORLD_READY,
                  deepFreeze({
                    scenario,
                    definitions,
                    map,
                    staticOccupancy
                  })
                )
              } catch (error) {
                emit(APP_FACT_WORLD_LOAD_FAILED, {
                  error
                })
              }
            })()
          }
        }
      ]
    }
  },
  {
    id: 'world',
    phase: 'domain',
    consumes: [APP_COMMAND_APP_START],
    produces: [APP_FACT_WORLD_READY, APP_FACT_WORLD_LOAD_FAILED]
  }
)
