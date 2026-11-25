// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { getTownInTownList } from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aCreatureDefinition, aHero, aScenario, aTown, aTownDefinition } from './builders.js'
import { queryRecruitWindow, readChosenRecruitCreature } from './recruit-window.utils.js'
import {
  buildInTown,
  clickBuildingOnPicture,
  clickHousesOnPicture,
  hoverBuildingOnPicture,
  hoverHousesOnPicture,
  leaveTown,
  queryFortWindow,
  queryHall,
  readHall,
  readTownBackdrop,
  readTownHouses,
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

const WOODLAND = 'WOODLAND'
const TREANT = 'TREANT'

const woodlandDefinitions = {
  ...gameDefinitions,
  monsters: {
    ...gameDefinitions.monsters,
    [TREANT]: aCreatureDefinition().withName('Treant').withNamePlural('Treants').withTier(1).build()
  },
  towns: {
    ...gameDefinitions.towns,
    [WOODLAND]: aTownDefinition()
      .withName('Woodland')
      .withBuildings({
        TREANT_GROVE: { name: 'Treant Grove', cost: { GOLD_PILE: 500 }, creature: TREANT }
      })
      .withHall([[['VILLAGE_HALL', 'TOWN_HALL']], [['TREANT_GROVE']]])
      .withPicture({
        VILLAGE_HALL: { x: 100, y: 100 },
        TAVERN: { x: 200, y: 100 },
        TREANT_GROVE: { x: 300, y: 100 }
      })
      .build()
  }
}

const anElmhollow = (buildings = []) =>
  aTown()
    .withId('town-2')
    .withType(WOODLAND)
    .named('Elmhollow')
    .ownedByPlayer()
    .withBuildings(buildings)

async function startInElmhollow(buildings) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: aScenario()
      .withSize(8, 7)
      .withEntities(aHero().at(4, 5), anElmhollow(buildings).at(4, 3))
      .withDefinitions(woodlandDefinitions)
      .withStartingResources({ GOLD_PILE: 20000 })
      .build(),
    appConfig: { interactionModalTransitionMs: 0 }
  })
  await app.user.dblClick(getTownInTownList('Elmhollow'))
  return app
}

const anElfwind = (buildings = []) =>
  aTown()
    .withId('town-3')
    .withType('RAMPART')
    .named('Elfwind')
    .ownedByPlayer()
    .withBuildings(buildings)

async function startInElfwind(buildings) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: aScenario()
      .withSize(8, 7)
      .withEntities(aHero().at(4, 5), anElfwind(buildings).at(4, 3))
      .withDefinitions(gameDefinitions)
      .build(),
    appConfig: { interactionModalTransitionMs: 0 }
  })
  await app.user.dblClick(getTownInTownList('Elfwind'))
  return app
}

async function startInWhitemoon(buildings, options = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: aPictureScenario(buildings).build(),
    appConfig: { interactionModalTransitionMs: 0 },
    ...options
  })
  await app.user.dblClick(getTownInTownList('Whitemoon'))
  return app
}

describe('town picture behavior', () => {
  describe('what it shows', () => {
    test('a Castle town shows the Castle by the sea', async () => {
      await startInWhitemoon([])

      expect(readTownBackdrop()).toBe('The Castle by the sea')
    })

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

  describe('a town of another type', () => {
    test("shows the buildings its type's picture places", async () => {
      await startInElmhollow(['TAVERN', 'TREANT_GROVE'])

      expect(readTownPicture()).toEqual(['Tavern', 'Treant Grove', 'Village Hall'])
    })

    test("leaves out a building its type's picture has no place for", async () => {
      await startInElmhollow(['TAVERN', 'BLACKSMITH'])

      expect(readTownPicture()).toEqual(['Tavern', 'Village Hall'])
    })

    test('a type without art of its own shows a plain backdrop', async () => {
      await startInElmhollow([])

      expect(readTownBackdrop()).toBe('Plain backdrop')
    })

    test('opened after a Castle town, it shows its own backdrop', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aScenario()
          .withSize(16, 7)
          .withEntities(aHero().at(0, 6), aWhitemoon().at(4, 3), anElmhollow().at(12, 3))
          .withDefinitions(woodlandDefinitions)
          .build(),
        appConfig: { interactionModalTransitionMs: 0 }
      })
      await user.dblClick(getTownInTownList('Whitemoon'))
      await leaveTown(user)

      await user.dblClick(getTownInTownList('Elmhollow'))

      expect(readTownBackdrop()).toBe('Plain backdrop')
    })

    test("clicking its dwelling opens its creature's recruit window", async () => {
      const { user } = await startInElmhollow(['TREANT_GROVE'])

      await clickBuildingOnPicture(user, 'Treant Grove')

      expect(queryRecruitWindow('Recruit Treants')).toBeTruthy()
    })

    test("clicking its hall opens the Hall with its type's rows", async () => {
      const { user } = await startInElmhollow([])

      await clickBuildingOnPicture(user, 'Village Hall')

      expect(readHall()).toEqual([['Town Hall'], ['Treant Grove']])
    })

    test('a building built from its Hall shows on its picture', async () => {
      const { user } = await startInElmhollow([])

      await buildInTown(user, 'Treant Grove')

      expect(readTownPicture()).toEqual(['Treant Grove', 'Village Hall'])
    })
  })

  describe('a Rampart town', () => {
    test("shows Rampart's misty valley", async () => {
      await startInElfwind([])

      expect(readTownBackdrop()).toBe("Rampart's misty valley")
    })

    test.each([
      { hall: 'Village Hall', built: [], houses: 0 },
      { hall: 'Town Hall', built: ['TOWN_HALL'], houses: 1 },
      { hall: 'City Hall', built: ['TOWN_HALL', 'CITY_HALL'], houses: 2 },
      { hall: 'Capitol', built: ['TOWN_HALL', 'CITY_HALL', 'CAPITOL'], houses: 3 }
    ])('with a $hall shows $houses groups of village houses', async ({ built, houses }) => {
      await startInElfwind(built)

      expect(readTownHouses()).toBe(houses)
    })

    test('a Castle town shows no village houses, whatever its hall', async () => {
      await startInWhitemoon(['TOWN_HALL', 'CITY_HALL', 'CAPITOL'])

      expect(readTownHouses()).toBe(0)
    })

    test('hovering the village houses leaves the status bar empty', async () => {
      const { user } = await startInElfwind(['TOWN_HALL'])

      await hoverHousesOnPicture(user)

      expect(readTownStatusBar()).toBe('')
    })

    test('clicking the village houses opens nothing', async () => {
      const { user } = await startInElfwind(['TOWN_HALL'])

      await clickHousesOnPicture(user)

      expect(queryHall()).toBeNull()
    })

    test('a Castle town opened after it shows the Castle by the sea', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aScenario()
          .withSize(16, 7)
          .withEntities(aHero().at(0, 6), aWhitemoon().at(4, 3), anElfwind().at(12, 3))
          .withDefinitions(gameDefinitions)
          .build(),
        appConfig: { interactionModalTransitionMs: 0 }
      })
      await user.dblClick(getTownInTownList('Elfwind'))
      await leaveTown(user)

      await user.dblClick(getTownInTownList('Whitemoon'))

      expect(readTownBackdrop()).toBe('The Castle by the sea')
    })
  })
})
