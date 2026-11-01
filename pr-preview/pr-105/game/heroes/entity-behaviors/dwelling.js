import { heroOwner } from '../../state/queries.js'
import {
  INTERACTION_OUTCOME_KIND_DWELLING_VISITED,
  MOVEMENT_INTERACTION_KIND_DWELLING_VISIT
} from '../interaction-kinds.js'
import { dwellingCreature, isFreeDwelling } from '../map-dwellings.js'
import { dwellingGuardsAgainst } from '../state/map-objects.js'
import { getEntityName } from './shared.js'

// A dwelling blocks only the tile beside its entrance; the rest of its picture can be walked on.
const DWELLING_FOOTPRINT = Object.freeze([{ x: -1, y: 0 }])
const FOOTPRINTS = Object.freeze({
  GUARDHOUSE: Object.freeze([
    { x: -1, y: -1 },
    { x: -1, y: 0 }
  ]),
  ARCHERS_TOWER: Object.freeze([{ x: 1, y: 0 }])
})

export const dwellingBehavior = Object.freeze({
  kind: 'DWELLING',
  footprintOffsets: (dwelling) => FOOTPRINTS[dwelling.type] ?? DWELLING_FOOTPRINT,
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_DWELLING_VISIT,
    outcomeKind: INTERACTION_OUTCOME_KIND_DWELLING_VISITED,
    requiresSteppingIntoTarget: true,
    definitionsKey: 'dwellings',
    defaultName: 'Dwelling',
    resolveArrivalOutcome({ entity, definitions = {}, tile, state, heroId }) {
      const creature = dwellingCreature(entity.type, definitions)
      const guards = state ? dwellingGuardsAgainst(state, entity.id, heroOwner(state, heroId)) : 0
      return {
        kind: INTERACTION_OUTCOME_KIND_DWELLING_VISITED,
        entityId: entity.id,
        entityType: entity.type,
        tile,
        dwellingName: getEntityName({
          entity,
          definitions,
          definitionsKey: 'dwellings',
          defaultName: 'Dwelling'
        }),
        creaturePlural: creature?.namePlural ?? creature?.name ?? '',
        isFree: isFreeDwelling(entity.type, definitions),
        guards: guards > 0 ? { creature: creature.creature, count: guards } : null
      }
    }
  })
})
