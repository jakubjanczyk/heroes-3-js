import { deepFreeze } from '../../engine/deep-freeze.js';
import { createMap as createMapDefault } from '../../engine/map.js';
import { loadGame as loadGameDefault } from '../../game/load.js';
import {
  APP_COMMAND_APP_START,
  APP_FACT_WORLD_LOAD_FAILED,
  APP_FACT_WORLD_READY
} from '../events.js';
import { defineModule } from './shared/module-runtime.js';

// Loads the scenario and publishes it as a frozen snapshot. It holds no live world state:
// modules that track entities build their own replica from this snapshot and world facts.
export const registerWorldModule = defineModule((
  { emit, env },
  {
    loadGame = loadGameDefault,
    createMap = createMapDefault
  } = {}
) => {
  let hasStarted = false;

  return {
    subscriptions: [
      {
        type: APP_COMMAND_APP_START,
        handler: () => {
          if (hasStarted) {
            return;
          }

          hasStarted = true;
          void (async () => {
            try {
              const { scenario, definitions } = await loadGame({ fetch: env.fetch });

              emit(APP_FACT_WORLD_READY, deepFreeze({
                scenario,
                definitions,
                map: createMap(scenario.terrain)
              }));
            } catch (error) {
              emit(APP_FACT_WORLD_LOAD_FAILED, {
                error
              });
            }
          })();
        }
      }
    ]
  };
}, {
  id: 'world',
  phase: 'domain',
  consumes: [APP_COMMAND_APP_START],
  produces: [
    APP_FACT_WORLD_READY,
    APP_FACT_WORLD_LOAD_FAILED
  ]
});
