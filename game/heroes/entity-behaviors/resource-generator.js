import {
  INTERACTION_OUTCOME_KIND_RESOURCE_GENERATOR_VISITED,
  MOVEMENT_INTERACTION_KIND_RESOURCE_GENERATOR_VISIT
} from '../interaction-kinds.js'

// The entrance is the right of the object's two tiles.
const RESOURCE_GENERATOR_FOOTPRINT = Object.freeze([{ x: -1, y: 0 }])

export const resourceGeneratorBehavior = Object.freeze({
  kind: 'RESOURCE_GENERATOR',
  footprintOffsets: RESOURCE_GENERATOR_FOOTPRINT,
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_RESOURCE_GENERATOR_VISIT,
    outcomeKind: INTERACTION_OUTCOME_KIND_RESOURCE_GENERATOR_VISITED,
    requiresSteppingIntoTarget: true,
    resolveArrivalOutcome({ entity, tile }) {
      return {
        kind: INTERACTION_OUTCOME_KIND_RESOURCE_GENERATOR_VISITED,
        entityId: entity.id,
        entityType: entity.type,
        tile
      }
    }
  })
})
