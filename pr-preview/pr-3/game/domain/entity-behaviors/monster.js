import { getEntityName } from './shared.js';
import {
  INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED,
  MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT
} from '../interaction-kinds.js';

export const monsterBehavior = Object.freeze({
  kind: 'MONSTER',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT,
    outcomeKind: INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED,
    requiresSteppingIntoTarget: false,
    definitionsKey: 'monsters',
    defaultName: 'Monster',
    modalVerb: 'defeated',
    resolveArrivalOutcome({ entity, definitions = {}, tile }) {
      const monsterName = getEntityName({
        entity,
        definitions,
        definitionsKey: 'monsters',
        defaultName: 'Monster'
      });

      return {
        kind: INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED,
        entityId: entity.id,
        entityType: entity.type,
        tile,
        modal: {
          title: 'Interaction',
          message: `${monsterName} defeated`
        }
      };
    }
  })
});
