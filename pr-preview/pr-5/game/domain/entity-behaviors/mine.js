import { getEntityName } from './shared.js';
import {
  INTERACTION_OUTCOME_KIND_MINE_ENTERED,
  MOVEMENT_INTERACTION_KIND_MINE_ENTER
} from '../interaction-kinds.js';

export const mineBehavior = Object.freeze({
  kind: 'MINE',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_MINE_ENTER,
    outcomeKind: INTERACTION_OUTCOME_KIND_MINE_ENTERED,
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
        kind: INTERACTION_OUTCOME_KIND_MINE_ENTERED,
        entityId: entity.id,
        entityType: entity.type,
        tile,
        mineName
      };
    }
  })
});
