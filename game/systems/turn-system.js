export function createTurnSystem({ maxMovementPoints = 15 } = {}) {
  let remainingMovementPoints = maxMovementPoints;

  function getRemainingMovementPoints() {
    return remainingMovementPoints;
  }

  function canMoveSteps(stepCount) {
    if (stepCount <= 0) {
      return true;
    }
    return stepCount <= remainingMovementPoints;
  }

  function spendMovementPoints(stepCount) {
    if (!canMoveSteps(stepCount)) {
      return false;
    }
    remainingMovementPoints -= stepCount;
    return true;
  }

  function endTurn() {
    remainingMovementPoints = maxMovementPoints;
  }

  return {
    getRemainingMovementPoints,
    canMoveSteps,
    spendMovementPoints,
    endTurn
  };
}
