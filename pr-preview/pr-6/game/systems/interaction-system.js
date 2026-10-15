import { getArrivalInteraction } from '../domain/entity-behaviors/registry.js';

// `getOccupantAt(tile)` says what stands on a tile; the system never sees the entity list.
export function createInteractionSystem({ getOccupantAt, definitions = {} }) {
  function resolveArrivalAtDestination({ destinationTile, arrivingEntityId }) {
    const interactionEntity = getOccupantAt(destinationTile) ?? null;
    if (!interactionEntity || interactionEntity.id === arrivingEntityId) {
      return null;
    }

    const arrivalInteraction = getArrivalInteraction(interactionEntity);
    if (!arrivalInteraction) {
      return null;
    }

    return arrivalInteraction.resolveArrivalOutcome({
      entity: interactionEntity,
      definitions,
      tile: destinationTile
    });
  }

  return {
    resolveArrivalAtDestination
  };
}
