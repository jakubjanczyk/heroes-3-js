import { hasFullBackpack } from '../artifacts.js'
import {
  INTERACTION_OUTCOME_KIND_ARTIFACT_PICKED_UP,
  MOVEMENT_INTERACTION_KIND_ARTIFACT_PICK_UP
} from '../interaction-kinds.js'
import { heroById } from '../state/hero-details.js'
import { artifactGuards } from '../state/map-objects.js'

export const artifactBehavior = Object.freeze({
  kind: 'ARTIFACT',
  arrivalInteraction: Object.freeze({
    movementInteractionKind: MOVEMENT_INTERACTION_KIND_ARTIFACT_PICK_UP,
    outcomeKind: INTERACTION_OUTCOME_KIND_ARTIFACT_PICKED_UP,
    requiresSteppingIntoTarget: false,
    definitionsKey: 'artifacts',
    defaultName: 'Artifact',
    resolveArrivalOutcome({ entity, tile, state, heroId }) {
      const guards = state ? artifactGuards(state, entity.id) : []
      const isGuarded = guards.length > 0
      const cannotCarry =
        !isGuarded && Boolean(state) && hasFullBackpack(heroById(state, heroId)?.artifacts)
      return {
        kind: INTERACTION_OUTCOME_KIND_ARTIFACT_PICKED_UP,
        entityId: entity.id,
        entityType: entity.type,
        tile,
        guards: isGuarded ? guards : null,
        cannotCarry,
        removesEntity: !isGuarded && !cannotCarry
      }
    }
  })
})
