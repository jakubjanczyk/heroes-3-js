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

export function registerTurnModule(
  { bus, config },
  {
    createTurnSystem = createTurnSystemDefault
  } = {}
) {
  const maxMovementPoints = config.maxMovementPoints;

  let turnSystem = null;
  let isMoving = false;

  function emitTurnState() {
    if (!turnSystem) {
      return;
    }

    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, {
      value: turnSystem.getRemainingMovementPoints(),
      max: maxMovementPoints
    });
  }

  bus.addEventListener(APP_FACT_WORLD_READY, () => {
    turnSystem = createTurnSystem({ maxMovementPoints });
    emitTurnState();
  });

  bus.addEventListener(APP_FACT_MOVE_STARTED, () => {
    isMoving = true;
  });

  bus.addEventListener(APP_FACT_MOVE_FINISHED, () => {
    isMoving = false;
  });

  bus.addEventListener(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, (event) => {
    if (!turnSystem) {
      return;
    }

    const amount = Math.max(0, Math.floor(event.detail.amount ?? 0));
    if (amount < 1) {
      return;
    }

    turnSystem.spendMovementPoints(amount);
    emitTurnState();
  });

  bus.addEventListener(APP_COMMAND_END_TURN_REQUESTED, () => {
    if (!turnSystem || isMoving) {
      return;
    }

    turnSystem.endTurn();
    bus.emit(APP_FACT_TURN_ENDED, {});
    emitTurnState();
  });
}
