export function createTurnSystem({
  maxMovementPoints = 15,
  remainingMovementPoints = maxMovementPoints,
  turnNumber = 1
} = {}) {
  const parsedTurnNumber = Number(turnNumber);
  let currentTurnNumber = Math.max(
    1,
    Math.floor(Number.isFinite(parsedTurnNumber) ? parsedTurnNumber : 1)
  );

  const parsedRemainingMovementPoints = Number(remainingMovementPoints);
  const initialRemainingMovementPoints = Number.isFinite(parsedRemainingMovementPoints)
    ? parsedRemainingMovementPoints
    : maxMovementPoints;
  let currentRemainingMovementPoints = Math.max(
    0,
    Math.min(maxMovementPoints, Math.floor(initialRemainingMovementPoints))
  );

  function getRemainingMovementPoints() {
    return currentRemainingMovementPoints;
  }

  function getTurnNumber() {
    return currentTurnNumber;
  }

  function canMoveSteps(stepCount) {
    if (stepCount <= 0) {
      return true;
    }
    return stepCount <= currentRemainingMovementPoints;
  }

  function spendMovementPoints(stepCount) {
    if (!canMoveSteps(stepCount)) {
      return false;
    }
    currentRemainingMovementPoints -= stepCount;
    return true;
  }

  function endTurn() {
    currentTurnNumber += 1;
    currentRemainingMovementPoints = maxMovementPoints;
  }

  function setRemainingMovementPoints(value) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    currentRemainingMovementPoints = Math.max(0, Math.min(maxMovementPoints, Math.floor(parsedValue)));
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
