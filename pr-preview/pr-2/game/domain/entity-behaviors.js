import { getArrivalInteraction } from './entity-behaviors/registry.js';

export function isArrivalInteractionEntity(entity) {
  return getArrivalInteraction(entity) !== null;
}

export function toMovementInteractionKind(entity) {
  return getArrivalInteraction(entity)?.movementInteractionKind ?? null;
}

export function requiresSteppingIntoTarget(entity) {
  return getArrivalInteraction(entity)?.requiresSteppingIntoTarget ?? false;
}

export function resolveArrivalOutcome({ entity, definitions = {}, tile }) {
  const interaction = getArrivalInteraction(entity);
  if (!interaction) {
    return null;
  }

  return interaction.resolveArrivalOutcome({ entity, definitions, tile });
}
