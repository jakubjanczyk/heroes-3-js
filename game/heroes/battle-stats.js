const spellEffect = (stack, key) =>
  (stack.spells ?? []).reduce((sum, { effects }) => sum + (effects[key] ?? 0), 0)

export const getStackSpeed = (stack) =>
  Math.floor(
    ((stack.speed + spellEffect(stack, 'speed')) * (100 + spellEffect(stack, 'speedPercent'))) / 100
  )

const hasSpellEffect = (stack, key) =>
  (stack.spells ?? []).some(({ effects }) => effects[key] !== undefined)

export const getStackAttack = (stack, { melee = false } = {}) =>
  Math.max(
    0,
    stack.attack +
      spellEffect(stack, 'attack') +
      spellEffect(stack, melee ? 'meleeAttack' : 'rangedAttack')
  )

export const getStackDefense = (stack) =>
  Math.max(0, stack.defense + (stack.defenseBonus ?? 0) + spellEffect(stack, 'defense'))

export const getDamageTakenPercent = (stack, { melee = false } = {}) =>
  100 + spellEffect(stack, melee ? 'meleeDamageTakenPercent' : 'rangedDamageTakenPercent')

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
