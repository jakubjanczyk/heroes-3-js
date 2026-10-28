const MAX_MORALE = 3
const MIN_MORALE = -3
const MAX_LUCK = 3
// Negative luck does nothing, so the game never shows it.
const MIN_LUCK = 0

const SKILL_BONUS = Object.freeze({ BASIC: 1, ADVANCED: 2, EXPERT: 3 })

const STATE_TEXTS = Object.freeze({
  morale: {
    good: {
      title: 'Good Morale',
      description: 'Good morale may give your troops an extra attack in combat.'
    },
    neutral: {
      title: 'Neutral Morale',
      description:
        'Neutral morale means your armies will neither be blessed with extra attacks or freeze in combat.'
    },
    bad: {
      title: 'Bad Morale',
      description: 'Bad morale may make your troops freeze in combat.'
    }
  },
  luck: {
    good: {
      title: 'Good Luck',
      description: 'Good luck may let your troops strike a lucky blow for double damage.'
    },
    neutral: {
      title: 'Neutral Luck',
      description: 'Neutral luck means your troops will never strike a lucky blow.'
    }
  }
})

function signed(value) {
  return value > 0 ? `+${value}` : String(value)
}

function skillBonus(hero, skill) {
  const known = (hero?.secondarySkills ?? []).find((learned) => learned.skill === skill)
  return SKILL_BONUS[known?.level] ?? 0
}

function armyCreatures(hero, definitions) {
  return (hero?.army ?? []).filter(Boolean).map(({ creature }) => ({
    creature,
    definition: definitions?.monsters?.[creature] ?? {}
  }))
}

// Neutral creatures count as a town of their own.
function townsBonus(creatures) {
  const towns = new Set(creatures.map(({ creature, definition }) => definition.faction ?? creature))
  if (towns.size === 0) {
    return 0
  }
  return towns.size === 1 ? 1 : 2 - towns.size
}

const hasAbility = (ability) => (creature) =>
  (creature.definition.abilities ?? []).includes(ability)

function undeadPenalty(creatures) {
  return creatures.some(hasAbility('undead')) ? -1 : 0
}

function angelsBonus(creatures) {
  return creatures.some(hasAbility('raisesMorale')) ? 1 : 0
}

function stateOf(value) {
  if (value > 0) {
    return 'good'
  }
  return value < 0 ? 'bad' : 'neutral'
}

function describe(kind, total, { min, max }) {
  const value = Math.min(max, Math.max(min, total))
  const state = stateOf(value)
  return { value, valueText: signed(value), state, ...STATE_TEXTS[kind][state] }
}

export function getHeroMorale({ entity, definitions }) {
  const creatures = armyCreatures(entity, definitions)
  const total =
    skillBonus(entity, 'LEADERSHIP') +
    townsBonus(creatures) +
    undeadPenalty(creatures) +
    angelsBonus(creatures)
  return describe('morale', total, { min: MIN_MORALE, max: MAX_MORALE })
}

export function getHeroLuck({ entity }) {
  return describe('luck', skillBonus(entity, 'LUCK'), { min: MIN_LUCK, max: MAX_LUCK })
}
