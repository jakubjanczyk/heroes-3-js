import {
  canShoot,
  getApproaches,
  getFrontHexReach,
  getShotTargets,
  getStackHexes,
  planStackAttack,
  planStackShot
} from './battle.js'
import { getHexDistance } from './battlefield.js'

// A first, simple combat AI: shoot the nearest enemy stack when the stack can, else go for the
// nearest one and attack it, or get as close as this turn allows. The earlier army slot wins ties.
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

function findNearestShotTarget(battle, stack) {
  const distanceTo = ({ stackId }) => {
    const target = battle.stacks.find(({ id }) => id === stackId)
    return Math.min(...getStackHexes(target).map((hex) => getHexDistance(stack.hex, hex)))
  }
  return getShotTargets(battle, stack).reduce((best, target) =>
    distanceTo(target) < distanceTo(best) ? target : best
  )
}

// `{ shot }` with the target and the shots, `{ attack }` with the target, the way there and the
// strikes, `{ path }` for a move, or null when the stack can do nothing and its turn passes.
export function planComputerTurn(battle, stack, { random, luckRandom }) {
  if (canShoot(battle, stack)) {
    const { stackId: targetId } = findNearestShotTarget(battle, stack)
    return { shot: { targetId, ...planStackShot(battle, stack, { targetId, random, luckRandom }) } }
  }

  const approach = findNearestApproach(battle, stack)
  if (!approach) {
    return null
  }

  const { targetId, fromHex, way } = approach
  if (approach.distance <= stack.speed) {
    const attack = planStackAttack(battle, stack, { targetId, fromHex, random, luckRandom })
    return attack && { attack: { targetId, ...attack } }
  }

  const path = stack.flying
    ? planFlightToward(battle, stack, way.at(-1))
    : way.slice(0, stack.speed)
  return path ? { path } : null
}
