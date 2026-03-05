import { createMap as createMapDefault } from '../engine/map.js';
import { createOccupancyIndex as createOccupancyIndexDefault } from '../engine/occupancy.js';
import { createWorldState as createWorldStateDefault } from './domain/world-state.js';
import { createTownFootprintBlockers } from './town-footprint.js';

export function buildWorld(
  {
    scenario
  },
  {
    createMap = createMapDefault,
    createOccupancyIndex = createOccupancyIndexDefault,
    createWorldState = createWorldStateDefault
  } = {}
) {
  const map = createMap(scenario.terrain);
  const townFootprintBlockers = createTownFootprintBlockers({
    entities: scenario.entities,
    map
  });
  const occupancy = createOccupancyIndex([...scenario.entities, ...townFootprintBlockers]);
  const worldState = createWorldState({
    scenario,
    occupancy
  });

  return {
    map,
    occupancy,
    worldState
  };
}
