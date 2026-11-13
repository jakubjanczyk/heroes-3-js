// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { holdRightButtonOn } from './adventure-map.utils.js'
import {
  getTownInfoBox,
  getTownInTownList,
  readArmySlots,
  readTownBox
} from './adventure-panels.utils.js'
import { readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'
import { buildInTown, enterTownAt, leaveTown } from './town-screen.utils.js'

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

  describe("a town that isn't the player's", () => {
    const aBlueKirkwall = () => aTown().named('Kirkwall').ownedBy('blue').at(4, 3)

    async function readTownPopupAt(user, x, y) {
      await holdRightButtonOn(user, x, y)
      return screen.getByRole('tooltip')
    }

    test("shows another player's town's name and its fort, without its hall or income, in the right-click popup", async () => {
      const { user } = await setupApp(aTownScenario(aBlueKirkwall()))

      const popup = await readTownPopupAt(user, 4, 3)

      expect(within(popup).getByRole('heading').textContent).toBe('Kirkwall')
      expect(readTownBox(popup)).toEqual({ buildings: ['No fort'], income: null })
    })

    test("shows another player's town's highest fort and still no hall", async () => {
      const { user } = await setupApp(
        aTownScenario(
          aBlueKirkwall().withBuildings(['TOWN_HALL', 'CITY_HALL', 'CAPITOL', 'FORT', 'CITADEL'])
        )
      )

      const popup = await readTownPopupAt(user, 4, 3)

      expect(readTownBox(popup)).toEqual({ buildings: ['Citadel'], income: null })
    })

    test("shows another player's town's garrison with each stack's size as a word", async () => {
      const { user } = await setupApp(
        aTownScenario(
          aBlueKirkwall().withGarrison([
            { creature: 'PIKEMAN', count: 10 },
            null,
            { creature: 'ARCHER', count: 3 }
          ])
        )
      )

      const popup = await readTownPopupAt(user, 4, 3)

      expect(readArmySlots(popup, 'Garrison')).toEqual([
        'Pikemen Pack',
        '',
        'Archers Few',
        '',
        '',
        '',
        ''
      ])
    })

    test("shows a neutral town's fort and garrison as words, without its hall or income", async () => {
      const { user } = await setupApp(
        aTownScenario(
          aTown()
            .named('Kirkwall')
            .withBuildings(['FORT'])
            .withGarrison([{ creature: 'PIKEMAN', count: 5 }])
            .at(4, 3)
        )
      )

      const popup = await readTownPopupAt(user, 4, 3)

      expect(readTownBox(popup)).toEqual({ buildings: ['Fort'], income: null })
      expect(readArmySlots(popup, 'Garrison')[0]).toBe('Pikemen Several')
    })

    test("shows the same box over one of another player's town's buildings", async () => {
      const { user } = await setupApp(aTownScenario(aBlueKirkwall()))

      const popup = await readTownPopupAt(user, 4, 2)

      expect(within(popup).getByRole('heading').textContent).toBe('Kirkwall')
      expect(readTownBox(popup)).toEqual({ buildings: ['No fort'], income: null })
    })

    test('shows the hall and daily income once the player captures the town', async () => {
      const { user } = await setupApp(aTownScenario(aBlueKirkwall()))
      await enterTownAt(4, 3)
      await leaveTown(user)

      const popup = await readTownPopupAt(user, 4, 2)

      expect(readTownBox(popup)).toEqual({ buildings: ['Village Hall', 'No fort'], income: '500' })
    })
  })
})
