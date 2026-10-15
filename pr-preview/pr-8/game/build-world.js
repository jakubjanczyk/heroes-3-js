import { createMap as createMapDefault } from '../engine/map.js';
import { createOccupancyIndex as createOccupancyIndexDefault } from '../engine/occupancy.js';
import { isHero } from './domain/entity-queries.js';
import { createFootprintBlockers } from './footprint-utils.js';

// Builds the parts of the world that never change during play. Heroes are left out of
// the occupancy index on purpose: they move, so their positions are tracked from facts.
export function buildWorld(
  { scenario, entityBehaviors },
  {
    createMap = createMapDefault,
    createOccupancyIndex = createOccupancyIndexDefault
  } = {}
) {
  const map = createMap(scenario.terrain);
  const footprintBlockers = createFootprintBlockers({
    entities: scenario.entities,
    map,
    getFootprintOffsets: entityBehaviors.getFootprintOffsets
  });
  const occupancy = createOccupancyIndex([
    ...scenario.entities.filter((entity) => !isHero(entity)),
    ...footprintBlockers
  ]);

  return {
    map,
    staticOccupancy: {
      getAt: (tile) => occupancy.getAt(tile)
    }
  };
}
