import {
  INTERACTION_OUTCOME_KIND_TREASURE_CHEST_FOUND,
  MOVEMENT_INTERACTION_KIND_TREASURE_CHEST_OPEN
} from '../interaction-kinds.js'
import { treasureChestRewards } from '../treasure-chest.js'

export const treasureChestBehavior = Object.freeze({
  kind: 'TREASURE_CHEST',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_TREASURE_CHEST_OPEN,
    outcomeKind: INTERACTION_OUTCOME_KIND_TREASURE_CHEST_FOUND,
    requiresSteppingIntoTarget: false,
    resolveArrivalOutcome({ entity, tile }) {
      return {
        kind: INTERACTION_OUTCOME_KIND_TREASURE_CHEST_FOUND,
        entityId: entity.id,
        entityType: entity.type,
        tile,
        removesEntity: true,
        rewards: treasureChestRewards(entity)
      }
    }
  })
})
