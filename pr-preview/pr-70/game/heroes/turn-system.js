import { toMovementPointsOrNull } from '../domain/value-objects/movement-points.js'
import { activePlayer, heroIdsOf, heroMovementPoints, turnNumber } from '../state/queries.js'

export function decideSpendMovementPoints(state, { heroId, amount }) {
  const movementPoints = heroMovementPoints(state, heroId)
  const stepCount = toMovementPointsOrNull(amount)
  if (!movementPoints || stepCount === null || stepCount < 1 || stepCount > movementPoints.value) {
    return null
  }

  return { heroId, value: movementPoints.value - stepCount, max: movementPoints.max }
}

// The new day, and every hero of the player whose turn ends back to full movement points.
export function decideEndTurn(state) {
  return {
    turnNumber: turnNumber(state) + 1,
    movementPoints: heroIdsOf(state, activePlayer(state)).map((heroId) => {
      const { max } = heroMovementPoints(state, heroId)
      return { heroId, value: max, max }
    })
  }
}
