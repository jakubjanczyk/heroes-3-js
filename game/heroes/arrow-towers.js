import { canShoot, getApproaches, isAlive } from './battle.js'
import { takeDamage } from './battle-damage.js'
import { fightsFor, getDamageTakenPercent, getStackSpeed, isBlind } from './battle-stats.js'
import { isInsideTheWalls, towerOf } from './siege-walls.js'

const healthOf = (stack) => Math.max(0, (stack.count - 1) * stack.health + stack.topHealth)

// The tower's roll is its damage: it has no Attack, and the target's Defense counts for nothing.
const damageTo = (target, roll) =>
  Math.max(1, Math.floor((roll * getDamageTakenPercent(target)) / 100))

const canStrikeOnItsTurn = (battle, stack) =>
  canShoot(battle, stack) ||
  getApproaches(battle, stack).some(({ distance }) => distance <= getStackSpeed(stack))

const killedBy = (stack, damage) => stack.count - takeDamage(stack, damage).count

// The worth lost: the damage, at most all its health, at the worth of a health point, and the
// creatures killed at theirs.
function worthLost(battle, tower, target) {
  const aiValue = battle.definitions?.monsters?.[target.creature]?.aiValue ?? 0
  const least = damageTo(target, tower.damage.min)
  const most = damageTo(target, tower.damage.max)
  const damage = Math.min(healthOf(target), (least + most) / 2)
  const killed = (killedBy(target, least) + killedBy(target, most)) / 2
  return (damage * aiValue) / target.health + killed * aiValue
}

// Each rule in turn: the first that tells two stacks apart settles it.
const PREFERENCES = [
  ({ blind }) => !blind,
  ({ stack }) => !stack.warMachine,
  ({ canStrike }) => canStrike,
  ({ inside }) => inside
]

function isBetter(candidate, best) {
  for (const prefers of PREFERENCES) {
    if (prefers(candidate) !== prefers(best)) {
      return prefers(candidate)
    }
  }
  return candidate.worth > best.worth
}

const targetsOf = (battle) =>
  battle.stacks.filter((stack) => isAlive(stack) && fightsFor(stack) === 'attacker')

// The earlier stack in the attacker's army wins a tie.
export function chooseTowerTarget(battle, tower) {
  return targetsOf(battle)
    .map((stack) => ({
      stack,
      blind: isBlind(stack),
      canStrike: canStrikeOnItsTurn(battle, stack),
      inside: isInsideTheWalls(stack),
      worth: worthLost(battle, tower, stack)
    }))
    .reduce((best, candidate) => (!best || isBetter(candidate, best) ? candidate : best), null)
    ?.stack
}

export function planTowerShot(battle, towerId, random) {
  const tower = towerOf(battle.walls, towerId)
  const target = tower && chooseTowerTarget(battle, tower)
  if (!target) {
    return null
  }
  const { min, max } = tower.damage
  const roll = min + Math.floor(random() * (max - min + 1))
  return { tower: towerId, targetId: target.id, damage: damageTo(target, roll) }
}
