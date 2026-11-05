import { turnNumber } from '../../state/queries.js'
import { calendarDateOfTurn } from '../calendar.js'
import { experienceToNextLevel } from '../hero-experience.js'
import { PRIMARY_SKILLS } from '../primary-skills.js'
import { fillValues } from './definitions.js'

function primarySkillsOf(reward) {
  return Object.fromEntries(
    PRIMARY_SKILLS.filter(({ key }) => reward[key]).map(({ key }) => [key, reward[key]])
  )
}

function bonusOnTheDay({ byDay, morale = 0, luck = 0 }, state) {
  if (!byDay) {
    return { morale, luck }
  }
  const { day } = calendarDateOfTurn(turnNumber(state))
  const bonus = byDay.find(({ days }) => !days || days.includes(day)) ?? {}
  return { morale: bonus.morale ?? 0, luck: bonus.luck ?? 0 }
}

function upgradedArmy({ upgrades }, army = []) {
  if (!army.some((stack) => upgrades[stack?.creature])) {
    return null
  }
  return army.map((stack) =>
    upgrades[stack?.creature] ? { ...stack, creature: upgrades[stack.creature] } : stack
  )
}

function isFirstWeekOfGame(state) {
  const { month, week } = calendarDateOfTurn(turnNumber(state))
  return month === 1 && week === 1
}

function rolledResources({ resources, firstWeek, oneOf, anyOf, amount }, { state, random }) {
  if (oneOf) {
    return oneOf[Math.floor(random() * oneOf.length)]
  }
  if (anyOf) {
    const resourceType = anyOf[Math.floor(random() * anyOf.length)]
    return { [resourceType]: amount.min + Math.floor(random() * (amount.max - amount.min + 1)) }
  }
  return firstWeek && isFirstWeekOfGame(state) ? firstWeek : resources
}

// Each reward type turns the object's data into what the hero gains on this visit, or null when
// it gives nothing this time (no creature to upgrade). `describe` is the popup's line on it.
const REWARD_TYPES = Object.freeze({
  experience: {
    gain: ({ amount }) => ({ type: 'experience', amount }),
    describe: ({ amount }) => [`+${amount} Experience`]
  },
  level: {
    gain: (_reward, { hero }) => ({
      type: 'experience',
      amount: experienceToNextLevel(hero.experience ?? 0)
    }),
    describe: () => ['+1 level']
  },
  primarySkills: {
    gain: (reward) => ({ type: 'primarySkills', primarySkills: primarySkillsOf(reward) }),
    describe: (reward) =>
      PRIMARY_SKILLS.filter(({ key }) => reward[key]).map(
        ({ key, name }) => `+${reward[key]} ${name}`
      )
  },
  secondarySkill: {
    gain: ({ skill, level }) => ({ type: 'secondarySkill', skill, level })
  },
  battleBonus: {
    gain: (reward, { state }) => ({ type: 'battleBonus', ...bonusOnTheDay(reward, state) })
  },
  movementPoints: {
    gain: ({ amount }) => ({ type: 'movementPoints', amount })
  },
  endsMovement: {
    gain: () => ({ type: 'endsMovement' })
  },
  weekMovementPoints: {
    gain: ({ amount }) => ({ type: 'weekMovementPoints', amount })
  },
  upgradeCreatures: {
    gain: (reward, { hero }) => {
      const army = upgradedArmy(reward, hero.army)
      return army && { type: 'upgradeCreatures', army }
    }
  },
  resources: {
    gain: (reward, context) => ({ type: 'resources', resources: rolledResources(reward, context) })
  }
})

export function gainsOf(rewards, context) {
  return (rewards ?? [])
    .map((reward) => fillValues(reward, context.values))
    .map((reward) => REWARD_TYPES[reward.type]?.gain(reward, context) ?? null)
    .filter(Boolean)
}

export function describeRewards(rewards) {
  return (rewards ?? []).flatMap((reward) => REWARD_TYPES[reward.type]?.describe?.(reward) ?? [])
}

export const REWARD_TYPE_NAMES = Object.freeze(Object.keys(REWARD_TYPES))
