import { describeSecondarySkill } from './secondary-skills.js'

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

const MODIFIERS_HEADINGS = Object.freeze({
  morale: 'Current Morale Modifiers:',
  luck: 'Current Luck Modifiers:'
})

function signed(value) {
  return value > 0 ? `+${value}` : String(value)
}

function skillModifier(hero, skill, definitions) {
  const known = (hero?.secondarySkills ?? []).find((learned) => learned.skill === skill)
  if (!known) {
    return []
  }

  const { title } = describeSecondarySkill(known, definitions)
  return [{ text: title, value: SKILL_BONUS[known.level] ?? 0 }]
}

function armyCreatures(hero, definitions) {
  return (hero?.army ?? []).filter(Boolean).map(({ creature }) => ({
    creature,
    definition: definitions?.monsters?.[creature] ?? {}
  }))
}

// Neutral creatures count as a town of their own.
function townsModifier(creatures) {
  const towns = new Set(creatures.map(({ creature, definition }) => definition.faction ?? creature))
  if (towns.size === 0) {
    return []
  }
  if (towns.size === 1) {
    return [{ text: 'All troops of one alignment', value: 1 }]
  }
  return [{ text: `Troops of ${towns.size} alignments`, value: 2 - towns.size }]
}

const hasAbility = (ability) => (creature) =>
  (creature.definition.abilities ?? []).includes(ability)

function undeadModifier(creatures) {
  return creatures.some(hasAbility('undead')) ? [{ text: 'Undead in army', value: -1 }] : []
}

function angelsModifier(creatures) {
  const raising = creatures.find(hasAbility('raisesMorale'))
  return raising ? [{ text: `${raising.definition.namePlural} in army`, value: 1 }] : []
}

function stateOf(value) {
  if (value > 0) {
    return 'good'
  }
  return value < 0 ? 'bad' : 'neutral'
}

function describe(kind, modifiers, { min, max }) {
  const shown = modifiers.filter(({ value }) => value !== 0)
  const total = shown.reduce((sum, { value }) => sum + value, 0)
  const value = Math.min(max, Math.max(min, total))
  const state = stateOf(value)
  return {
    value,
    valueText: signed(value),
    state,
    ...STATE_TEXTS[kind][state],
    modifiersHeading: MODIFIERS_HEADINGS[kind],
    modifiers: shown.map(({ text, value: modifier }) => `${text} ${signed(modifier)}`)
  }
}

export function getHeroMorale({ entity, definitions }) {
  const creatures = armyCreatures(entity, definitions)
  return describe(
    'morale',
    [
      ...skillModifier(entity, 'LEADERSHIP', definitions),
      ...townsModifier(creatures),
      ...undeadModifier(creatures),
      ...angelsModifier(creatures)
    ],
    { min: MIN_MORALE, max: MAX_MORALE }
  )
}

export function getHeroLuck({ entity, definitions }) {
  return describe('luck', skillModifier(entity, 'LUCK', definitions), {
    min: MIN_LUCK,
    max: MAX_LUCK
  })
}
