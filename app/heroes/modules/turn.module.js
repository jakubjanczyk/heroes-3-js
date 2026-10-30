import { calendarDateOfTurn } from '../../../game/heroes/calendar.js'
import { decideEndTurn, decideSpendMovementPoints } from '../../../game/heroes/turn-system.js'
import {
  APP_COMMAND_END_TURN_REQUESTED,
  APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_NOTICE_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerTurnModule = defineModule(
  ({ emit, emitAll, config, state }) => {
    const now = typeof config?.now === 'function' ? config.now : () => Date.now()
    const moveDurationThresholdMs = config?.moveDurationThresholdMs ?? 16
    const endTurnPostMoveGraceMs = config?.endTurnPostMoveGraceMs ?? 32
    const shouldApplyPostMoveGrace = Number(config?.movementStepDelayMs ?? 220) > 0

    let isMoving = false
    let definitions = {}
    let moveStartedAt = 0
    let suppressEndTurnUntil = 0

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            isMoving = false
            suppressEndTurnUntil = 0
            definitions = event.detail?.definitions ?? {}
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
            const movementPoints = decideSpendMovementPoints(state.get(), event.detail)
            if (movementPoints) {
              emit(APP_FACT_MOVEMENT_POINTS_CHANGED, movementPoints)
            }
          }
        },
        {
          type: APP_COMMAND_END_TURN_REQUESTED,
          handler: () => {
            if (!state.get() || isMoving || now() < suppressEndTurnUntil) {
              return
            }

            const outcome = decideEndTurn(state.get(), definitions)
            emitAll([
              { type: APP_FACT_TURN_ENDED, detail: { turnNumber: outcome.turnNumber } },
              ...outcome.movementPoints.map((detail) => ({
                type: APP_FACT_MOVEMENT_POINTS_CHANGED,
                detail
              }))
            ])

            const date = calendarDateOfTurn(outcome.turnNumber)
            if (date.day === 1) {
              emit(APP_UI_NOTICE_OPENED, {
                title: 'New week',
                message: `A new week begins. Week ${date.week}`
              })
            }
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
      APP_FACT_MOVE_STARTED,
      APP_FACT_MOVE_FINISHED,
      APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
      APP_COMMAND_END_TURN_REQUESTED
    ],
    produces: [APP_FACT_MOVEMENT_POINTS_CHANGED, APP_FACT_TURN_ENDED, APP_UI_NOTICE_OPENED]
  }
)
