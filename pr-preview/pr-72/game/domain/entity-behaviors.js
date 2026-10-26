export function createEntityBehaviors(behaviors = []) {
  const behaviorByKind = new Map(behaviors.map((behavior) => [behavior.kind, behavior]))

  function getArrivalInteraction(entity) {
    return behaviorByKind.get(entity?.kind)?.arrivalInteraction ?? null
  }

  function getFootprintOffsets(entity) {
    return behaviorByKind.get(entity?.kind)?.footprintOffsets ?? []
  }

  function guardsSurroundings(entity) {
    return behaviorByKind.get(entity?.kind)?.guardsSurroundings === true
  }

  function isArrivalInteractionEntity(entity) {
    return getArrivalInteraction(entity) !== null
  }

  function resolveArrivalOutcome({ entity, definitions = {}, tile }) {
    const interaction = getArrivalInteraction(entity)
    if (!interaction) {
      return null
    }

    return interaction.resolveArrivalOutcome({ entity, definitions, tile })
  }

  return Object.freeze({
    getArrivalInteraction,
    getFootprintOffsets,
    guardsSurroundings,
    isArrivalInteractionEntity,
    resolveArrivalOutcome
  })
}
