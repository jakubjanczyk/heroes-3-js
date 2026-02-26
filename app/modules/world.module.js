import { createMap as createMapDefault } from '../../engine/map.js';
import { createOccupancyIndex as createOccupancyIndexDefault } from '../../engine/occupancy.js';
import { loadGame as loadGameDefault } from '../../game/load.js';
import {
  APP_COMMAND_APP_START,
  APP_FACT_WORLD_LOAD_FAILED,
  APP_FACT_WORLD_READY
} from '../events.js';

export function registerWorldModule(
  { bus, env },
  {
    loadGame = loadGameDefault,
    createMap = createMapDefault,
    createOccupancyIndex = createOccupancyIndexDefault
  } = {}
) {
  let hasStarted = false;

  bus.addEventListener(APP_COMMAND_APP_START, () => {
    if (hasStarted) {
      return;
    }

    hasStarted = true;
    void (async () => {
      try {
        const { scenario, definitions } = await loadGame({ fetch: env.fetch });
        const map = createMap(scenario.terrain);
        const occupancy = createOccupancyIndex(scenario.entities);

        bus.emit(APP_FACT_WORLD_READY, {
          scenario,
          definitions,
          map,
          occupancy
        });
      } catch (error) {
        bus.emit(APP_FACT_WORLD_LOAD_FAILED, {
          error
        });
      }
    })();
  });
}
