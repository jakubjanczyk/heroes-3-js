import {
  INTERACTION_OUTCOME_KIND_BONUS_OBJECT_VISITED,
  MOVEMENT_INTERACTION_KIND_BONUS_OBJECT_VISIT
} from '../interaction-kinds.js'
import { visitableFootprint } from '../visitable-objects/definitions.js'

export const bonusObjectBehavior = Object.freeze({
  kind: 'BONUS_OBJECT',
  footprintOffsets: (entity, definitions) => visitableFootprint(definitions, entity),
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_BONUS_OBJECT_VISIT,
    outcomeKind: INTERACTION_OUTCOME_KIND_BONUS_OBJECT_VISITED,
    requiresSteppingIntoTarget: true,
    resolveArrivalOutcome({ entity, tile }) {
      return {
        kind: INTERACTION_OUTCOME_KIND_BONUS_OBJECT_VISITED,
        entityId: entity.id,
        entityType: entity.type,
        tile
      }
    }
  })
})
