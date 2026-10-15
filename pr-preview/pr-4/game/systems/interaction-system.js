import { getArrivalInteraction } from '../domain/entity-behaviors/registry.js';
import { sameTile } from '../../engine/tile-utils.js';

export function createInteractionSystem({ entities, definitions = {} }) {
  function resolveArrivalAtDestination({ destinationTile, arrivingEntityId }) {
    const interactionEntity =
      entities.find(
        (entity) => entity.id !== arrivingEntityId && sameTile(entity.tile, destinationTile)
      ) ?? null;
    if (!interactionEntity) {
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
