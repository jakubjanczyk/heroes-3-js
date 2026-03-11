import { createTurnSystem as createTurnSystemDefault } from '../../game/systems/turn-system.js';
import {
  APP_COMMAND_END_TURN_REQUESTED,
  APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY
} from '../events.js';
import { defineModule } from './shared/module-runtime.js';

export const registerTurnModule = defineModule((
  { emit, config },
  {
    createTurnSystem = createTurnSystemDefault
  } = {}
) => {
  const maxMovementPoints = config.maxMovementPoints;
  const now = typeof config?.now === 'function' ? config.now : () => Date.now();
  const moveDurationThresholdMs = config?.moveDurationThresholdMs ?? 16;
  const endTurnPostMoveGraceMs = config?.endTurnPostMoveGraceMs ?? 32;
  const shouldApplyPostMoveGrace = Number(config?.movementStepDelayMs ?? 220) > 0;

  let turnSystem = null;
  let isMoving = false;
  let moveStartedAt = 0;
  let suppressEndTurnUntil = 0;

  function emitTurnState({ log = true } = {}) {
    if (!turnSystem) {
      return;
    }

    emit(APP_FACT_MOVEMENT_POINTS_CHANGED, {
      value: turnSystem.getRemainingMovementPoints(),
      max: maxMovementPoints
    }, {
      log
    });
  }

  return {
    subscriptions: [
      {
        type: APP_FACT_WORLD_READY,
        handler: () => {
          turnSystem = createTurnSystem({
            maxMovementPoints
          });
          emitTurnState({ log: false });
        }
      },
      {
        type: APP_FACT_MOVEMENT_POINTS_CHANGED,
        handler: (event) => {
          if (!turnSystem) {
            return;
          }

          turnSystem.setRemainingMovementPoints?.(event.detail.value);
        }
      },
      {
        type: APP_FACT_TURN_ENDED,
        handler: (event) => {
          if (!turnSystem) {
            return;
          }

          turnSystem.setTurnNumber?.(event.detail.turnNumber);
        }
      },
      {
        type: APP_FACT_MOVE_STARTED,
        handler: () => {
          isMoving = true;
          moveStartedAt = now();
        }
      },
      {
        type: APP_FACT_MOVE_FINISHED,
        handler: () => {
          isMoving = false;
          if (!shouldApplyPostMoveGrace) {
            suppressEndTurnUntil = 0;
            return;
          }

          const moveDurationMs = now() - moveStartedAt;
          suppressEndTurnUntil =
            moveDurationMs >= moveDurationThresholdMs ? now() + endTurnPostMoveGraceMs : 0;
        }
      },
      {
        type: APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
        handler: (event) => {
          if (!turnSystem) {
            return;
          }

          const amount = Math.max(0, Math.floor(event.detail.amount ?? 0));
          if (amount < 1) {
            return;
          }

          const didSpendMovementPoints = turnSystem.spendMovementPoints(amount);
          if (!didSpendMovementPoints) {
            return;
          }

          emitTurnState();
        }
      },
      {
        type: APP_COMMAND_END_TURN_REQUESTED,
        handler: () => {
          if (!turnSystem || isMoving || now() < suppressEndTurnUntil) {
            return;
          }

          turnSystem.endTurn();
          emit(APP_FACT_TURN_ENDED, {
            turnNumber: turnSystem.getTurnNumber()
          });
          emitTurnState();
        }
      }
    ]
  };
});
