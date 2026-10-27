export function createEntityBehaviors(behaviors = []) {
  const behaviorByKind = new Map(behaviors.map((behavior) => [behavior.kind, behavior]))

  function getArrivalInteraction(entity) {
    return behaviorByKind.get(entity?.kind)?.arrivalInteraction ?? null
  }

  function getFootprintOffsets(entity) {
    const offsets = behaviorByKind.get(entity?.kind)?.footprintOffsets ?? []
    return typeof offsets === 'function' ? offsets(entity) : offsets
  }

  function guardsSurroundings(entity) {
    return behaviorByKind.get(entity?.kind)?.guardsSurroundings === true
  }

  function isArrivalInteractionEntity(entity) {
    return getArrivalInteraction(entity) !== null
  }

  function resolveArrivalOutcome({ entity, definitions = {}, tile, state, heroId }) {
    const interaction = getArrivalInteraction(entity)
    if (!interaction) {
      return null
    }

    return interaction.resolveArrivalOutcome({ entity, definitions, tile, state, heroId })
  }

  return Object.freeze({
    getArrivalInteraction,
    getFootprintOffsets,
    guardsSurroundings,
    isArrivalInteractionEntity,
    resolveArrivalOutcome
  })
}
