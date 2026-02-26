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

  function resolveArrivalAtDestination({ destinationTile }) {
    const monster =
      entities.find((entity) => entity.kind === 'MONSTER' && sameTile(entity.tile, destinationTile)) ??
      null;

    if (!monster) {
      return null;
    }

    const monsterDefinition = monsterDefinitions[monster.type] ?? null;
    const monsterName = monsterDefinition?.name ?? 'Monster';

    return {
      kind: 'MONSTER_DEFEATED',
      entityId: monster.id,
      entityType: monster.type,
      tile: destinationTile,
      modal: {
        title: 'Interaction',
        message: `${monsterName} defeated`
      }
    };
  }

  function finalizeMonsterDefeat({ entityId }) {
    const monster = entities.find((entity) => entity.id === entityId) ?? null;
    if (!monster) {
      return false;
    }

    occupancy.removeEntity?.(monster);
    return removeEntityById(entities, entityId);
  }

  return {
    resolveArrivalAtDestination,
    finalizeMonsterDefeat
  };
}
