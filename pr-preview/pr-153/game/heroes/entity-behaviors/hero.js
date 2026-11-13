import { heroOwner, heroTile } from '../../state/queries.js'
import {
  INTERACTION_OUTCOME_KIND_HERO_ATTACKED,
  INTERACTION_OUTCOME_KIND_HEROES_MET,
  MOVEMENT_INTERACTION_KIND_HERO_MEET
} from '../interaction-kinds.js'
import { townIdAt, townOwner } from '../state/towns.js'

// Walking onto another of the player's heroes stops next to them and opens the exchange screen;
// walking onto an enemy hero stops next to them and attacks them, and the town they stand in when
// it is their player's.
export const heroBehavior = Object.freeze({
  kind: 'HERO',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_HERO_MEET,
    outcomeKind: INTERACTION_OUTCOME_KIND_HEROES_MET,
    requiresSteppingIntoTarget: false,
    resolveArrivalOutcome({ entity, tile, state, heroId }) {
      const owner = heroOwner(state, entity.id)
      const isEnemy = owner !== heroOwner(state, heroId)
      const townId = townIdAt(state, heroTile(state, entity.id))
      return {
        ...(isEnemy && townId && townOwner(state, townId) === owner ? { townId } : {}),
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
