import { getArrivalInteraction } from '../entity-behaviors/registry.js';
import { toEntityIdOrNull } from '../value-objects/entity-id.js';

export function buildArrivalPlan({
  occupancy,
  targetTile,
  movingEntityId
}) {
  const destinationOccupant = occupancy?.getAt?.(targetTile) ?? null;
  if (!destinationOccupant) {
    return null;
  }

  const destinationEntityId = toEntityIdOrNull(destinationOccupant.id);
  if (!destinationEntityId) {
    return null;
  }

  if (destinationEntityId === movingEntityId) {
    return null;
  }

  const interaction = getArrivalInteraction(destinationOccupant);
  if (!interaction) {
    return null;
  }

  return {
    entityId: destinationEntityId,
    movementInteractionKind: interaction.movementInteractionKind,
    stopBeforeTarget: !interaction.requiresSteppingIntoTarget
  };
}
