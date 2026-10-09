import { getDefinitionForEntity, getEntityName } from './shared.js';
import {
  INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED,
  MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT
} from '../interaction-kinds.js';

export const resourceBehavior = Object.freeze({
  kind: 'RESOURCE',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT,
    outcomeKind: INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED,
    requiresSteppingIntoTarget: false,
    definitionsKey: 'resources',
    defaultName: 'Resource',
    resolveArrivalOutcome({ entity, definitions = {}, tile }) {
      const resourceName = getEntityName({
        entity,
        definitions,
        definitionsKey: 'resources',
        defaultName: 'Resource'
      });
      const resourceDefinition = getDefinitionForEntity({
        entity,
        definitions,
        definitionsKey: 'resources'
      });
      const parsedAmount = Number(resourceDefinition?.amount);

      return {
        kind: INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED,
        entityId: entity.id,
        entityType: entity.type,
        tile,
        amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
        resourceName
      };
    }
  })
});
