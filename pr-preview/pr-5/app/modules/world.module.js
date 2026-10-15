import { deepFreeze } from '../../engine/deep-freeze.js';
import { buildWorld as buildWorldDefault } from '../../game/build-world.js';
import { loadGame as loadGameDefault } from '../../game/load.js';
import {
  APP_COMMAND_APP_START,
  APP_FACT_WORLD_LOAD_FAILED,
  APP_FACT_WORLD_READY
} from '../events.js';
import { defineModule } from './shared/module-runtime.js';

// Loads the scenario and publishes it as a frozen snapshot of everything that never changes.
// It holds no live state: hero positions and removed entities come from facts.
export const registerWorldModule = defineModule((
  { emit, env },
  {
    loadGame = loadGameDefault,
    buildWorld = buildWorldDefault
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

              const { map, staticOccupancy } = buildWorld({ scenario });

              emit(APP_FACT_WORLD_READY, deepFreeze({
                scenario,
                definitions,
                map,
                staticOccupancy
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
