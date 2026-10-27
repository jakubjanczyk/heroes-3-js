import {
  INTERACTION_OUTCOME_KIND_RESOURCE_GENERATOR_VISITED,
  MOVEMENT_INTERACTION_KIND_RESOURCE_GENERATOR_VISIT
} from '../interaction-kinds.js'

const FOOTPRINTS = Object.freeze({
  WINDMILL: Object.freeze([]),
  WATER_WHEEL: Object.freeze([
    { x: -2, y: -1 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: -2, y: 0 },
    { x: -1, y: 0 }
  ]),
  MYSTICAL_GARDEN: Object.freeze([
    { x: -1, y: 0 },
    { x: 1, y: 0 }
  ])
})

export const resourceGeneratorBehavior = Object.freeze({
  kind: 'RESOURCE_GENERATOR',
  footprintOffsets: (generator) => FOOTPRINTS[generator.type] ?? [],
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_RESOURCE_GENERATOR_VISIT,
    outcomeKind: INTERACTION_OUTCOME_KIND_RESOURCE_GENERATOR_VISITED,
    requiresSteppingIntoTarget: true,
    resolveArrivalOutcome({ entity, tile }) {
      return {
        kind: INTERACTION_OUTCOME_KIND_RESOURCE_GENERATOR_VISITED,
        entityId: entity.id,
        entityType: entity.type,
        tile
      }
    }
  })
})
