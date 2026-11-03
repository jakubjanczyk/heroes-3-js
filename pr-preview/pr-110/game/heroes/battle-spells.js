// For now a spell is cast in battle if it does damage to one enemy stack or lasts on one stack.
export const canCastInBattle = (spell) =>
  Boolean(spell?.kind === 'combat' && (spell.damage || spell.lasting))

// A damage spell hits an enemy stack; a lasting spell says whose stack it goes on.
export const spellTargetSide = (spell) => spell?.lasting?.target ?? 'enemy'

export const isHelpful = (spell) => spellTargetSide(spell) === 'own'

export const spellTargeting = (spell) => ({
  targetSide: spellTargetSide(spell),
  shootersOnly: Boolean(spell?.lasting?.shootersOnly)
})

export function isSpellTarget({ targetSide, shootersOnly }, target, casterSide) {
  const isOwn = target.side === casterSide
  return isOwn === (targetSide === 'own') && (!shootersOnly || target.shooter)
}
