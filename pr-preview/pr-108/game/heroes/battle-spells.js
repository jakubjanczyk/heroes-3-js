// For now a spell is cast in battle only if it does damage to one enemy stack.
export const canCastInBattle = (spell) => Boolean(spell?.kind === 'combat' && spell.damage)
