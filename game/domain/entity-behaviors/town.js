import { getEntityName } from './shared.js';

export const townBehavior = Object.freeze({
  kind: 'TOWN',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: 'TOWN_VISIT',
    outcomeKind: 'TOWN_VISITED',
    requiresSteppingIntoTarget: true,
    definitionsKey: 'towns',
    defaultName: 'Town',
    modalVerb: 'visited',
    resolveArrivalOutcome({ entity, definitions = {}, tile }) {
      const townName = getEntityName({
        entity,
        definitions,
        definitionsKey: 'towns',
        defaultName: 'Town'
      });

      return {
        kind: 'TOWN_VISITED',
        entityId: entity.id,
        entityType: entity.type,
        tile,
        townName,
        modal: {
          title: 'Interaction',
          message: `${townName} visited`
        }
      };
    }
  })
});
