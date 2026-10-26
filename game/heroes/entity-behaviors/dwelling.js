import {
  INTERACTION_OUTCOME_KIND_DWELLING_VISITED,
  MOVEMENT_INTERACTION_KIND_DWELLING_VISIT
} from '../interaction-kinds.js'
import { mineBehavior } from './mine.js'

export const dwellingBehavior = Object.freeze({
  kind: 'DWELLING',
  // A mine's size until dwellings have pictures of their own.
  footprintOffsets: mineBehavior.footprintOffsets,
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_DWELLING_VISIT,
    outcomeKind: INTERACTION_OUTCOME_KIND_DWELLING_VISITED,
    requiresSteppingIntoTarget: true,
    definitionsKey: 'dwellings',
    defaultName: 'Dwelling',
    resolveArrivalOutcome({ entity, tile }) {
      return {
        kind: INTERACTION_OUTCOME_KIND_DWELLING_VISITED,
        entityId: entity.id,
        entityType: entity.type,
        tile
      }
    }
  })
})
