import {
  INTERACTION_OUTCOME_KIND_HEROES_MET,
  MOVEMENT_INTERACTION_KIND_HERO_MEET
} from '../interaction-kinds.js'

// Walking onto another of the player's heroes stops next to them and opens the exchange screen.
// Heroes only meet their own side's heroes until there are other players.
export const heroBehavior = Object.freeze({
  kind: 'HERO',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_HERO_MEET,
    outcomeKind: INTERACTION_OUTCOME_KIND_HEROES_MET,
    requiresSteppingIntoTarget: false,
    resolveArrivalOutcome({ entity, tile }) {
      return {
        kind: INTERACTION_OUTCOME_KIND_HEROES_MET,
        entityId: entity.id,
        entityType: entity.type,
        tile
      }
    }
  })
})
