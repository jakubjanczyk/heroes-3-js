import {
  INTERACTION_OUTCOME_KIND_RESOURCE_GENERATOR_VISITED,
  MOVEMENT_INTERACTION_KIND_RESOURCE_GENERATOR_VISIT
} from '../interaction-kinds.js'
import { visitableFootprint } from '../visitable-objects/definitions.js'

export const resourceGeneratorBehavior = Object.freeze({
  kind: 'RESOURCE_GENERATOR',
  footprintOffsets: (entity, definitions) => visitableFootprint(definitions, entity),
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
