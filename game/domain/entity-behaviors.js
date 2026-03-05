const ARRIVAL_INTERACTION_BEHAVIORS = Object.freeze({
  MONSTER: Object.freeze({
    movementInteractionKind: 'MONSTER_COMBAT',
    outcomeKind: 'MONSTER_DEFEATED',
    requiresSteppingIntoTarget: false,
    definitionsKey: 'monsters',
    defaultName: 'Monster',
    modalVerb: 'defeated'
  }),
  RESOURCE: Object.freeze({
    movementInteractionKind: 'RESOURCE_COLLECT',
    outcomeKind: 'RESOURCE_COLLECTED',
    requiresSteppingIntoTarget: false,
    definitionsKey: 'resources',
    defaultName: 'Resource'
  }),
  TOWN: Object.freeze({
    movementInteractionKind: 'TOWN_VISIT',
    outcomeKind: 'TOWN_VISITED',
    requiresSteppingIntoTarget: true,
    definitionsKey: 'towns',
    defaultName: 'Town',
    modalVerb: 'visited'
  })
});

function getBehaviorByEntity(entity) {
  const kind = entity?.kind;
  if (typeof kind !== 'string') {
    return null;
  }

  return ARRIVAL_INTERACTION_BEHAVIORS[kind] ?? null;
}

function getDefinitionForEntity({ entity, definitions, behavior }) {
  const byType = definitions?.[behavior.definitionsKey] ?? {};
  const entityType = entity?.type;
  if (typeof entityType !== 'string' || entityType.length < 1) {
    return null;
  }

  return byType[entityType] ?? null;
}

function getEntityName({ entity, definitions, behavior }) {
  const definition = getDefinitionForEntity({ entity, definitions, behavior });
  return definition?.name ?? behavior.defaultName;
}

export function isArrivalInteractionEntity(entity) {
  return getBehaviorByEntity(entity) !== null;
}

export function toMovementInteractionKind(entity) {
  return getBehaviorByEntity(entity)?.movementInteractionKind ?? null;
}

export function requiresSteppingIntoTarget(entity) {
  return getBehaviorByEntity(entity)?.requiresSteppingIntoTarget ?? false;
}

export function resolveArrivalOutcome({ entity, definitions = {}, tile }) {
  const behavior = getBehaviorByEntity(entity);
  if (!behavior) {
    return null;
  }

  const outcome = {
    kind: behavior.outcomeKind,
    entityId: entity.id,
    entityType: entity.type,
    tile
  };

  if (entity.kind === 'MONSTER') {
    const monsterName = getEntityName({ entity, definitions, behavior });
    return {
      ...outcome,
      modal: {
        title: 'Interaction',
        message: `${monsterName} ${behavior.modalVerb}`
      }
    };
  }

  if (entity.kind === 'RESOURCE') {
    const resourceName = getEntityName({ entity, definitions, behavior });
    const resourceDefinition = getDefinitionForEntity({ entity, definitions, behavior });
    const parsedAmount = Number(resourceDefinition?.amount);
    return {
      ...outcome,
      amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
      resourceName
    };
  }

  if (entity.kind === 'TOWN') {
    const townName = getEntityName({ entity, definitions, behavior });
    return {
      ...outcome,
      townName,
      modal: {
        title: 'Interaction',
        message: `${townName} ${behavior.modalVerb}`
      }
    };
  }

  return null;
}
