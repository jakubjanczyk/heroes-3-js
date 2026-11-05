import { fightsFor, getSpellLevelImmunity, isBerserk, isHypnotized } from './battle-stats.js'

// A combat spell does damage, lasts on stacks, removes their spells or heals them; each of the last
// three says whose stacks it goes on and whether it hits all of them at Expert.
export const castRuleOf = (spell) => spell?.lasting ?? spell?.removesSpells ?? spell?.heals

export const canCastInBattle = (spell) =>
  Boolean(
    spell?.kind === 'combat' &&
      (spell.damage || spell.teleports || spell.clones || castRuleOf(spell))
  )

// A damage spell hits an enemy stack, unless it hits the whole battlefield.
export function spellTargetSide(spell, skillLevel = 0) {
  if (spell?.targets) {
    return 'any'
  }
  if (spell?.removesSpells) {
    return spell.removesSpells.targets[skillLevel]
  }
  if (spell?.teleports || spell?.clones) {
    return 'own'
  }
  return castRuleOf(spell)?.target ?? 'enemy'
}

export const isHelpful = (spell) => spellTargetSide(spell) === 'own'

const isHurt = (stack) => stack.topHealth < stack.health

export const hasRemovableSpell = (stack) =>
  (stack.spells ?? []).some(({ removable }) => removable !== false)

// An area that grows with the school's skill is given for each skill level.
export const spellArea = (spell, skillLevel) =>
  (Array.isArray(spell?.area) ? spell.area[skillLevel] : spell?.area) ?? null

// A health limit is worked out for every creature at full health, a wounded one too.
const stackHealth = (stack) => stack.count * stack.health

export const spellTargeting = (spell, skillLevel, { healthBelow = null } = {}) => ({
  area: spellArea(spell, skillLevel),
  // A spell that only goes on stacks needs one in its area; a damage spell may hit nothing.
  areaNeedsTarget: Boolean(spell?.lasting && spell.area),
  healthBelow,
  targetSide: spellTargetSide(spell, skillLevel),
  shootersOnly: Boolean(spell?.lasting?.shootersOnly),
  hurtOnly: Boolean(spell?.heals),
  withRemovableSpellOnly: Boolean(spell?.removesSpells),
  notOnUndead: Boolean(spell?.notOnUndead),
  mind: Boolean(spell?.mind),
  notOnHypnotized: Boolean(spell?.notOnHypnotized),
  teleports: Boolean(spell?.teleports),
  highestTierCloned: spell?.clones?.highestTier[skillLevel] ?? null,
  spellLevel: spell?.level ?? 0,
  ignoresSpellLevelImmunity: Boolean(spell?.ignoresSpellLevelImmunity)
})

// Only one clone of a stack at a time, and never a clone of a clone.
const canBeCloned = (target, highestTier) =>
  !target.cloneOf && !target.cloneId && target.tier <= highestTier

const isOnTargetSide = (targetSide, target, casterSide) =>
  targetSide === 'any' || (fightsFor(target) === casterSide) === (targetSide === 'own')

// Anti-Magic turns away every spell of its level or lower, the hero's own too.
export const isImmuneTo = (targeting, target) =>
  (targeting.notOnUndead && target.undead) ||
  (targeting.mind && target.mindSpellImmune) ||
  (!targeting.ignoresSpellLevelImmunity && targeting.spellLevel <= getSpellLevelImmunity(target))

export function isSpellTarget(targeting, target, casterSide) {
  return (
    isOnTargetSide(targeting.targetSide, target, casterSide) &&
    !isImmuneTo(targeting, target) &&
    (!targeting.notOnHypnotized || !isHypnotized(target)) &&
    // A berserk stack is no one's to move: it goes for the nearest stack.
    (!(targeting.teleports || targeting.highestTierCloned) || !isBerserk(target)) &&
    (!targeting.highestTierCloned || canBeCloned(target, targeting.highestTierCloned)) &&
    (!targeting.shootersOnly || target.shooter) &&
    (!targeting.hurtOnly || isHurt(target)) &&
    (!targeting.withRemovableSpellOnly || hasRemovableSpell(target)) &&
    (!targeting.healthBelow || stackHealth(target) < targeting.healthBelow)
  )
}
