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
  planStackShot,
  resolveAttack,
  resolveShot
} from './battle.js'
import { areEnemies, getMovementRange, isBerserk } from './battle-stats.js'
import { healthOf, worthOfLoss } from './battle-worth.js'
import { getHexDistance } from './battlefield.js'
import { chooseSelfAimedTarget } from './self-aimed-shots.js'

// An attack is weighed as the average of its outcome with every damage roll at its lowest and at
// its highest, with no luck and nothing left to chance (an ability cast on a hit, a Resistance
// roll).
const NOTHING_BY_CHANCE = { luckRandom: () => 1, abilityRandom: () => 1, resistanceRandom: () => 1 }
const WEIGHING_ROLLS = [
  { random: () => 0, ...NOTHING_BY_CHANCE },
  { random: () => 0.999999, ...NOTHING_BY_CHANCE }
]

const averageOf = (values) => values.reduce((sum, value) => sum + value, 0) / values.length

function worthLostBy(battle, before, after) {
  const now = after.stacks.find(({ id }) => id === before.id)
  const left = now ?? { ...before, count: 0, topHealth: 0 }
  return worthOfLoss(battle, before, {
    damage: healthOf(before) - healthOf(left),
    killed: before.count - left.count
  })
}

// What the other side loses, less what the stack's own side loses.
function worthOfOutcome(battle, stack, after) {
  return battle.stacks
    .filter(({ count }) => count > 0)
    .reduce((worth, other) => {
      const lost = worthLostBy(battle, other, after)
      return areEnemies(other, stack) ? worth + lost : worth - lost
    }, 0)
}

const isWorthMore = (candidate, best) =>
  !best ||
  candidate.worth > best.worth ||
  (candidate.worth === best.worth && candidate.distance < best.distance)

const mostWorth = (candidates) =>
  candidates.reduce((best, candidate) => (isWorthMore(candidate, best) ? candidate : best), null)

function weighAttack(battle, stack, { targetId, fromHex, distance }) {
  const attacks = WEIGHING_ROLLS.map((rolls) =>
    planStackAttack(battle, stack, { targetId, fromHex, ...rolls })
  )
  if (!attacks[0]) {
    return null
  }
  const worth = averageOf(
    attacks.map((attack) =>
      worthOfOutcome(
        battle,
        stack,
        resolveAttack(battle, { stackId: stack.id, targetId, ...attack })
      )
    )
  )
  return { targetId, fromHex, distance, worth }
}

function findAttackWorthMost(battle, stack) {
  const range = getMovementRange(stack)
  return mostWorth(
    getApproaches(battle, stack)
      .filter(({ distance }) => distance <= range)
      .map((approach) => weighAttack(battle, stack, approach))
      .filter(Boolean)
  )
}

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
  if (stack.warMachine) {
    return chooseWarMachineTarget(battle, stack)
  }
  return isBerserk(stack) ? findNearestShotTarget(battle, stack) : findShotWorthMost(battle, stack)
}

const shotDistance = (battle, stack, { stackId }) => {
  const target = battle.stacks.find(({ id }) => id === stackId)
  return Math.min(...getStackHexes(target).map((hex) => getHexDistance(stack.hex, hex)))
}

function findNearestShotTarget(battle, stack) {
  return getShotTargets(battle, stack).reduce((best, target) =>
    shotDistance(battle, stack, target) < shotDistance(battle, stack, best) ? target : best
  )
}

function weighShot(battle, stack, { stackId: targetId }) {
  const worth = averageOf(
    WEIGHING_ROLLS.map((rolls) => {
      const shot = planStackShot(battle, stack, { targetId, ...rolls })
      return worthOfOutcome(battle, stack, resolveShot(battle, { stackId: stack.id, ...shot }))
    })
  )
  return { stackId: targetId, distance: shotDistance(battle, stack, { stackId: targetId }), worth }
}

const findShotWorthMost = (battle, stack) =>
  mostWorth(getShotTargets(battle, stack).map((target) => weighShot(battle, stack, target)))

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

  const attack = isBerserk(stack) ? null : planAttackWorthMost(battle, stack, rolls)
  return attack ?? planNearestAttackOrMove(battle, stack, rolls)
}

function planAttackWorthMost(battle, stack, rolls) {
  const best = findAttackWorthMost(battle, stack)
  if (!best) {
    return null
  }
  const { targetId, fromHex } = best
  const attack = planStackAttack(battle, stack, { targetId, fromHex, ...rolls })
  return attack ? { attack: { targetId, ...attack } } : null
}

// A berserk stack attacks the nearest stack; any other stack with nobody in reach goes toward
// the nearest enemy.
function planNearestAttackOrMove(battle, stack, rolls) {
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
