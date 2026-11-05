const spellEffect = (stack, key) =>
  (stack.spells ?? []).reduce((sum, { effects }) => sum + (effects[key] ?? 0), 0)

export const getStackSpeed = (stack) =>
  Math.floor(
    ((stack.speed + spellEffect(stack, 'speed')) * (100 + spellEffect(stack, 'speedPercent'))) / 100
  )

const hasSpellEffect = (stack, key) =>
  (stack.spells ?? []).some(({ effects }) => effects[key] !== undefined)

export const isBerserk = (stack) => hasSpellEffect(stack, 'berserk')

const OTHER_SIDE = { attacker: 'defender', defender: 'attacker' }

export const fightsFor = (stack) =>
  hasSpellEffect(stack, 'hypnotized') ? OTHER_SIDE[stack.side] : stack.side

export const areEnemies = (stack, other) => fightsFor(stack) !== fightsFor(other)

export const isBlind = (stack) => hasSpellEffect(stack, 'blind')

export const getRetaliationsLeft = (stack) =>
  Math.max(
    0,
    stack.retaliationsPerRound + spellEffect(stack, 'extraRetaliations') - stack.retaliationsUsed
  )

export const getRetaliationDamagePercent = (stack) =>
  100 + spellEffect(stack, 'retaliationDamagePercent')

const getDefenseBeforeFrenzy = (stack) =>
  Math.max(0, stack.defense + (stack.defenseBonus ?? 0) + spellEffect(stack, 'defense'))

const isFrenzied = (stack) => hasSpellEffect(stack, 'attackFromDefensePercent')

// Frenzy turns the stack's Defense into Attack and leaves it with none.
const frenzyAttack = (stack) =>
  Math.floor((getDefenseBeforeFrenzy(stack) * spellEffect(stack, 'attackFromDefensePercent')) / 100)

// Slayer reaches the kings of more groups as the school's skill grows.
const slayerAttack = (stack, target) =>
  target?.king && target.king <= spellEffect(stack, 'kingsReached')
    ? spellEffect(stack, 'attackAgainstKings')
    : 0

export const getStackAttack = (stack, { melee = false, against = null } = {}) =>
  Math.max(
    0,
    stack.attack +
      spellEffect(stack, 'attack') +
      spellEffect(stack, melee ? 'meleeAttack' : 'rangedAttack') +
      frenzyAttack(stack) +
      slayerAttack(stack, against)
  )

export const getStackDefense = (stack) => (isFrenzied(stack) ? 0 : getDefenseBeforeFrenzy(stack))

export const getShotDamagePercent = (stack) =>
  Math.max(0, 100 + spellEffect(stack, 'shotDamagePercent'))

export const getDamageTakenPercent = (stack, { melee = false } = {}) =>
  100 + spellEffect(stack, melee ? 'meleeDamageTakenPercent' : 'rangedDamageTakenPercent')

// Only the first of the spell's schools the stack is protected from counts.
export function getSpellDamageTakenPercent(stack, schools) {
  const protection = schools
    .map((school) => `${school.toLowerCase()}SpellDamageTakenPercent`)
    .find((key) => hasSpellEffect(stack, key))
  return 100 + (protection ? spellEffect(stack, protection) : 0)
}

// Each creature's damage: Bless makes it the maximum and Curse the minimum, each shifted by its
// skill level's bonus, never below 1.
export function getCreatureDamage(stack) {
  const shift = spellEffect(stack, 'maximumDamage') + spellEffect(stack, 'minimumDamage')
  const min = Math.max(1, stack.damage.min + shift)
  const max = Math.max(1, stack.damage.max + shift)
  const blessed = hasSpellEffect(stack, 'maximumDamage')
  const cursed = hasSpellEffect(stack, 'minimumDamage')
  if (blessed === cursed) {
    return { min, max }
  }
  return blessed ? { min: max, max } : { min, max: min }
}

// A stack under helpful spells only, or harmful ones only: the hero casts the helpful ones on
// own stacks and the harmful ones on the enemy's.
export function getSpellBalance(stack) {
  if (!stack.spells?.length) {
    return null
  }
  return stack.spells.some(({ helpful }) => helpful) ? 'helpful' : 'harmful'
}

const MORALE_AND_LUCK_LIMIT = 3

const withSpells = (stack, kind) =>
  (stack[kind] ?? 0) + (stack.cancelledInBattle?.includes(kind) ? 0 : spellEffect(stack, kind))

const withinLimits = (value) =>
  Math.max(-MORALE_AND_LUCK_LIMIT, Math.min(MORALE_AND_LUCK_LIMIT, value))

export const getStackMorale = (stack) =>
  stack.unaffectedByMorale ? 0 : withinLimits(withSpells(stack, 'morale'))

// There is no bad luck: luck below 0 does nothing.
export const getStackLuck = (stack) => Math.max(0, withinLimits(withSpells(stack, 'luck')))
