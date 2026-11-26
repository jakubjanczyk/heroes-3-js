import {
  canShoot,
  chooseHealTarget,
  getApproaches,
  getFrontHexReach,
  getShotTargets,
  getStackHexes,
  getWayThisTurn,
  planStackAttack,
  planStackHeal,
  planStackShot
} from './battle.js'
import { getMovementRange } from './battle-stats.js'
import { getHexDistance } from './battlefield.js'
import { chooseSelfAimedTarget } from './self-aimed-shots.js'

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

function chooseWarMachineTarget(battle, stack) {
  const targets = getShotTargets(battle, stack).map(({ stackId, damage }) => ({
    stack: battle.stacks.find(({ id }) => id === stackId),
    damage
  }))
  return { stackId: chooseSelfAimedTarget(battle, targets).id }
}

function findShotTarget(battle, stack) {
  return stack.warMachine
    ? chooseWarMachineTarget(battle, stack)
    : findNearestShotTarget(battle, stack)
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

function planHeal(battle, stack, { random }) {
  const target = chooseHealTarget(battle, stack)
  return target ? { heal: planStackHeal(battle, stack, { targetId: target.id, random }) } : null
}

// `{ shot }` with the target and the shots, `{ attack }` with the target, the way there and the
// strikes, `{ heal }` with the target and the health, `{ path }` for a move, or null when the
// stack can do nothing and its turn passes.
export function planComputerTurn(battle, stack, rolls) {
  if (stack.healing > 0) {
    return planHeal(battle, stack, rolls)
  }
  if (canShoot(battle, stack)) {
    const { stackId: targetId } = findShotTarget(battle, stack)
    return { shot: { targetId, ...planStackShot(battle, stack, { targetId, ...rolls }) } }
  }

  const approach = findNearestApproach(battle, stack)
  if (!approach) {
    return null
  }

  const { targetId, fromHex, way } = approach
  if (approach.distance <= getMovementRange(stack)) {
    const attack = planStackAttack(battle, stack, { targetId, fromHex, ...rolls })
    if (attack) {
      return { attack: { targetId, ...attack } }
    }
  }

  // A walking stack whose way crosses the moat stops in it.
  const path = stack.flying
    ? planFlightToward(battle, stack, way.at(-1))
    : getWayThisTurn(battle, stack, way)
  return path?.length > 0 ? { path } : null
}
