import {
  APP_COMMAND_END_TURN_REQUESTED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_TURN_ENDED
} from '../events.js';

export function registerTurnController({ bus, turnSystem, maxMovementPoints }) {
  let isMoving = false;

  bus.addEventListener(APP_FACT_MOVE_STARTED, () => {
    isMoving = true;
  });

  bus.addEventListener(APP_FACT_MOVE_FINISHED, () => {
    isMoving = false;
  });

  bus.addEventListener(APP_COMMAND_END_TURN_REQUESTED, () => {
    if (isMoving) {
      return;
    }

    turnSystem.endTurn();
    bus.emit(APP_FACT_TURN_ENDED, {});
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, {
      value: turnSystem.getRemainingMovementPoints(),
      max: maxMovementPoints
    });
  });
}
