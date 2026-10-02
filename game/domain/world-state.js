import { isTown } from './entity-queries.js';
import { toEntityIdOrNull } from './value-objects/entity-id.js';
import { normalizeTile } from './value-objects/tile.js';

export function createWorldState({ scenario, occupancy }) {
  const entities = scenario?.entities ?? [];

  function getEntityById(entityId) {
    const normalizedEntityId = toEntityIdOrNull(entityId);
    if (!normalizedEntityId) {
      return null;
    }

    return entities.find((entity) => entity.id === normalizedEntityId) ?? null;
  }

  function removeEntityById(entityId) {
    const normalizedEntityId = toEntityIdOrNull(entityId);
    if (!normalizedEntityId) {
      return null;
    }

    const index = entities.findIndex((entity) => entity.id === normalizedEntityId);
    if (index < 0) {
      return null;
    }

    const [removedEntity] = entities.splice(index, 1);
    occupancy?.removeEntity?.(removedEntity);

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
          isTown(entity) &&
          entity.tile?.x === normalizedTile.x &&
          entity.tile?.y === normalizedTile.y
      ) ?? null
    );
  }

  function restorePersistentEntitiesAt(tile) {
    const persistentTown = getPersistentTownAt(tile);
    if (!persistentTown) {
      return false;
    }

    const normalizedTile = normalizeTile(tile);
    if (!normalizedTile) {
      return false;
    }

    moveEntity({
      entityId: persistentTown.id,
      toTile: normalizedTile
    });

    return true;
  }

  return {
    getEntityById,
    removeEntityById,
    moveEntity,
    restorePersistentEntitiesAt
  };
}
