import { getArmyStrength } from './monster-stacks.js'
import { getHeroPrimarySkills } from './primary-skills.js'
import { builtIn } from './state/towns.js'
import { fortLevelOf } from './town-buildings.js'

// The hero must be stronger by more than a tenth, so a close fight is left alone.
const SAFE_ATTACK_RATIO = 1.1

// By fort level: a Fort's walls count nothing, a Citadel's 4000 and a Castle's 10000.
const WALLS_WORTH = [0, 0, 4000, 10000]

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

// The walls count once for whatever defends the town, and nothing when nobody does.
export function withWalls(state, townId, strength) {
  return strength > 0 ? strength + WALLS_WORTH[fortLevelOf(builtIn(state, townId))] : 0
}
