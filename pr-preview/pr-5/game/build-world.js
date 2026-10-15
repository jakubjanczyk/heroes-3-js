import { createMap as createMapDefault } from '../engine/map.js';
import { createOccupancyIndex as createOccupancyIndexDefault } from '../engine/occupancy.js';
import { tileKey } from '../engine/tile-utils.js';
import { isHero } from './domain/entity-queries.js';
import { createMineFootprintBlockers } from './mine-footprint.js';
import { createTownFootprintBlockers } from './town-footprint.js';

// Builds the parts of the world that never change during play. Heroes are left out of
// the occupancy index on purpose: they move, so their positions are tracked from facts.
export function buildWorld(
  { scenario },
  {
    createMap = createMapDefault,
    createOccupancyIndex = createOccupancyIndexDefault
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
    ...scenario.entities.filter((entity) => !isHero(entity)),
    ...townFootprintBlockers,
    ...mineFootprintBlockers
  ]);

  return {
    map,
    staticOccupancy: {
      getAt: (tile) => occupancy.getAt(tile)
    }
  };
}
