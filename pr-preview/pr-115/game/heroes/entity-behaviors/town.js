import {
  INTERACTION_OUTCOME_KIND_TOWN_VISITED,
  MOVEMENT_INTERACTION_KIND_TOWN_VISIT
} from '../interaction-kinds.js'
import { getEntityName } from './shared.js'

// A Heroes 3 map names each town; one the scenario leaves unnamed goes by its type's name.
export function getTownName({ entity, definitions = {} }) {
  return (
    entity?.name ??
    getEntityName({ entity, definitions, definitionsKey: 'towns', defaultName: 'Town' })
  )
}

export const townBehavior = Object.freeze({
  kind: 'TOWN',
  // Tiles around the entry tile that the town's building covers.
  footprintOffsets: Object.freeze([
    { x: -1, y: -2 },
    { x: 0, y: -2 },
    { x: 1, y: -2 },
    { x: -2, y: -1 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: 2, y: -1 },
    { x: -2, y: 0 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 }
  ]),
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_TOWN_VISIT,
    outcomeKind: INTERACTION_OUTCOME_KIND_TOWN_VISITED,
    requiresSteppingIntoTarget: true,
    definitionsKey: 'towns',
    defaultName: 'Town',
    resolveArrivalOutcome({ entity, tile }) {
      return {
        kind: INTERACTION_OUTCOME_KIND_TOWN_VISITED,
        entityId: entity.id,
        entityType: entity.type,
        tile
      }
    }
  })
})
