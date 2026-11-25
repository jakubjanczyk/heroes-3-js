// @vitest-environment jsdom
import { describe, test } from 'vitest'

import { endTurns, expectResourceTotal, getTownInTownList } from './adventure-panels.utils.js'
import { readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aTown, aTownDefinition } from './builders.js'
import { buildInTown, leaveTown } from './town-screen.utils.js'

const treasury = {
  name: 'Treasury',
  cost: { GOLD_PILE: 1000 },
  weeklyInterest: { GOLD_PILE: 10 }
}

const villageHallPayingNothing = { name: 'Village Hall', cost: {}, structure: false }

const GOLDEN = 'GOLDEN'
const GOLDEN_WITH_INCOME = 'GOLDEN_WITH_INCOME'

const aGoldenTownType = () =>
  aTownDefinition()
    .withName('Golden')
    .withHall([[['VILLAGE_HALL'], ['TREASURY']]])
    .withPicture({ VILLAGE_HALL: { x: 100, y: 100 }, TREASURY: { x: 300, y: 100 } })

const gameDefinitions = {
  hero: { name: 'Sir Christian' },
  resources: readGameData('resources.json'),
  buildings: readGameData('buildings.json'),
  towns: {
    [GOLDEN]: aGoldenTownType()
      .withBuildings({ VILLAGE_HALL: villageHallPayingNothing, TREASURY: treasury })
      .build(),
    [GOLDEN_WITH_INCOME]: aGoldenTownType().withBuildings({ TREASURY: treasury }).build()
  }
}

const aGildwater = ({ type = GOLDEN, buildings = ['TREASURY'] } = {}) =>
  aTown().withType(type).named('Gildwater').ownedByPlayer().withBuildings(buildings).at(4, 3)

const aCoinbury = () =>
  aTown()
    .withId('town-2')
    .withType(GOLDEN)
    .named('Coinbury')
    .ownedByPlayer()
    .withBuildings(['TREASURY'])
    .at(12, 3)

function setupApp({ towns = [aGildwater()], gold }) {
  return setupMovementBehaviorApp({
    loadGameOptions: aScenario()
      .withSize(16, 7)
      .withEntities(aHero().at(4, 5), ...towns)
      .withDefinitions(gameDefinitions)
      .withStartingResources({ GOLD_PILE: gold })
      .build(),
    appConfig: { interactionModalTransitionMs: 0 }
  })
}

const VILLAGE_HALL_INCOME = 500
const GOLD_BY_THE_WEEKS_END = 1005 + 6 * VILLAGE_HALL_INCOME
const INTEREST_ON_IT = 400

describe('Treasury', () => {
  test('a new week adds 10% of the gold the player had at the end of the week, rounded down', async () => {
    const { user } = await setupApp({ gold: 1005 })

    await endTurns(user, 7)

    expectResourceTotal('Gold', 1105)
  })

  test("the interest is counted before the new day's income", async () => {
    const { user } = await setupApp({
      towns: [aGildwater({ type: GOLDEN_WITH_INCOME })],
      gold: 1005
    })

    await endTurns(user, 7)

    expectResourceTotal('Gold', GOLD_BY_THE_WEEKS_END + INTEREST_ON_IT + VILLAGE_HALL_INCOME)
  })

  test('two towns with a Treasury add 20%', async () => {
    const { user } = await setupApp({ towns: [aGildwater(), aCoinbury()], gold: 1005 })

    await endTurns(user, 7)

    expectResourceTotal('Gold', 1205)
  })

  test('the other days of the week add no interest', async () => {
    const { user } = await setupApp({ gold: 1005 })

    await endTurns(user, 6)

    expectResourceTotal('Gold', 1005)
  })

  test("a Treasury built on the last day of the week pays at the next week's start", async () => {
    const { user } = await setupApp({ towns: [aGildwater({ buildings: [] })], gold: 2005 })
    await endTurns(user, 6)
    await user.dblClick(getTownInTownList('Gildwater'))
    await buildInTown(user, 'Treasury')
    await leaveTown(user)

    await endTurns(user, 1)

    expectResourceTotal('Gold', 1105)
  })
})
