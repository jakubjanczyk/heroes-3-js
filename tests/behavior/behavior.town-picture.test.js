// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { getTownInTownList } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'
import {
  buildInTown,
  clickBuildingOnPicture,
  hoverBuildingOnPicture,
  queryFortWindow,
  queryHall,
  queryRecruitWindow,
  readChosenRecruitCreature,
  readTownPicture,
  readTownStatusBar,
  unhoverBuildingOnPicture
} from './town-screen.utils.js'

const gameDefinitions = {
  hero: { name: 'Sir Christian' },
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

const aWhitemoon = (buildings = []) =>
  aTown().named('Whitemoon').ownedByPlayer().withBuildings(buildings)

const aPictureScenario = (buildings) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(aHero().at(4, 5), aWhitemoon(buildings).at(4, 3))
    .withDefinitions(gameDefinitions)
    .withStartingResources({ GOLD_PILE: 20000, WOOD_PILE: 20, ORE_PILE: 20 })

async function startInWhitemoon(buildings, options = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: aPictureScenario(buildings).build(),
    appConfig: { interactionModalTransitionMs: 0 },
    ...options
  })
  await app.user.dblClick(getTownInTownList('Whitemoon'))
  await flushMicrotasks()
  return app
}

describe('town picture behavior', () => {
  describe('what it shows', () => {
    test('a town with nothing else built shows its Village Hall', async () => {
      await startInWhitemoon([])

      expect(readTownPicture()).toEqual(['Village Hall'])
    })

    test('shows each building the town has built', async () => {
      await startInWhitemoon(['TAVERN', 'BLACKSMITH', 'FORT', 'GUARDHOUSE'])

      expect(readTownPicture()).toEqual([
        'Blacksmith',
        'Fort',
        'Guardhouse',
        'Tavern',
        'Village Hall'
      ])
    })

    test.each([
      { built: ['FORT', 'CITADEL', 'CASTLE'], shown: ['Castle', 'Village Hall'] },
      { built: ['TOWN_HALL', 'CITY_HALL', 'CAPITOL'], shown: ['Capitol'] },
      {
        built: ['MAGE_GUILD_1', 'MAGE_GUILD_2', 'MAGE_GUILD_3'],
        shown: ['Mage Guild Level 3', 'Village Hall']
      },
      {
        built: ['FORT', 'GUARDHOUSE', 'UPG_GUARDHOUSE'],
        shown: ['Fort', 'Upg. Guardhouse', 'Village Hall']
      }
    ])('shows only the highest building of a chain: $built', async ({ built, shown }) => {
      await startInWhitemoon(built)

      expect(readTownPicture()).toEqual(shown)
    })

    test('shows the Brotherhood of the Sword next to the Tavern', async () => {
      await startInWhitemoon(['TAVERN', 'BROTHERHOOD_OF_THE_SWORD'])

      expect(readTownPicture()).toEqual(['Brotherhood of the Sword', 'Tavern', 'Village Hall'])
    })

    test('shows the Griffin Bastion next to the Griffin Tower', async () => {
      await startInWhitemoon(['GRIFFIN_TOWER', 'GRIFFIN_BASTION'])

      expect(readTownPicture()).toEqual(['Griffin Bastion', 'Griffin Tower', 'Village Hall'])
    })

    test('shows a building built in the Hall once the Hall closes', async () => {
      const { user } = await startInWhitemoon([])

      await buildInTown(user, 'Tavern')

      expect(readTownPicture()).toEqual(['Tavern', 'Village Hall'])
    })

    test('after a reload, shows the buildings built in the town', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await startInWhitemoon([], { eventLog })
      await buildInTown(user, 'Tavern')

      await setupMovementBehaviorApp({
        loadGameOptions: aPictureScenario([]).build(),
        appConfig: { interactionModalTransitionMs: 0 },
        eventLog
      })
      await flushMicrotasks()

      expect(readTownPicture()).toEqual(['Tavern', 'Village Hall'])
    })
  })

  describe('hovering', () => {
    test("hovering a building shows its name in the town's status bar", async () => {
      const { user } = await startInWhitemoon(['TAVERN'])

      await hoverBuildingOnPicture(user, 'Tavern')

      expect(readTownStatusBar()).toBe('Tavern')
    })

    test("moving off a building clears the town's status bar", async () => {
      const { user } = await startInWhitemoon(['TAVERN'])
      await hoverBuildingOnPicture(user, 'Tavern')

      await unhoverBuildingOnPicture(user, 'Tavern')

      expect(readTownStatusBar()).toBe('')
    })
  })

  describe('clicking', () => {
    test("clicking a dwelling opens its creature's recruit window", async () => {
      const { user } = await startInWhitemoon(['FORT', 'GUARDHOUSE'])

      await clickBuildingOnPicture(user, 'Guardhouse')

      expect(queryRecruitWindow('Recruit Pikemen')).toBeTruthy()
    })

    test('clicking an upgraded dwelling opens the recruit window with the upgraded creature chosen', async () => {
      const { user } = await startInWhitemoon(['FORT', 'GUARDHOUSE', 'UPG_GUARDHOUSE'])

      await clickBuildingOnPicture(user, 'Upg. Guardhouse')

      expect(readChosenRecruitCreature()).toBe('Halberdiers')
    })

    test("clicking the Griffin Bastion opens the Griffins' recruit window", async () => {
      const { user } = await startInWhitemoon(['GRIFFIN_TOWER', 'GRIFFIN_BASTION'])

      await clickBuildingOnPicture(user, 'Griffin Bastion')

      expect(queryRecruitWindow('Recruit Griffins')).toBeTruthy()
    })

    test('clicking the fort opens the Fort window', async () => {
      const { user } = await startInWhitemoon(['FORT', 'CITADEL'])

      await clickBuildingOnPicture(user, 'Citadel')

      expect(queryFortWindow('Citadel')).toBeTruthy()
    })

    test('clicking the hall opens the Hall', async () => {
      const { user } = await startInWhitemoon([])

      await clickBuildingOnPicture(user, 'Village Hall')

      expect(queryHall()).toBeTruthy()
    })
  })
})
