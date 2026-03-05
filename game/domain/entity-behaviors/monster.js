import { getEntityName } from './shared.js';

export const monsterBehavior = Object.freeze({
  kind: 'MONSTER',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: 'MONSTER_COMBAT',
    outcomeKind: 'MONSTER_DEFEATED',
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
        kind: 'MONSTER_DEFEATED',
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
