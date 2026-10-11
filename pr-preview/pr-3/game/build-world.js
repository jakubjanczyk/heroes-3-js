import { createMap as createMapDefault } from '../engine/map.js';
import { createOccupancyIndex as createOccupancyIndexDefault } from '../engine/occupancy.js';
import { tileKey } from '../engine/tile-utils.js';
import { createWorldState as createWorldStateDefault } from './domain/world-state.js';
import { createMineFootprintBlockers } from './mine-footprint.js';
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
  const occupiedTiles = new Set(
    [...scenario.entities, ...townFootprintBlockers].map((entity) => tileKey(entity.tile))
  );
  const mineFootprintBlockers = createMineFootprintBlockers({
    entities: scenario.entities,
    map,
    occupiedTiles
  });
  const occupancy = createOccupancyIndex([
    ...scenario.entities,
    ...townFootprintBlockers,
    ...mineFootprintBlockers
  ]);
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
