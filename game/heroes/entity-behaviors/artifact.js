import {
  INTERACTION_OUTCOME_KIND_ARTIFACT_PICKED_UP,
  MOVEMENT_INTERACTION_KIND_ARTIFACT_PICK_UP
} from '../interaction-kinds.js'

export const artifactBehavior = Object.freeze({
  kind: 'ARTIFACT',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_ARTIFACT_PICK_UP,
    outcomeKind: INTERACTION_OUTCOME_KIND_ARTIFACT_PICKED_UP,
    requiresSteppingIntoTarget: false,
    definitionsKey: 'artifacts',
    defaultName: 'Artifact',
    resolveArrivalOutcome({ entity, tile }) {
      return {
        kind: INTERACTION_OUTCOME_KIND_ARTIFACT_PICKED_UP,
        entityId: entity.id,
        entityType: entity.type,
        tile,
        removesEntity: true
      }
    }
  })
})
