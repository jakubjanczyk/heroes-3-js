import { normalizeMovementPoints, toMovementPointsOrNull } from '../domain/value-objects/movement-points.js';

export function createTurnSystem({
  maxMovementPoints = 15,
  remainingMovementPoints = maxMovementPoints,
  turnNumber = 1
} = {}) {
  const normalizedMaxMovementPoints =
    normalizeMovementPoints(maxMovementPoints, { min: 1, fallback: 15 }) ?? 15;
  const parsedTurnNumber = Number(turnNumber);
  let currentTurnNumber = Math.max(
    1,
    Math.floor(Number.isFinite(parsedTurnNumber) ? parsedTurnNumber : 1)
  );

  let currentRemainingMovementPoints =
    normalizeMovementPoints(remainingMovementPoints, {
      min: 0,
      max: normalizedMaxMovementPoints,
      fallback: normalizedMaxMovementPoints
    }) ?? normalizedMaxMovementPoints;

  function getRemainingMovementPoints() {
    return currentRemainingMovementPoints;
  }

  function getTurnNumber() {
    return currentTurnNumber;
  }

  function canMoveSteps(stepCount) {
    const normalizedStepCount = normalizeMovementPoints(stepCount, {
      min: 0,
      fallback: 0
    });
    if (normalizedStepCount === null || normalizedStepCount === 0) {
      return true;
    }

    return normalizedStepCount <= currentRemainingMovementPoints;
  }

  function spendMovementPoints(stepCount) {
    const normalizedStepCount = normalizeMovementPoints(stepCount, {
      min: 0,
      fallback: 0
    });
    if (normalizedStepCount === null || normalizedStepCount === 0) {
      return true;
    }

    if (!canMoveSteps(stepCount)) {
      return false;
    }
    currentRemainingMovementPoints -= normalizedStepCount;
    return true;
  }

  function endTurn() {
    currentTurnNumber += 1;
    currentRemainingMovementPoints = normalizedMaxMovementPoints;
  }

  function setRemainingMovementPoints(value) {
    const parsedValue = toMovementPointsOrNull(value);
    if (parsedValue === null) {
      return;
    }

    currentRemainingMovementPoints =
      normalizeMovementPoints(parsedValue, {
        min: 0,
        max: normalizedMaxMovementPoints,
        fallback: currentRemainingMovementPoints
      }) ?? currentRemainingMovementPoints;
  }

  function setTurnNumber(value) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    currentTurnNumber = Math.max(1, Math.floor(parsedValue));
  }

  return {
    getRemainingMovementPoints,
    getTurnNumber,
    canMoveSteps,
    spendMovementPoints,
    endTurn,
    setRemainingMovementPoints,
    setTurnNumber
  };
}
