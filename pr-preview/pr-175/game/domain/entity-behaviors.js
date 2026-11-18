export function createEntityBehaviors(behaviors = []) {
  const behaviorByKind = new Map(behaviors.map((behavior) => [behavior.kind, behavior]))

  function getArrivalInteraction(entity) {
    return behaviorByKind.get(entity?.kind)?.arrivalInteraction ?? null
  }

  function getFootprintOffsets(entity, definitions = {}) {
    const offsets = behaviorByKind.get(entity?.kind)?.footprintOffsets ?? []
    return typeof offsets === 'function' ? offsets(entity, definitions) : offsets
  }

  function occupiesOwnTile(entity) {
    return behaviorByKind.get(entity?.kind)?.occupiesOwnTile !== false
  }

  function guardsSurroundings(entity) {
    return behaviorByKind.get(entity?.kind)?.guardsSurroundings === true
  }

  // Whether the hero steps onto the entity's tile to visit it, rather than from the tile next to
  // it. `context` holds the game state and the visiting hero.
  function entersTarget(entity, context = {}) {
    const interaction = getArrivalInteraction(entity)
    return (
      Boolean(interaction?.requiresSteppingIntoTarget) &&
      !interaction.stopsBeforeTarget?.({ entity, ...context })
    )
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
    entersTarget,
    getArrivalInteraction,
    getFootprintOffsets,
    guardsSurroundings,
    isArrivalInteractionEntity,
    occupiesOwnTile,
    resolveArrivalOutcome
  })
}
