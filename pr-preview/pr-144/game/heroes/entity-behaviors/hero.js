import { heroOwner } from '../../state/queries.js'
import {
  INTERACTION_OUTCOME_KIND_HERO_ATTACKED,
  INTERACTION_OUTCOME_KIND_HEROES_MET,
  MOVEMENT_INTERACTION_KIND_HERO_MEET
} from '../interaction-kinds.js'

// Walking onto another of the player's heroes stops next to them and opens the exchange screen;
// walking onto an enemy hero stops next to them and attacks them.
export const heroBehavior = Object.freeze({
  kind: 'HERO',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_HERO_MEET,
    outcomeKind: INTERACTION_OUTCOME_KIND_HEROES_MET,
    requiresSteppingIntoTarget: false,
    resolveArrivalOutcome({ entity, tile, state, heroId }) {
      const isEnemy = heroOwner(state, entity.id) !== heroOwner(state, heroId)
      return {
        kind: isEnemy
          ? INTERACTION_OUTCOME_KIND_HERO_ATTACKED
          : INTERACTION_OUTCOME_KIND_HEROES_MET,
        entityId: entity.id,
        entityType: entity.type,
        tile
      }
    }
  })
})
