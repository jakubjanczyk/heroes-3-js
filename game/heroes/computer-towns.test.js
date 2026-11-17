import { describe, expect, test } from 'vitest'

import { buildingGoal } from './computer-towns.js'

const definitions = {
  resources: { GOLD_PILE: { price: 1 }, WOOD_PILE: { price: 250 } },
  monsters: {
    PLAIN: { name: 'Plain', tier: 1, growth: 4, aiValue: 10 },
    UPGRADED: { name: 'Upgraded', tier: 1, growth: 4, aiValue: 15 }
  }
}

const buildings = {
  VILLAGE_HALL: { income: { GOLD_PILE: 500 } },
  TOWN_HALL: {
    cost: { GOLD_PILE: 2500 },
    requires: ['VILLAGE_HALL'],
    upgrades: 'VILLAGE_HALL',
    income: { GOLD_PILE: 1000 }
  },
  FORT: { cost: { GOLD_PILE: 5000, WOOD_PILE: 20 } },
  CITADEL: {
    cost: { GOLD_PILE: 2500 },
    requires: ['FORT'],
    upgrades: 'FORT',
    creatureGrowthPercent: 50
  },
  DWELLING: { cost: { GOLD_PILE: 500 }, requires: ['FORT'], creature: 'PLAIN' },
  UPG_DWELLING: {
    cost: { GOLD_PILE: 1000 },
    requires: ['DWELLING'],
    upgrades: 'DWELLING',
    creature: 'UPGRADED'
  },
  HORDE: { cost: { GOLD_PILE: 1000 }, requires: ['DWELLING'], horde: { tier: 1, amount: 2 } }
}

const catalogue = { buildings, hall: [[Object.keys(buildings)]] }

describe('what a building is worth to a computer player', () => {
  test.each([
    // 500 more gold a day for five days.
    { buildingId: 'TOWN_HALL', built: ['VILLAGE_HALL'], worth: 2500, cost: 2500 },
    // 4 creatures a week at an AI value of 10.
    { buildingId: 'DWELLING', built: ['VILLAGE_HALL', 'FORT'], worth: 40, cost: 500 },
    // The Citadel makes it 6.
    { buildingId: 'DWELLING', built: ['VILLAGE_HALL', 'FORT', 'CITADEL'], worth: 60, cost: 500 },
    // 4 a week at 5 more AI value.
    {
      buildingId: 'UPG_DWELLING',
      built: ['VILLAGE_HALL', 'FORT', 'DWELLING'],
      worth: 20,
      cost: 1000
    },
    // 2 more a week at 10.
    { buildingId: 'HORDE', built: ['VILLAGE_HALL', 'FORT', 'DWELLING'], worth: 20, cost: 1000 },
    // Half as many more a week: 2 at 10.
    { buildingId: 'CITADEL', built: ['VILLAGE_HALL', 'FORT', 'DWELLING'], worth: 20, cost: 2500 },
    // The Fort it needs is worth nothing on its own and costs 5000 gold and 20 wood at 250.
    { buildingId: 'DWELLING', built: ['VILLAGE_HALL'], worth: 40, cost: 10500 }
  ])('$buildingId with $built is worth $worth for $cost', ({ buildingId, built, worth, cost }) => {
    const goal = buildingGoal({ buildingId, catalogue, built: new Set(built), definitions })

    expect({ worth: goal.worth, cost: goal.cost }).toEqual({ worth, cost })
  })
})
