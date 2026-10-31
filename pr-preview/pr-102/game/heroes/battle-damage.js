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

function applyAttackAndDefense(baseDamage, { attacker, defender, halved = false, lucky = false }) {
  const advantage = attacker.attack - defender.defense
  const bonus =
    Math.min(Math.max(advantage, 0) * ATTACK_BONUS_PER_POINT, ATTACK_BONUS_CAP) +
    (lucky ? LUCKY_BONUS : 0)
  const reduction = Math.min(
    Math.max(-advantage, 0) * DEFENSE_REDUCTION_PER_POINT,
    DEFENSE_REDUCTION_CAP
  )
  const penalty = halved ? HALVED : 1000
  return Math.max(
    1,
    Math.floor((baseDamage * (1000 + bonus) * (1000 - reduction) * penalty) / 1_000_000_000)
  )
}

export function getDamageRange({ attacker, defender, halved }) {
  return {
    min: applyAttackAndDefense(attacker.damage.min * attacker.count, {
      attacker,
      defender,
      halved
    }),
    max: applyAttackAndDefense(attacker.damage.max * attacker.count, {
      attacker,
      defender,
      halved
    })
  }
}

// A stack of more than 10 rolls 10 times, scaled to its count.
export function rollDamage({ attacker, defender, random, halved, lucky }) {
  const { min, max } = attacker.damage
  const rollCount = Math.min(attacker.count, MOST_ROLLS)
  let sum = 0
  for (let roll = 0; roll < rollCount; roll += 1) {
    sum += min + Math.floor(random() * (max - min + 1))
  }

  const baseDamage =
    attacker.count > MOST_ROLLS ? Math.floor((sum * attacker.count) / MOST_ROLLS) : sum
  return applyAttackAndDefense(baseDamage, { attacker, defender, halved, lucky })
}

// Luck +1 to +3 strikes lucky 1 to 3 times in 24.
const rollsLucky = (stack, luckRandom) =>
  (stack.luck ?? 0) > 0 && luckRandom() < stack.luck / LUCK_CHANCE_IN

function rollStrike({ attacker, defender, random, luckRandom, halved }) {
  const lucky = rollsLucky(attacker, luckRandom)
  const damage = rollDamage({ attacker, defender, random, halved, lucky })
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
  const strike = (from, to) => {
    const rolled = rollStrike({
      attacker: from,
      defender: to,
      random,
      luckRandom,
      halved: from.meleePenalty
    })
    strikes.push(rolled)
    return takeDamage(to, rolled.damage)
  }

  const target = strike(attacker, defender)
  const striker =
    target.count > 0 && target.retaliationsLeft > 0 ? strike(target, attacker) : attacker
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
