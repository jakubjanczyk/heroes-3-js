import { getEntityName } from './shared.js';

export const mineBehavior = Object.freeze({
  kind: 'MINE',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: 'MINE_ENTER',
    outcomeKind: 'MINE_ENTERED',
    requiresSteppingIntoTarget: true,
    definitionsKey: 'mines',
    defaultName: 'Mine',
    resolveArrivalOutcome({ entity, definitions = {}, tile }) {
      const mineName = getEntityName({
        entity,
        definitions,
        definitionsKey: 'mines',
        defaultName: 'Mine'
      });

      return {
        kind: 'MINE_ENTERED',
        entityId: entity.id,
        entityType: entity.type,
        tile,
        mineName
      };
    }
  })
});
