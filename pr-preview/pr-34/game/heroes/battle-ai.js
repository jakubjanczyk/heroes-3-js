import { getApproaches, getFrontHexReach, planStackAttack } from './battle.js'
import { getHexDistance } from './battlefield.js'

// A first, simple combat AI: go for the nearest enemy stack (the earlier army slot on a tie) and
// attack it, or get as close as this turn allows.
function findNearestApproach(battle, stack) {
  const approaches = getApproaches(battle, stack)
  if (approaches.length === 0) {
    return null
  }

  return approaches.reduce((best, approach) =>
    approach.distance < best.distance ? approach : best
  )
}

function planFlightToward(battle, stack, goal) {
  let nearest = null
  let nearestDistance = getHexDistance(stack.hex, goal)
  for (const hex of getFrontHexReach(battle, stack)) {
    const distance = getHexDistance(hex, goal)
    if (distance < nearestDistance) {
      nearest = hex
      nearestDistance = distance
    }
  }
  return nearest ? [nearest] : null
}

// `{ attack }` with the target, the way there and the strikes, `{ path }` for a move, or null when
// the stack can do nothing and its turn passes.
export function planComputerTurn(battle, stack, { random }) {
  const approach = findNearestApproach(battle, stack)
  if (!approach) {
    return null
  }

  const { targetId, fromHex, way } = approach
  if (approach.distance <= stack.speed) {
    const attack = planStackAttack(battle, stack, { targetId, fromHex, random })
    return attack && { attack: { targetId, ...attack } }
  }

  const path = stack.flying
    ? planFlightToward(battle, stack, way.at(-1))
    : way.slice(0, stack.speed)
  return path ? { path } : null
}
