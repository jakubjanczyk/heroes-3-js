import { isTown } from './entity-queries.js';
import { toEntityIdOrNull } from './value-objects/entity-id.js';
import { normalizeTile } from './value-objects/tile.js';

export function createWorldState({ scenario, occupancy }) {
  const entities = scenario?.entities ?? [];
  const blockedEntityIds = new Set();

  function getEntityById(entityId) {
    const normalizedEntityId = toEntityIdOrNull(entityId);
    if (!normalizedEntityId) {
      return null;
    }

    return entities.find((entity) => entity.id === normalizedEntityId) ?? null;
  }

  function listBlockedEntityIds() {
    return [...blockedEntityIds];
  }

  function isEntityBlocked(entityId) {
    const normalizedEntityId = toEntityIdOrNull(entityId);
    if (!normalizedEntityId) {
      return false;
    }

    return blockedEntityIds.has(normalizedEntityId);
  }

  function blockEntityById(entityId) {
    const normalizedEntityId = toEntityIdOrNull(entityId);
    if (!normalizedEntityId) {
      return false;
    }

    if (!getEntityById(normalizedEntityId)) {
      return false;
    }

    if (blockedEntityIds.has(normalizedEntityId)) {
      return false;
    }

    blockedEntityIds.add(normalizedEntityId);
    return true;
  }

  function unblockEntityById(entityId) {
    const normalizedEntityId = toEntityIdOrNull(entityId);
    if (!normalizedEntityId) {
      return false;
    }

    return blockedEntityIds.delete(normalizedEntityId);
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
    if (removedEntity) {
      blockedEntityIds.delete(removedEntity.id);
    }
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
    listBlockedEntityIds,
    isEntityBlocked,
    blockEntityById,
    unblockEntityById,
    removeEntityById,
    moveEntity,
    restorePersistentEntitiesAt
  };
}
