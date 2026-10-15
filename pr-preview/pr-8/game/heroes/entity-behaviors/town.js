import { getEntityName } from './shared.js';
import {
  INTERACTION_OUTCOME_KIND_TOWN_VISITED,
  MOVEMENT_INTERACTION_KIND_TOWN_VISIT
} from '../interaction-kinds.js';

export const townBehavior = Object.freeze({
  kind: 'TOWN',
  // Tiles around the entry tile that the town's building covers.
  footprintOffsets: Object.freeze([
    { x: -1, y: -2 }, { x: 0, y: -2 }, { x: 1, y: -2 },
    { x: -2, y: -1 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 2, y: -1 },
    { x: -2, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }
  ]),
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
