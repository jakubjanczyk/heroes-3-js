import { REWARD_TYPE_NAMES } from './rewards.js'
import { REQUIREMENT_TYPE_NAMES, VISIT_LIMIT_NAMES } from './visits.js'

const PLACEHOLDERS = /\{(\w+)\}/g
const ROLL_PERIODS = Object.freeze(['game', 'week'])

function allRewards(definition) {
  return [...(definition.rewards ?? []), ...(definition.choices ?? []).flat()]
}

// The messages a visit can show, given what the object does.
function neededMessages(definition) {
  const asks = definition.choices || (definition.asksFirst && definition.cost)
  return [
    definition.visits === 'always' ? null : 'visited',
    definition.choices ? null : 'gives',
    asks ? 'offer' : null,
    definition.cost ? 'tooPoor' : null,
    ...(definition.requires ?? []).map(({ message }) => message)
  ].filter(Boolean)
}

function placeholdersIn(definition) {
  const { name, ...rest } = definition
  return [...JSON.stringify(rest).matchAll(PLACEHOLDERS)].map(([, placeholder]) => placeholder)
}

// What is wrong with a bonus object's or resource generator's data, as sentences; none when it
// can be visited as it is.
export function definitionProblems(definition) {
  const rolls = definition.rolls ?? {}
  return [
    ...(definition.name ? [] : ['it has no name']),
    ...(VISIT_LIMIT_NAMES.includes(definition.visits)
      ? []
      : [`"visits" is "${definition.visits}", not one of ${VISIT_LIMIT_NAMES.join(', ')}`]),
    ...allRewards(definition)
      .filter(({ type }) => !REWARD_TYPE_NAMES.includes(type))
      .map(({ type }) => `reward type "${type}" is unknown`),
    ...(definition.requires ?? [])
      .filter(({ type }) => !REQUIREMENT_TYPE_NAMES.includes(type))
      .map(({ type }) => `requirement type "${type}" is unknown`),
    ...neededMessages(definition)
      .filter((key) => !definition.messages?.[key])
      .map((key) => `message "${key}" is missing`),
    ...Object.entries(rolls)
      .filter(([, roll]) => !ROLL_PERIODS.includes(roll.per))
      .map(([rollName]) => `roll "${rollName}" is not rolled per game or week`),
    ...[...new Set(placeholdersIn(definition))]
      .filter((placeholder) => !rolls[placeholder])
      .map((placeholder) => `"{${placeholder}}" is not one of its rolls`)
  ]
}
