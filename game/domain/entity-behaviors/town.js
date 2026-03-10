import { getEntityName } from './shared.js';
import {
  INTERACTION_OUTCOME_KIND_TOWN_VISITED,
  MOVEMENT_INTERACTION_KIND_TOWN_VISIT
} from '../interaction-kinds.js';

export const townBehavior = Object.freeze({
  kind: 'TOWN',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_TOWN_VISIT,
    outcomeKind: INTERACTION_OUTCOME_KIND_TOWN_VISITED,
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
        kind: INTERACTION_OUTCOME_KIND_TOWN_VISITED,
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
