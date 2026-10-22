import {
  INTERACTION_OUTCOME_KIND_BATTLE_STARTED,
  MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT
} from '../interaction-kinds.js'

// Attacking a monster starts a battle; the monster leaves the map only once it is defeated.
export const monsterBehavior = Object.freeze({
  kind: 'MONSTER',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT,
    outcomeKind: INTERACTION_OUTCOME_KIND_BATTLE_STARTED,
    requiresSteppingIntoTarget: false,
    isAttack: true,
    definitionsKey: 'monsters',
    defaultName: 'Monster',
    resolveArrivalOutcome({ entity, tile }) {
      return {
        kind: INTERACTION_OUTCOME_KIND_BATTLE_STARTED,
        entityId: entity.id,
        entityType: entity.type,
        count: entity.count,
        stacks: entity.stacks,
        tile
      }
    }
  })
})
