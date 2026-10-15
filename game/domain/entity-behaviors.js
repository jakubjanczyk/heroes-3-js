// Builds the lookup for the entity kinds a game provides (e.g. `game/heroes/content.js`).
// Each behavior is `{ kind, arrivalInteraction }`; core code only goes through this lookup.
export function createEntityBehaviors(behaviors = []) {
  const behaviorByKind = new Map(behaviors.map((behavior) => [behavior.kind, behavior]));

  function getArrivalInteraction(entity) {
    return behaviorByKind.get(entity?.kind)?.arrivalInteraction ?? null;
  }

  function isArrivalInteractionEntity(entity) {
    return getArrivalInteraction(entity) !== null;
  }

  function resolveArrivalOutcome({ entity, definitions = {}, tile }) {
    const interaction = getArrivalInteraction(entity);
    if (!interaction) {
      return null;
    }

    return interaction.resolveArrivalOutcome({ entity, definitions, tile });
  }

  return Object.freeze({
    getArrivalInteraction,
    isArrivalInteractionEntity,
    resolveArrivalOutcome
  });
}
