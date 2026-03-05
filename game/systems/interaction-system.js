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

  function finalizeInteraction({ entityId, expectedMovementInteractionKind }) {
    const entity = entities.find((candidate) => candidate.id === entityId) ?? null;
    const arrivalInteraction = getArrivalInteraction(entity);
    if (!arrivalInteraction) {
      return false;
    }

    return arrivalInteraction.movementInteractionKind === expectedMovementInteractionKind;
  }

  function finalizeMonsterDefeat({ entityId }) {
    return finalizeInteraction({
      entityId,
      expectedMovementInteractionKind: 'MONSTER_COMBAT'
    });
  }

  function finalizeResourceCollection({ entityId }) {
    return finalizeInteraction({
      entityId,
      expectedMovementInteractionKind: 'RESOURCE_COLLECT'
    });
  }

  return {
    resolveArrivalAtDestination,
    finalizeMonsterDefeat,
    finalizeResourceCollection
  };
}
