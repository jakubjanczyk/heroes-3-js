import { getDefinitionForEntity, getEntityName } from './shared.js';

export const resourceBehavior = Object.freeze({
  kind: 'RESOURCE',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: 'RESOURCE_COLLECT',
    outcomeKind: 'RESOURCE_COLLECTED',
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
        kind: 'RESOURCE_COLLECTED',
        entityId: entity.id,
        entityType: entity.type,
        tile,
        amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
        resourceName
      };
    }
  })
});
