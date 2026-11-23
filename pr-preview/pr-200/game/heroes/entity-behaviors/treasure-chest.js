import {
  INTERACTION_OUTCOME_KIND_TREASURE_CHEST_FOUND,
  MOVEMENT_INTERACTION_KIND_TREASURE_CHEST_OPEN
} from '../interaction-kinds.js'
import { heroById } from '../state/hero-details.js'
import { treasureChestContents } from '../state/map-objects.js'
import { openChest } from '../treasure-chest.js'

export const treasureChestBehavior = Object.freeze({
  kind: 'TREASURE_CHEST',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_TREASURE_CHEST_OPEN,
    outcomeKind: INTERACTION_OUTCOME_KIND_TREASURE_CHEST_FOUND,
    requiresSteppingIntoTarget: false,
    resolveArrivalOutcome({ entity, tile, state, heroId, definitions }) {
      const found = openChest(
        state ? treasureChestContents(state, entity.id) : null,
        state ? heroById(state, heroId)?.artifacts : null
      )
      return {
        kind: INTERACTION_OUTCOME_KIND_TREASURE_CHEST_FOUND,
        entityId: entity.id,
        entityType: entity.type,
        tile,
        removesEntity: true,
        ...found,
        artifactName: definitions?.artifacts?.[found.artifact]?.name ?? null
      }
    }
  })
})
