import {
  applyMovementPointsChanged,
  applyTurnEnded,
  createTurnState,
  decideEndTurn,
  decideSpendMovementPoints
} from '../../../game/heroes/turn-system.js'
import {
  APP_COMMAND_END_TURN_REQUESTED,
  APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerTurnModule = defineModule(
  ({ emit, config }) => {
    const maxMovementPoints = config.maxMovementPoints
    const now = typeof config?.now === 'function' ? config.now : () => Date.now()
    const moveDurationThresholdMs = config?.moveDurationThresholdMs ?? 16
    const endTurnPostMoveGraceMs = config?.endTurnPostMoveGraceMs ?? 32
    const shouldApplyPostMoveGrace = Number(config?.movementStepDelayMs ?? 220) > 0

    // Only fact handlers assign turnState; commands decide and emit facts, so live play and replay
    // go through the same code path.
    let turnState = null
    let isMoving = false
    let moveStartedAt = 0
    let suppressEndTurnUntil = 0

    function emitMovementPointsChanged(value, { log = true } = {}) {
      emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value, max: turnState.maxMovementPoints }, { log })
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: () => {
            turnState = createTurnState({ maxMovementPoints })
            emitMovementPointsChanged(turnState.remainingMovementPoints, { log: false })
          }
        },
        {
          type: APP_FACT_MOVEMENT_POINTS_CHANGED,
          handler: (event) => {
            if (!turnState) {
              return
            }

            turnState = applyMovementPointsChanged(turnState, event.detail.value)
          }
        },
        {
          type: APP_FACT_TURN_ENDED,
          handler: (event) => {
            if (!turnState) {
              return
            }

            turnState = applyTurnEnded(turnState, event.detail.turnNumber)
          }
        },
        {
          type: APP_FACT_MOVE_STARTED,
          handler: () => {
            isMoving = true
            moveStartedAt = now()
          }
        },
        {
          type: APP_FACT_MOVE_FINISHED,
          handler: () => {
            isMoving = false
            if (!shouldApplyPostMoveGrace) {
              suppressEndTurnUntil = 0
              return
            }

            const moveDurationMs = now() - moveStartedAt
            suppressEndTurnUntil =
              moveDurationMs >= moveDurationThresholdMs ? now() + endTurnPostMoveGraceMs : 0
          }
        },
        {
          type: APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
          handler: (event) => {
            if (!turnState) {
              return
            }

            const outcome = decideSpendMovementPoints(turnState, event.detail.amount)
            if (!outcome) {
              return
            }

            emitMovementPointsChanged(outcome.remainingMovementPoints)
          }
        },
        {
          type: APP_COMMAND_END_TURN_REQUESTED,
          handler: () => {
            if (!turnState || isMoving || now() < suppressEndTurnUntil) {
              return
            }

            const outcome = decideEndTurn(turnState)
            emit(APP_FACT_TURN_ENDED, { turnNumber: outcome.turnNumber })
            emitMovementPointsChanged(outcome.remainingMovementPoints)
          }
        }
      ]
    }
  },
  {
    id: 'turn',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_FACT_TURN_ENDED,
      APP_FACT_MOVE_STARTED,
      APP_FACT_MOVE_FINISHED,
      APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
      APP_COMMAND_END_TURN_REQUESTED
    ],
    produces: [APP_FACT_MOVEMENT_POINTS_CHANGED, APP_FACT_TURN_ENDED]
  }
)
