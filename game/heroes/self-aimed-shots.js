import { canShoot, getApproaches } from './battle.js'
import { takeDamage } from './battle-damage.js'
import { getMovementRange, isBlind } from './battle-stats.js'
import { isInsideTheWalls } from './siege-walls.js'

const healthOf = (stack) => Math.max(0, (stack.count - 1) * stack.health + stack.topHealth)

const canStrikeOnItsTurn = (battle, stack) =>
  canShoot(battle, stack) ||
  getApproaches(battle, stack).some(({ distance }) => distance <= getMovementRange(stack))

const killedBy = (stack, damage) => stack.count - takeDamage(stack, damage).count

// The worth lost: the damage, at most all its health, at the worth of a health point, and the
// creatures killed at theirs.
function worthLost(battle, target, { min, max }) {
  const aiValue = battle.definitions?.monsters?.[target.creature]?.aiValue ?? 0
  const damage = Math.min(healthOf(target), (min + max) / 2)
  const killed = (killedBy(target, min) + killedBy(target, max)) / 2
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

// What an arrow tower or a Ballista aiming itself shoots at, among `targets`, each with the damage
// the shot would do to it. The earlier one wins a tie.
export function chooseSelfAimedTarget(battle, targets) {
  return targets
    .map(({ stack, damage }) => ({
      stack,
      blind: isBlind(stack),
      canStrike: canStrikeOnItsTurn(battle, stack),
      inside: isInsideTheWalls(stack),
      worth: worthLost(battle, stack, damage)
    }))
    .reduce((best, candidate) => (!best || isBetter(candidate, best) ? candidate : best), null)
    ?.stack
}
