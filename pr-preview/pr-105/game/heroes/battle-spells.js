import { getHeroPrimarySkills } from './primary-skills.js'
import { spellSkillLevel } from './spell-book.js'

// For now a spell is cast in battle only if it does damage to one enemy stack.
export const canCastInBattle = (spell) => Boolean(spell?.kind === 'combat' && spell.damage)

// No skill in the school casts as Basic: the data repeats Basic's base for it.
export function spellDamage({ hero, spell, definitions }) {
  const power = getHeroPrimarySkills({ entity: hero, definitions }).find(
    ({ key }) => key === 'power'
  ).value
  const { base, perPower } = spell.damage
  return base[spellSkillLevel(hero, spell)] + perPower * power
}
