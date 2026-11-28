import {
  INTERACTION_OUTCOME_KIND_MARKET_VISITED,
  MOVEMENT_INTERACTION_KIND_MARKET_VISIT
} from '../interaction-kinds.js'

export const marketBehavior = Object.freeze({
  kind: 'MARKET',
  footprintOffsets: (entity, definitions) => definitions?.markets?.[entity.type]?.footprint ?? [],
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_MARKET_VISIT,
    outcomeKind: INTERACTION_OUTCOME_KIND_MARKET_VISITED,
    requiresSteppingIntoTarget: true,
    resolveArrivalOutcome({ entity, tile }) {
      return {
        kind: INTERACTION_OUTCOME_KIND_MARKET_VISITED,
        entityId: entity.id,
        entityType: entity.type,
        tile
      }
    }
  })
})
