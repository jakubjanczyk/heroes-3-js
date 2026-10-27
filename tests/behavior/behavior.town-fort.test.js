// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { getTownInTownList } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  pressKey,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'
import {
  cancelRecruiting,
  dragRecruitSlider,
  queryRecruitWindow,
  recruit
} from './recruit-window.utils.js'
import {
  buildInTown,
  clickFortCard,
  closeFortWindow,
  openFortWindow,
  queryFortIcon,
  queryFortWindow,
  readFortCard,
  readFortCards,
  readGarrison
} from './town-screen.utils.js'

const gameDefinitions = {
  hero: { name: 'Sir Christian' },
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

const GUARDHOUSE = ['FORT', 'GUARDHOUSE']

const aWhitemoon = ({ buildings = GUARDHOUSE } = {}) =>
  aTown().named('Whitemoon').ownedByPlayer().withBuildings(buildings)

const aFortScenario = ({ town = aWhitemoon(), resources = { GOLD_PILE: 20000 } } = {}) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(aHero().at(4, 5), town.at(4, 3))
    .withDefinitions(gameDefinitions)
    .withStartingResources(resources)

async function setupApp(scenario = aFortScenario(), options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    ...options
  })
}

async function openWhitemoon(user) {
  await user.dblClick(getTownInTownList('Whitemoon'))
}

async function startInWhitemoon(scenario, options) {
  const app = await setupApp(scenario, options)
  await openWhitemoon(app.user)
  return app
}

async function recruitFromFort(user, creaturePlural, count) {
  await clickFortCard(user, creaturePlural)
  dragRecruitSlider(count)
  await recruit(user)
}

