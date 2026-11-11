import { spellTargetSide } from './battle-spells.js'
import { secondarySkillLevel } from './secondary-skills.js'

const RESISTANCE_PERCENT = Object.freeze({ BASIC: 5, ADVANCED: 10, EXPERT: 20 })

export const heroMagicResistance = (hero) =>
  RESISTANCE_PERCENT[secondarySkillLevel(hero, 'RESISTANCE')] ?? 0

// Every damage spell and every spell that goes on enemy stacks is hostile; Dispel isn't.
export const isResistible = (spell) =>
  Boolean(spell?.damage) || (Boolean(spell?.lasting) && spellTargetSide(spell) !== 'own')

// Each stack the spell reaches with a chance to resist rolls in turn, in the battle's stack order.
export function rollResisted(stacks, reachedIds, random) {
  return stacks
    .filter(({ id, magicResistance }) => reachedIds.includes(id) && magicResistance > 0)
    .filter(({ magicResistance }) => random() * 100 < magicResistance)
    .map(({ id }) => id)
}
