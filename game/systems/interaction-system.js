function sameTile(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function createInteractionSystem({ entities, definitions = {} }) {
  const monsterDefinitions = definitions.monsters ?? {};
  const resourceDefinitions = definitions.resources ?? {};
  const townDefinitions = definitions.towns ?? {};

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

    if (interactionEntity.kind === 'TOWN') {
      const townDefinition = townDefinitions[interactionEntity.type] ?? null;
      const townName = townDefinition?.name ?? 'Town';

      return {
        kind: 'TOWN_VISITED',
        entityId: interactionEntity.id,
        entityType: interactionEntity.type,
        tile: destinationTile,
        townName,
        modal: {
          title: 'Interaction',
          message: `${townName} visited`
        }
      };
    }

    return null;
  }

  function finalizeMonsterDefeat({ entityId }) {
    const monster = entities.find((entity) => entity.id === entityId) ?? null;
    return Boolean(monster && monster.kind === 'MONSTER');
  }

  function finalizeResourceCollection({ entityId }) {
    const resource = entities.find((entity) => entity.id === entityId) ?? null;
    return Boolean(resource && resource.kind === 'RESOURCE');
  }

  return {
    resolveArrivalAtDestination,
    finalizeMonsterDefeat,
    finalizeResourceCollection
  };
}
