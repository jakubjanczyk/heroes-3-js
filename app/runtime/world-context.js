import { createBus } from '../../engine/bus.js';
import { createMap } from '../../engine/map.js';
import { createOccupancyIndex as createOccupancyIndexDefault } from '../../engine/occupancy.js';
import { loadGame } from '../../game/load.js';

export async function createWorldContext({
  fetch,
  loadGame: loadGameImpl = loadGame,
  createMap: createMapImpl = createMap,
  createOccupancyIndex = createOccupancyIndexDefault,
  bus = null,
  createBus: createBusImpl = createBus,
  busDebug = false,
  busLogger = null
}) {
  const { scenario, definitions } = await loadGameImpl({ fetch });
  const map = createMapImpl(scenario.terrain);
  const occupancy = createOccupancyIndex(scenario.entities);
  const appBus = bus ?? createBusImpl({ debug: busDebug, log: busLogger });

  return {
    scenario,
    definitions,
    map,
    occupancy,
    bus: appBus,
    world: {
      scenario,
      definitions,
      map,
      occupancy,
      bus: appBus
    }
  };
}
