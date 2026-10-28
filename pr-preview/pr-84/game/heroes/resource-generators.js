import { calendarDateOfTurn } from './calendar.js'

const WINDMILL_RESOURCES = Object.freeze([
  'ORE_PILE',
  'MERCURY_PILE',
  'SULFUR_PILE',
  'CRYSTAL_PILE',
  'GEMS_PILE'
])

function isFirstWeekOfGame(turnNumber) {
  const { month, week } = calendarDateOfTurn(turnNumber)
  return month === 1 && week === 1
}

const REWARDS_BY_TYPE = Object.freeze({
  WINDMILL: ({ random }) => {
    const resourceType = WINDMILL_RESOURCES[Math.floor(random() * WINDMILL_RESOURCES.length)]
    return { [resourceType]: 3 + Math.floor(random() * 4) }
  },
  WATER_WHEEL: ({ turnNumber }) => ({ GOLD_PILE: isFirstWeekOfGame(turnNumber) ? 500 : 1000 }),
  MYSTICAL_GARDEN: ({ random }) => (random() < 0.5 ? { GEMS_PILE: 5 } : { GOLD_PILE: 500 })
})

export function rollResourceGeneratorRewards(generatorType, { turnNumber, random }) {
  return REWARDS_BY_TYPE[generatorType]?.({ turnNumber, random }) ?? {}
}
