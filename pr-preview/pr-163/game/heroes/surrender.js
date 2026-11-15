import { secondarySkillLevel } from './secondary-skills.js'

const DIPLOMACY_DISCOUNT_PERCENT = Object.freeze({ BASIC: 20, ADVANCED: 40, EXPERT: 60 })

const goldCostOf = ({ creature, count }, definitions) =>
  (definitions?.monsters?.[creature]?.cost?.GOLD_PILE ?? 0) * count

// Half the gold the hero's creatures left would cost to recruit, less Diplomacy's discount. Clones
// aren't paid for.
export function surrenderPrice({ battle, hero, definitions }) {
  const recruitCost = battle.stacks
    .filter((stack) => stack.side === 'attacker' && stack.count > 0 && !stack.cloneOf)
    .reduce((sum, stack) => sum + goldCostOf(stack, definitions), 0)
  const discount = DIPLOMACY_DISCOUNT_PERCENT[secondarySkillLevel(hero, 'DIPLOMACY')] ?? 0
  return Math.floor((Math.floor(recruitCost / 2) * (100 - discount)) / 100)
}
