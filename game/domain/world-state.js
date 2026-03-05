function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function normalizeTile(tile) {
  const x = Number(tile?.x);
  const y = Number(tile?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    x: Math.floor(x),
    y: Math.floor(y)
  };
}

export function createWorldState({ scenario, occupancy }) {
  const entities = scenario?.entities ?? [];

  function getEntityById(entityId) {
    if (!isNonEmptyString(entityId)) {
      return null;
    }

    return entities.find((entity) => entity.id === entityId) ?? null;
  }

  function removeEntityById(entityId) {
    if (!isNonEmptyString(entityId)) {
      return null;
    }

    const index = entities.findIndex((entity) => entity.id === entityId);
    if (index < 0) {
      return null;
    }

    const [removedEntity] = entities.splice(index, 1);
    if (removedEntity) {
      occupancy?.removeEntity?.(removedEntity);
    }

    return removedEntity ?? null;
  }

  function moveEntity({ entityId, toTile }) {
    const entity = getEntityById(entityId);
    if (!entity) {
      return null;
    }

    const nextTile = normalizeTile(toTile);
    if (!nextTile) {
      return null;
    }

    occupancy?.moveEntity?.(entity, nextTile);
    entity.tile = nextTile;
    return entity;
  }

  function getPersistentTownAt(tile) {
    const normalizedTile = normalizeTile(tile);
    if (!normalizedTile) {
      return null;
    }

    return (
      entities.find(
        (entity) =>
          entity.kind === 'TOWN' &&
          entity.tile?.x === normalizedTile.x &&
          entity.tile?.y === normalizedTile.y
      ) ?? null
    );
  }

  return {
    getEntityById,
    removeEntityById,
    moveEntity,
    getPersistentTownAt
  };
}
