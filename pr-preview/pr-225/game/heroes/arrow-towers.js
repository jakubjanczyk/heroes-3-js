import { isAlive } from './battle.js'
import { fightsFor, getDamageTakenPercent } from './battle-stats.js'
import { chooseSelfAimedTarget } from './self-aimed-shots.js'
import { towerOf } from './siege-walls.js'

// The tower's roll is its damage: it has no Attack, and the target's Defense counts for nothing.
const damageTo = (target, roll) =>
  Math.max(1, Math.floor((roll * getDamageTakenPercent(target)) / 100))

const targetsOf = (battle) =>
  battle.stacks.filter((stack) => isAlive(stack) && fightsFor(stack) === 'attacker')

const NO_BONUS = { min: 0, max: 0 }

export function towerWithStructures(tower, structures) {
  const counted = tower.halfTheStructures ? Math.floor(structures / 2) : structures
  const { min, max } = tower.perStructure ?? NO_BONUS
  return {
    ...tower,
    damage: { min: tower.damage.min + min * counted, max: tower.damage.max + max * counted }
  }
}

const damageRangeTo = (target, { min, max }) => ({
  min: damageTo(target, min),
  max: damageTo(target, max)
})

const chooseTowerTarget = (battle, tower) =>
  chooseSelfAimedTarget(
    battle,
    targetsOf(battle).map((stack) => ({ stack, damage: damageRangeTo(stack, tower.damage) }))
  )

export const getTowerTargets = (battle, towerId) => {
  const tower = towerOf(battle.walls, towerId)
  return targetsOf(battle).map((stack) => ({
    stackId: stack.id,
    damage: damageRangeTo(stack, tower.damage)
  }))
}

const aimedTarget = (battle, targetId) => targetsOf(battle).find(({ id }) => id === targetId)

export function planTowerShot(battle, towerId, random, aimedAt = null) {
  const tower = towerOf(battle.walls, towerId)
  const target =
    tower && (aimedAt ? aimedTarget(battle, aimedAt) : chooseTowerTarget(battle, tower))
  if (!target) {
    return null
  }
  const { min, max } = tower.damage
  const roll = min + Math.floor(random() * (max - min + 1))
  return { tower: towerId, targetId: target.id, damage: damageTo(target, roll) }
}
