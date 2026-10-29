import { toMovementPointsOrNull } from '../domain/value-objects/movement-points.js'
import { activePlayer, heroIdsOf, heroMovementPoints, turnNumber } from '../state/queries.js'
import { calendarDateOfTurn } from './calendar.js'

export function decideSpendMovementPoints(state, { heroId, amount }) {
  const movementPoints = heroMovementPoints(state, heroId)
  const stepCount = toMovementPointsOrNull(amount)
  if (!movementPoints || stepCount === null || stepCount < 1 || stepCount > movementPoints.value) {
    return null
  }

  return { heroId, value: movementPoints.value - stepCount, max: movementPoints.max }
}

function weekMovementPointsOn(state, heroId, nextTurnNumber) {
  const isNewWeek = calendarDateOfTurn(nextTurnNumber).day === 1
  return isNewWeek ? 0 : (state.heroDetails?.[heroId]?.weekBonus?.movementPoints ?? 0)
}

// The new day, and every hero of the player whose turn ends back to full movement points, more
// for the rest of the week after the Stables.
export function decideEndTurn(state) {
  const nextTurnNumber = turnNumber(state) + 1
  return {
    turnNumber: nextTurnNumber,
    movementPoints: heroIdsOf(state, activePlayer(state)).map((heroId) => {
      const { max } = heroMovementPoints(state, heroId)
      return { heroId, value: max + weekMovementPointsOn(state, heroId, nextTurnNumber), max }
    })
  }
}
