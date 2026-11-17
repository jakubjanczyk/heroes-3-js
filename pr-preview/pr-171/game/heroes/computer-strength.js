import { getArmyStrength } from './monster-stacks.js'
import { getHeroPrimarySkills } from './primary-skills.js'

// The hero must be stronger by more than a tenth, so a close fight is left alone.
const SAFE_ATTACK_RATIO = 1.1

export function heroStrength(hero, definitions) {
  const skills = Object.fromEntries(
    getHeroPrimarySkills({ entity: hero, definitions }).map(({ key, value }) => [key, value])
  )
  return (
    getArmyStrength(hero.army, definitions) *
    Math.sqrt((1 + 0.05 * skills.attack) * (1 + 0.05 * skills.defense))
  )
}

export function outmatches(strength, enemyStrength) {
  return strength > enemyStrength * SAFE_ATTACK_RATIO
}

export function canBeat({ hero, enemyArmy, definitions }) {
  return outmatches(heroStrength(hero, definitions), getArmyStrength(enemyArmy, definitions))
}
