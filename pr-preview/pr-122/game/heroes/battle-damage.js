import {
  getCreatureDamage,
  getDamageTakenPercent,
  getRetaliationDamagePercent,
  getShotDamagePercent,
  getStackAttack,
  getStackDefense,
  getStackLuck
} from './battle-stats.js'

// Kept in thousandths so the rounding is the game's, not the floating point's.
const ATTACK_BONUS_PER_POINT = 50
const ATTACK_BONUS_CAP = 3000
const DEFENSE_REDUCTION_PER_POINT = 25
const DEFENSE_REDUCTION_CAP = 700
const MOST_ROLLS = 10
// A lucky strike adds +100% next to the attack bonus, not under its cap.
const LUCKY_BONUS = 1000
const LUCK_CHANCE_IN = 24
const NO_LUCK = () => 1
// A shot at a target more than 10 hexes away, and a shooter's melee attack, do half damage.
const HALVED = 500

function applyAttackAndDefense(
  baseDamage,
  { attacker, defender, melee = false, halved = false, lucky = false, dealtPercent = 100 }
) {
  const advantage = getStackAttack(attacker, { melee }) - getStackDefense(defender)
  const bonus =
    Math.min(Math.max(advantage, 0) * ATTACK_BONUS_PER_POINT, ATTACK_BONUS_CAP) +
    (lucky ? LUCKY_BONUS : 0)
  const reduction = Math.min(
    Math.max(-advantage, 0) * DEFENSE_REDUCTION_PER_POINT,
    DEFENSE_REDUCTION_CAP
  )
  const penalty = halved ? HALVED : 1000
  const taken = getDamageTakenPercent(defender, { melee }) * 10
  const dealt = (dealtPercent * (melee ? 100 : getShotDamagePercent(attacker))) / 10
  // In BigInt: a big stack's product of six factors goes past the integers a Number keeps exact.
  const scaled = [baseDamage, 1000 + bonus, 1000 - reduction, penalty, taken, dealt].map(BigInt)
  const damage = scaled.reduce((product, factor) => product * factor) / 1_000_000_000_000_000n
  return Math.max(1, Number(damage))
}

export function getDamageRange({ attacker, defender, melee, halved }) {
  const damage = getCreatureDamage(attacker)
  return {
    min: applyAttackAndDefense(damage.min * attacker.count, {
      attacker,
      defender,
      melee,
      halved
    }),
    max: applyAttackAndDefense(damage.max * attacker.count, {
      attacker,
      defender,
      melee,
      halved
    })
  }
}

// A stack of more than 10 rolls 10 times, scaled to its count.
export function rollDamage({ attacker, defender, random, melee, halved, lucky, dealtPercent }) {
  const { min, max } = getCreatureDamage(attacker)
  const rollCount = Math.min(attacker.count, MOST_ROLLS)
  let sum = 0
  for (let roll = 0; roll < rollCount; roll += 1) {
    sum += min + Math.floor(random() * (max - min + 1))
  }

  const baseDamage =
    attacker.count > MOST_ROLLS ? Math.floor((sum * attacker.count) / MOST_ROLLS) : sum
  return applyAttackAndDefense(baseDamage, {
    attacker,
    defender,
    melee,
    halved,
    lucky,
    dealtPercent
  })
}

// Luck +1 to +3 strikes lucky 1 to 3 times in 24.
const rollsLucky = (stack, luckRandom) => {
  const luck = getStackLuck(stack)
  return luck > 0 && luckRandom() < luck / LUCK_CHANCE_IN
}

function rollStrike({ attacker, defender, random, luckRandom, melee, halved, dealtPercent }) {
  const lucky = rollsLucky(attacker, luckRandom)
  const damage = rollDamage({ attacker, defender, random, melee, halved, lucky, dealtPercent })
  return { attackerId: attacker.id, defenderId: defender.id, damage, ...(lucky ? { lucky } : {}) }
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
export function strikeSequence({ attacker, defender, random, luckRandom = NO_LUCK }) {
  const strikes = []
  const strike = (from, to, dealtPercent = 100) => {
    const rolled = rollStrike({
      attacker: from,
      defender: to,
      random,
      luckRandom,
      melee: true,
      halved: from.meleePenalty,
      dealtPercent
    })
    strikes.push(rolled)
    return takeDamage(to, rolled.damage)
  }

  const target = strike(attacker, defender)
  // A blind stack strikes back weaker, or not at all.
  const retaliationPercent = getRetaliationDamagePercent(defender)
  const retaliates = target.count > 0 && target.retaliationsLeft > 0 && retaliationPercent > 0
  const striker = retaliates ? strike(target, attacker, retaliationPercent) : attacker
  if (attacker.strikes > 1 && striker.count > 0 && target.count > 0) {
    strike(striker, target)
  }

  return strikes
}

// A shot gets no retaliation. Marksmen shoot a second time while the target lives and they have a
// shot left.
export function shotSequence({ attacker, defender, random, luckRandom = NO_LUCK, halved }) {
  const strikes = []
  let target = defender
  for (let shot = 0; shot < Math.min(attacker.shotsPerTurn, attacker.shots); shot += 1) {
    if (target.count === 0) {
      break
    }

    const rolled = rollStrike({ attacker, defender: target, random, luckRandom, halved })
    strikes.push(rolled)
    target = takeDamage(target, rolled.damage)
  }
  return strikes
}
