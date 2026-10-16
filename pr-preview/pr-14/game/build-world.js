import { createMap as createMapDefault } from '../engine/map.js'
import { createOccupancyIndex as createOccupancyIndexDefault } from '../engine/occupancy.js'
import { isHero } from './domain/entity-queries.js'
import { createFootprintBlockers } from './footprint-utils.js'

function assertFootprintsOnPassableTerrain({ footprintBlockers, entities, map }) {
  for (const blocker of footprintBlockers) {
    if (map.isPassable(blocker.tile)) {
      continue
    }

    const owner = entities.find((entity) => entity.id === blocker.ownerId)
    throw new Error(
      `Footprint of ${owner.id} (${owner.kind}) must be on passable terrain: (${blocker.tile.x}, ${blocker.tile.y})`
    )
  }
}

// Builds the parts of the world that never change during play. Heroes are left out of
// the occupancy index on purpose: they move, so their positions are tracked from facts.
export function buildWorld(
  { scenario, entityBehaviors, terrainTypes },
  { createMap = createMapDefault, createOccupancyIndex = createOccupancyIndexDefault } = {}
) {
  const map = createMap(scenario.terrain, terrainTypes)
  const footprintBlockers = createFootprintBlockers({
    entities: scenario.entities,
    map,
    getFootprintOffsets: entityBehaviors.getFootprintOffsets
  })
  assertFootprintsOnPassableTerrain({ footprintBlockers, entities: scenario.entities, map })
  const occupancy = createOccupancyIndex([
    ...scenario.entities.filter((entity) => !isHero(entity)),
    ...footprintBlockers
  ])

  return {
    map,
    staticOccupancy: {
      getAt: (tile) => occupancy.getAt(tile)
    }
  }
}