describe('town fort behavior', () => {
  describe('opening it', () => {
    test('with a Fort built, clicking the Fort icon opens the Fort window', async () => {
      const { user } = await startInWhitemoon()

      await openFortWindow(user, 'Fort')

      expect(queryFortWindow('Fort')).toBeTruthy()
    })

    test.each([
      [['FORT', 'CITADEL'], 'Citadel'],
      [['FORT', 'CITADEL', 'CASTLE'], 'Castle']
    ])('with %j built, the Fort icon and window are named %s', async (buildings, fortName) => {
      const { user } = await startInWhitemoon(aFortScenario({ town: aWhitemoon({ buildings }) }))

      await openFortWindow(user, fortName)

      expect(queryFortWindow(fortName)).toBeTruthy()
    })

    test('a town without a Fort has no Fort icon', async () => {
      await startInWhitemoon(aFortScenario({ town: aWhitemoon({ buildings: [] }) }))

      expect(queryFortIcon()).toBeNull()
    })

    test('the Fort icon shows right after the player builds a Fort', async () => {
      const { user } = await startInWhitemoon(
        aFortScenario({
          town: aWhitemoon({ buildings: [] }),
          resources: { GOLD_PILE: 20000, WOOD_PILE: 20, ORE_PILE: 20 }
        })
      )

      await buildInTown(user, 'Fort')

      expect(queryFortIcon('Fort')).toBeTruthy()
    })

    test('the ✓ closes the Fort window', async () => {
      const { user } = await startInWhitemoon()
      await openFortWindow(user, 'Fort')

      await closeFortWindow(user)

      expect(queryFortWindow()).toBeNull()
    })

    test('Escape closes the Fort window', async () => {
      const { user } = await startInWhitemoon()
      await openFortWindow(user, 'Fort')

      await pressKey(user, '{Escape}')

      expect(queryFortWindow()).toBeNull()
    })
  })

  describe('the cards', () => {
    test("a Guardhouse's card shows Pikemen, how many are available and their stats", async () => {
      const { user } = await startInWhitemoon()

      await openFortWindow(user, 'Fort')

      expect(readFortCard('Pikemen')).toEqual({
        dwelling: 'Guardhouse',
        available: 'Available: 14',
        stats: {
          Attack: '4',
          Defense: '5',
          Damage: '1-3',
          Health: '10',
          Speed: '4',
          Growth: '14'
        }
      })
    })

    test("an Upg. Guardhouse's card shows Halberdiers and their stats", async () => {
      const { user } = await startInWhitemoon(
        aFortScenario({ town: aWhitemoon({ buildings: ['FORT', 'GUARDHOUSE', 'UPG_GUARDHOUSE'] }) })
      )

      await openFortWindow(user, 'Fort')

      expect(readFortCard('Halberdiers')).toEqual({
        dwelling: 'Upg. Guardhouse',
        available: 'Available: 14',
        stats: {
          Attack: '6',
          Defense: '5',
          Damage: '2-3',
          Health: '10',
          Speed: '5',
          Growth: '14'
        }
      })
    })

    test("an Archangel's damage shows as a single 50", async () => {
      const { user } = await startInWhitemoon(
        aFortScenario({
          town: aWhitemoon({ buildings: ['FORT', 'PORTAL_OF_GLORY', 'UPG_PORTAL_OF_GLORY'] })
        })
      )

      await openFortWindow(user, 'Fort')

      expect(readFortCard('Archangels').stats.Damage).toBe('50')
    })

    // 14 a week, doubled by the Castle.
    test("with a Castle, the Pikemen's growth includes its bonus", async () => {
      const { user } = await startInWhitemoon(
        aFortScenario({
          town: aWhitemoon({ buildings: ['FORT', 'CITADEL', 'CASTLE', 'GUARDHOUSE'] })
        })
      )

      await openFortWindow(user, 'Castle')

      expect(readFortCard('Pikemen').stats.Growth).toBe('28')
    })

    test('shows a card for every tier in order, unbuilt dwellings with their plain creature', async () => {
      const { user } = await startInWhitemoon()

      await openFortWindow(user, 'Fort')

      expect(readFortCards()).toEqual([
        'Pikemen',
        'Archers',
        'Griffins',
        'Swordsmen',
        'Monks',
        'Cavaliers',
        'Angels'
      ])
    })

    test("an unbuilt dwelling's card shows none available", async () => {
      const { user } = await startInWhitemoon()

      await openFortWindow(user, 'Fort')

      expect(readFortCard('Archers')).toEqual({
        dwelling: "Archers' Tower",
        available: 'Available: 0',
        stats: {
          Attack: '6',
          Defense: '3',
          Damage: '2-3',
          Health: '10',
          Speed: '4',
          Growth: '9'
        }
      })
    })
  })

  describe('recruiting from it', () => {
    test('clicking a card opens the recruit window for its creature', async () => {
      const { user } = await startInWhitemoon()
      await openFortWindow(user, 'Fort')

      await clickFortCard(user, 'Pikemen')

      expect(queryRecruitWindow('Recruit Pikemen')).toBeTruthy()
    })

    test("clicking an unbuilt dwelling's card opens nothing", async () => {
      const { user } = await startInWhitemoon()
      await openFortWindow(user, 'Fort')

      await clickFortCard(user, 'Archers')

      expect(queryRecruitWindow()).toBeNull()
    })

    test('recruiting goes back to the Fort window, showing fewer available', async () => {
      const { user } = await startInWhitemoon()
      await openFortWindow(user, 'Fort')

      await recruitFromFort(user, 'Pikemen', 5)

      expect(queryRecruitWindow()).toBeNull()
      expect(readFortCard('Pikemen').available).toBe('Available: 9')
    })

    test('Cancel goes back to the Fort window', async () => {
      const { user } = await startInWhitemoon()
      await openFortWindow(user, 'Fort')
      await clickFortCard(user, 'Pikemen')

      await cancelRecruiting(user)

      expect(queryRecruitWindow()).toBeNull()
      expect(queryFortWindow('Fort')).toBeTruthy()
    })

    test('Escape in the recruit window leaves the Fort window open', async () => {
      const { user } = await startInWhitemoon()
      await openFortWindow(user, 'Fort')
      await clickFortCard(user, 'Pikemen')

      await pressKey(user, '{Escape}')

      expect(queryRecruitWindow()).toBeNull()
      expect(queryFortWindow('Fort')).toBeTruthy()
    })

    test('the recruits join the garrison', async () => {
      const { user } = await startInWhitemoon()
      await openFortWindow(user, 'Fort')
      await recruitFromFort(user, 'Pikemen', 5)

      await closeFortWindow(user)

      expect(readGarrison()[0]).toBe('Pikemen 5')
    })
  })

  describe('reloading', () => {
    test('after recruiting from it, the Fort window shows fewer available', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await startInWhitemoon(aFortScenario(), { eventLog })
      await openFortWindow(user, 'Fort')
      await recruitFromFort(user, 'Pikemen', 5)

      const { user: userAfterReload } = await setupApp(aFortScenario(), { eventLog })

      await openFortWindow(userAfterReload, 'Fort')
      expect(readFortCard('Pikemen').available).toBe('Available: 9')
    })
  })
})
