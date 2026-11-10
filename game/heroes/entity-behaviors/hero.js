import { heroOwner } from '../../state/queries.js'
import {
  INTERACTION_OUTCOME_KIND_HEROES_MET,
  MOVEMENT_INTERACTION_KIND_HERO_MEET
} from '../interaction-kinds.js'

// Walking onto another of the player's heroes stops next to them and opens the exchange screen.
// Walking onto an enemy hero stops next to them too, and nothing happens until heroes can attack.
export const heroBehavior = Object.freeze({
  kind: 'HERO',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_HERO_MEET,
    outcomeKind: INTERACTION_OUTCOME_KIND_HEROES_MET,
    requiresSteppingIntoTarget: false,
    resolveArrivalOutcome({ entity, tile, state, heroId }) {
      if (heroOwner(state, entity.id) !== heroOwner(state, heroId)) {
        return null
      }

      return {
        kind: INTERACTION_OUTCOME_KIND_HEROES_MET,
        entityId: entity.id,
        entityType: entity.type,
        tile
      }
    }
  })
})
