import { spellTargetSide } from './battle-spells.js'
import { fightsFor } from './battle-stats.js'
import { getHexNeighbours, getOccupiedHexes, isSameHex } from './battlefield.js'
import { secondarySkillLevel } from './secondary-skills.js'

const RESISTANCE_PERCENT = Object.freeze({ BASIC: 5, ADVANCED: 10, EXPERT: 20 })

export const heroMagicResistance = (hero) =>
  RESISTANCE_PERCENT[secondarySkillLevel(hero, 'RESISTANCE')] ?? 0

// Every damage spell and every spell that goes on enemy stacks is hostile; Dispel isn't.
export const isResistible = (spell) =>
  Boolean(spell?.damage) || (Boolean(spell?.lasting) && spellTargetSide(spell) !== 'own')

const areNextTo = (stack, other) => {
  const around = getOccupiedHexes(stack).flatMap((hex) =>
    getHexNeighbours(hex, { withEdges: true })
  )
  return getOccupiedHexes(other).some((hex) => around.some((next) => isSameHex(next, hex)))
}

const auraOver = (stacks, stack) =>
  Math.max(
    0,
    ...stacks
      .filter(
        (other) =>
          other.id !== stack.id &&
          other.count > 0 &&
          (other.magicResistanceAura ?? 0) > 0 &&
          fightsFor(other) === fightsFor(stack) &&
          areNextTo(stack, other)
      )
      .map(({ magicResistanceAura }) => magicResistanceAura)
  )

// A stack's own chance and its neighbours' aura are two rolls, in that order.
const resists = (stacks, stack, random) =>
  [stack.magicResistance, auraOver(stacks, stack)]
    .filter((chance) => chance > 0)
    .some((chance) => random() * 100 < chance)

// Each stack the spell reaches rolls in turn, in the battle's stack order.
export const rollResisted = (stacks, reachedIds, random) =>
  stacks
    .filter(({ id }) => reachedIds.includes(id))
    .filter((stack) => resists(stacks, stack, random))
    .map(({ id }) => id)
