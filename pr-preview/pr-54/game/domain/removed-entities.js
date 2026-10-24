import { toEntityIdOrNull } from './value-objects/entity-id.js'

// Ids of entities that are no longer on the map (defeated, collected, ...).
export const NO_REMOVED_ENTITIES = Object.freeze(new Set())

export function applyEntityRemoved(removedIds, entityId) {
  const id = toEntityIdOrNull(entityId)
  if (!id || removedIds.has(id)) {
    return removedIds
  }

  return new Set([...removedIds, id])
}
