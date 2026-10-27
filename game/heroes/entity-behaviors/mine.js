import {
  INTERACTION_OUTCOME_KIND_MINE_ENTERED,
  MOVEMENT_INTERACTION_KIND_MINE_ENTER
} from '../interaction-kinds.js'
import { getEntityName } from './shared.js'

const MINE_FOOTPRINT = Object.freeze([
  { x: -1, y: 0 },
  { x: 1, y: 0 }
])
const TWO_ROW_MINE_FOOTPRINT = Object.freeze([
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  ...MINE_FOOTPRINT
])
const FOOTPRINTS = Object.freeze({
  GEM_POND: TWO_ROW_MINE_FOOTPRINT,
  ORE_PIT: TWO_ROW_MINE_FOOTPRINT,
  SAWMILL: Object.freeze([
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: -2, y: 0 },
    { x: -1, y: 0 },
    { x: 1, y: 0 }
  ])
})

export const mineBehavior = Object.freeze({
  kind: 'MINE',
  footprintOffsets: (mine) => FOOTPRINTS[mine.type] ?? MINE_FOOTPRINT,
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_MINE_ENTER,
    outcomeKind: INTERACTION_OUTCOME_KIND_MINE_ENTERED,
    requiresSteppingIntoTarget: true,
    definitionsKey: 'mines',
    defaultName: 'Mine',
    resolveArrivalOutcome({ entity, definitions = {}, tile }) {
      const mineName = getEntityName({
        entity,
        definitions,
        definitionsKey: 'mines',
        defaultName: 'Mine'
      })

      return {
        kind: INTERACTION_OUTCOME_KIND_MINE_ENTERED,
        entityId: entity.id,
        entityType: entity.type,
        tile,
        mineName
      }
    }
  })
})
