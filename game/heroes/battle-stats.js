const spellEffect = (stack, key) =>
  (stack.spells ?? []).reduce((sum, { effects }) => sum + (effects[key] ?? 0), 0)

export const getStackSpeed = (stack) =>
  Math.floor(
    ((stack.speed + spellEffect(stack, 'speed')) * (100 + spellEffect(stack, 'speedPercent'))) / 100
  )

export const getStackAttack = (stack, { melee = false } = {}) =>
  stack.attack + spellEffect(stack, 'attack') + (melee ? spellEffect(stack, 'meleeAttack') : 0)

export const getStackDefense = (stack) =>
  stack.defense + (stack.defenseBonus ?? 0) + spellEffect(stack, 'defense')

export const getMeleeDamageTakenPercent = (stack) =>
  100 + spellEffect(stack, 'meleeDamageTakenPercent')

// A stack under helpful spells only, or harmful ones only: the hero casts the helpful ones on
// own stacks and the harmful ones on the enemy's.
export function getSpellBalance(stack) {
  if (!stack.spells?.length) {
    return null
  }
  return stack.spells.some(({ helpful }) => helpful) ? 'helpful' : 'harmful'
}
