import {
  normalizeMovementPoints,
  toMovementPointsOrNull
} from '../domain/value-objects/movement-points.js'

const DEFAULT_MAX_MOVEMENT_POINTS = 1500

export function createTurnState({ maxMovementPoints = DEFAULT_MAX_MOVEMENT_POINTS } = {}) {
  const max =
    normalizeMovementPoints(maxMovementPoints, { min: 1, fallback: DEFAULT_MAX_MOVEMENT_POINTS }) ??
    DEFAULT_MAX_MOVEMENT_POINTS

  return {
    maxMovementPoints: max,
    remainingMovementPoints: max,
    turnNumber: 1
  }
}

export function decideSpendMovementPoints(state, amount) {
  const stepCount = toMovementPointsOrNull(amount)
  if (stepCount === null || stepCount < 1 || stepCount > state.remainingMovementPoints) {
    return null
  }

  return { remainingMovementPoints: state.remainingMovementPoints - stepCount }
}

export function decideEndTurn(state) {
  return {
    turnNumber: state.turnNumber + 1,
    remainingMovementPoints: state.maxMovementPoints
  }
}

export function applyMovementPointsChanged(state, value) {
  const remaining = toMovementPointsOrNull(value)
  if (remaining === null) {
    return state
  }

  return {
    ...state,
    remainingMovementPoints: Math.max(0, Math.min(state.maxMovementPoints, remaining))
  }
}

export function applyTurnEnded(state, turnNumber) {
  const parsed = Number(turnNumber)
  if (!Number.isFinite(parsed)) {
    return state
  }

  return { ...state, turnNumber: Math.max(1, Math.floor(parsed)) }
}
