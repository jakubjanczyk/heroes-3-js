function sameTile(a, b) {
  return a.x === b.x && a.y === b.y;
}

function removeEntityById(entities, entityId) {
  const index = entities.findIndex((entity) => entity.id === entityId);
  if (index < 0) {
    return false;
  }

  entities.splice(index, 1);
  return true;
}

export function createInteractionSystem({ entities, occupancy, definitions = {} }) {
  const monsterDefinitions = definitions.monsters ?? {};
  const resourceDefinitions = definitions.resources ?? {};

  function resolveArrivalAtDestination({ destinationTile }) {
    const interactionEntity =
      entities.find(
        (entity) => entity.kind !== 'HERO' && sameTile(entity.tile, destinationTile)
      ) ?? null;
    if (!interactionEntity) {
      return null;
    }

    if (interactionEntity.kind === 'MONSTER') {
      const monsterDefinition = monsterDefinitions[interactionEntity.type] ?? null;
      const monsterName = monsterDefinition?.name ?? 'Monster';

      return {
        kind: 'MONSTER_DEFEATED',
        entityId: interactionEntity.id,
        entityType: interactionEntity.type,
        tile: destinationTile,
        modal: {
          title: 'Interaction',
          message: `${monsterName} defeated`
        }
      };
    }

    if (interactionEntity.kind === 'RESOURCE') {
      const resourceDefinition = resourceDefinitions[interactionEntity.type] ?? null;
      const resourceName = resourceDefinition?.name ?? 'Resource';
      const amount = Number(resourceDefinition?.amount);

      return {
        kind: 'RESOURCE_COLLECTED',
        entityId: interactionEntity.id,
        entityType: interactionEntity.type,
        tile: destinationTile,
        amount: Number.isFinite(amount) ? amount : 0,
        resourceName
      };
    }

    return null;
  }

  function finalizeMonsterDefeat({ entityId }) {
    const monster = entities.find((entity) => entity.id === entityId) ?? null;
    if (!monster) {
      return false;
    }

    occupancy.removeEntity?.(monster);
    return removeEntityById(entities, entityId);
  }

  function finalizeResourceCollection({ entityId }) {
    const resource = entities.find((entity) => entity.id === entityId) ?? null;
    if (!resource) {
      return false;
    }

    occupancy.removeEntity?.(resource);
    return removeEntityById(entities, entityId);
  }

  return {
    resolveArrivalAtDestination,
    finalizeMonsterDefeat,
    finalizeResourceCollection
  };
}
