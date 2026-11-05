import { fightsFor } from './battle-stats.js'

// A combat spell does damage, lasts on stacks, removes their spells or heals them; each of the last
// three says whose stacks it goes on and whether it hits all of them at Expert.
export const castRuleOf = (spell) => spell?.lasting ?? spell?.removesSpells ?? spell?.heals

export const canCastInBattle = (spell) =>
  Boolean(spell?.kind === 'combat' && (spell.damage || castRuleOf(spell)))

// A damage spell hits an enemy stack, unless it hits the whole battlefield.
export function spellTargetSide(spell, skillLevel = 0) {
  if (spell?.targets) {
    return 'any'
  }
  if (spell?.removesSpells) {
    return spell.removesSpells.targets[skillLevel]
  }
  return castRuleOf(spell)?.target ?? 'enemy'
}

export const isHelpful = (spell) => spellTargetSide(spell) === 'own'

const isHurt = (stack) => stack.topHealth < stack.health

export const hasRemovableSpell = (stack) =>
  (stack.spells ?? []).some(({ removable }) => removable !== false)

export const spellTargeting = (spell, skillLevel) => ({
  area: spell?.area ?? null,
  targetSide: spellTargetSide(spell, skillLevel),
  shootersOnly: Boolean(spell?.lasting?.shootersOnly),
  hurtOnly: Boolean(spell?.heals),
  withRemovableSpellOnly: Boolean(spell?.removesSpells),
  notOnUndead: Boolean(spell?.notOnUndead)
})

const isOnTargetSide = (targetSide, target, casterSide) =>
  targetSide === 'any' || (fightsFor(target) === casterSide) === (targetSide === 'own')

export function isSpellTarget(targeting, target, casterSide) {
  return (
    isOnTargetSide(targeting.targetSide, target, casterSide) &&
    (!targeting.shootersOnly || target.shooter) &&
    (!targeting.hurtOnly || isHurt(target)) &&
    (!targeting.withRemovableSpellOnly || hasRemovableSpell(target)) &&
    (!targeting.notOnUndead || !target.undead)
  )
}
