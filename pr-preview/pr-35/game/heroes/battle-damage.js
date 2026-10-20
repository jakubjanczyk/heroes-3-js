// Heroes 3 melee damage (VCMI `damageCalculator.lua`, `BattleInfo::getActualDamage`).
// Kept in thousandths so the rounding is the game's, not the floating point's.
const ATTACK_BONUS_PER_POINT = 50
const ATTACK_BONUS_CAP = 3000
const DEFENSE_REDUCTION_PER_POINT = 25
const DEFENSE_REDUCTION_CAP = 700
const MOST_ROLLS = 10

function applyAttackAndDefense(baseDamage, { attacker, defender }) {
  const advantage = attacker.attack - defender.defense
  const bonus = Math.min(Math.max(advantage, 0) * ATTACK_BONUS_PER_POINT, ATTACK_BONUS_CAP)
  const reduction = Math.min(
    Math.max(-advantage, 0) * DEFENSE_REDUCTION_PER_POINT,
    DEFENSE_REDUCTION_CAP
  )
  return Math.max(1, Math.floor((baseDamage * (1000 + bonus) * (1000 - reduction)) / 1_000_000))
}

export function getDamageRange({ attacker, defender }) {
  return {
    min: applyAttackAndDefense(attacker.damage.min * attacker.count, { attacker, defender }),
    max: applyAttackAndDefense(attacker.damage.max * attacker.count, { attacker, defender })
  }
}

// A stack of more than 10 rolls 10 times, scaled to its count.
export function rollDamage({ attacker, defender, random }) {
  const { min, max } = attacker.damage
  const rollCount = Math.min(attacker.count, MOST_ROLLS)
  let sum = 0
  for (let roll = 0; roll < rollCount; roll += 1) {
    sum += min + Math.floor(random() * (max - min + 1))
  }

  const baseDamage =
    attacker.count > MOST_ROLLS ? Math.floor((sum * attacker.count) / MOST_ROLLS) : sum
  return applyAttackAndDefense(baseDamage, { attacker, defender })
}

// The wounded top creature takes the damage first; what is left over wounds the next one.
export function takeDamage(stack, damage) {
  const healthLeft = Math.max(0, (stack.count - 1) * stack.health + stack.topHealth - damage)
  const count = Math.ceil(healthLeft / stack.health)
  return {
    ...stack,
    count,
    topHealth: count > 0 ? healthLeft - (count - 1) * stack.health : 0
  }
}

// Attack, retaliation, then the second strike of a creature that strikes twice (Crusaders).
export function strikeSequence({ attacker, defender, random }) {
  const strikes = []
  const strike = (from, to) => {
    const damage = rollDamage({ attacker: from, defender: to, random })
    strikes.push({ attackerId: from.id, defenderId: to.id, damage })
    return takeDamage(to, damage)
  }

  const target = strike(attacker, defender)
  const striker =
    target.count > 0 && target.retaliationsLeft > 0 ? strike(target, attacker) : attacker
  if (attacker.strikes > 1 && striker.count > 0 && target.count > 0) {
    strike(striker, target)
  }

  return strikes
}
