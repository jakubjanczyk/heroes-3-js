// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { holdRightButtonOn } from './adventure-map.utils.js'
import {
  getTownInfoBox,
  getTownInTownList,
  readArmySlots,
  readTownBox
} from './adventure-panels.utils.js'
import { flushMicrotasks, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'
import { buildInTown, leaveTown } from './town-screen.utils.js'

const gameDefinitions = {
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

// The town's entrance is at (4, 3), its buildings cover the tiles above and beside it; the hero
// starts two tiles below the entrance.
const aWhitemoon = () => aTown().named('Whitemoon').ownedByPlayer().at(4, 3)

const aTownScenario = (town = aWhitemoon()) =>
  aScenario().withSize(8, 7).withEntities(aHero().at(4, 5), town).withDefinitions(gameDefinitions)

async function setupApp(scenario) {
  return setupMovementBehaviorApp({ loadGameOptions: scenario.build() })
}

async function selectTown(user, townName) {
  await user.click(getTownInTownList(townName))
  await flushMicrotasks()
}

describe('town box behavior', () => {
  test("shows the town's Village Hall, no fort and 500 gold a day in the info box", async () => {
    const { user } = await setupApp(aTownScenario())

    await selectTown(user, 'Whitemoon')

    expect(readTownBox(getTownInfoBox())).toEqual({
      buildings: ['Village Hall', 'No fort'],
      income: '500'
    })
  })

  test.each([
    {
      built: ['TAVERN', 'TOWN_HALL', 'FORT'],
      buildings: ['Town Hall', 'Fort'],
      income: '1000'
    },
    {
      built: ['TOWN_HALL', 'CITY_HALL', 'FORT', 'CITADEL'],
      buildings: ['City Hall', 'Citadel'],
      income: '2000'
    },
    {
      built: ['TOWN_HALL', 'CITY_HALL', 'CAPITOL', 'FORT', 'CITADEL', 'CASTLE'],
      buildings: ['Capitol', 'Castle'],
      income: '4000'
    }
  ])('shows the highest hall and fort the town has: $buildings', async ({
    built,
    buildings,
    income
  }) => {
    const { user } = await setupApp(aTownScenario(aWhitemoon().withBuildings(built)))

    await selectTown(user, 'Whitemoon')

    expect(readTownBox(getTownInfoBox())).toEqual({ buildings, income })
  })

  test("shows the town's garrison in the info box", async () => {
    const { user } = await setupApp(
      aTownScenario(aWhitemoon().withGarrison([{ creature: 'GRIFFIN', count: 1 }]))
    )

    await selectTown(user, 'Whitemoon')

    expect(readArmySlots(getTownInfoBox(), 'Garrison')).toEqual([
      'Griffin 1',
      '',
      '',
      '',
      '',
      '',
      ''
    ])
  })

  test("shows the hall, fort and daily income in the right-click popup of the player's own town", async () => {
    const { user } = await setupApp(aTownScenario(aWhitemoon().withBuildings(['FORT'])))

    await holdRightButtonOn(user, 4, 2)

    expect(readTownBox(screen.getByRole('tooltip'))).toEqual({
      buildings: ['Village Hall', 'Fort'],
      income: '500'
    })
  })

  test('shows the new hall and income in the info box after the player builds a Town Hall', async () => {
    const { user } = await setupApp(
      aTownScenario(aWhitemoon().withBuildings(['TAVERN'])).withStartingResources({
        GOLD_PILE: 2500
      })
    )
    await selectTown(user, 'Whitemoon')
    await selectTown(user, 'Whitemoon')

    await buildInTown(user, 'Town Hall')
    await leaveTown(user)

    expect(readTownBox(getTownInfoBox())).toEqual({
      buildings: ['Town Hall', 'No fort'],
      income: '1000'
    })
  })
})
