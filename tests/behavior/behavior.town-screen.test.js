// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  confirmTileClickByDispatch,
  expectHeroAt,
  getMapViewCentreTile,
  panCamera
} from './adventure-map.utils.js'
import {
  expectCalendarDate,
  expectMovementPoints,
  expectResourceTotal
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  pressKey,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'
import {
  buildInTown,
  enterTownAt,
  getVisitingHero,
  leaveTown,
  queryTownScreen,
  readGarrison,
  readTownIncome,
  readTownName,
  readVisitingHeroArmy
} from './town-screen.utils.js'

const HERO_NAME = 'Sir Christian'

const gameDefinitions = {
  hero: { name: HERO_NAME },
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

// The town's entrance is at (4, 3), its buildings cover the tiles above and beside it; the hero
// starts two tiles below the entrance.
const aTownVisit = ({ hero = aHero().at(4, 5), town = aTown() } = {}) =>
  aScenario().withSize(8, 7).withEntities(hero, town.at(4, 3)).withDefinitions(gameDefinitions)

async function setupApp(scenario, options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    ...options
  })
}

const EMPTY_SLOTS = new Array(7).fill('')

describe('town screen behavior', () => {
  describe('opening it', () => {
    test('given hero walks to a town when it steps onto the entrance then the town screen opens', async () => {
      await setupApp(aTownVisit())

      confirmTileClickByDispatch(4, 3)
      await flushMicrotasks()

      expectHeroAt(4, 3)
      expect(queryTownScreen()).toBeTruthy()
    })

    test('given hero walks at default speed when it is still stepping onto the entrance then the town screen stays closed', async () => {
      await setupApp(aTownVisit({ hero: aHero().at(4, 4) }), { movementStepDelayMs: 220 })

      confirmTileClickByDispatch(4, 3)
      await waitMs(250)
      await flushMicrotasks()

      expectHeroAt(4, 3)
      expect(queryTownScreen()).toBeNull()

      await waitMs(220)
      await flushMicrotasks()

      expect(queryTownScreen()).toBeTruthy()
    })

    test('given the scenario names the town when the hero enters it then the town screen shows that name', async () => {
      await setupApp(aTownVisit({ town: aTown().named('Whitemoon') }))

      await enterTownAt(4, 3)

      expect(readTownName()).toBe('Whitemoon')
    })

    test('given the scenario gives the town no name when the hero enters it then the town screen shows its type name', async () => {
      await setupApp(aTownVisit())

      await enterTownAt(4, 3)

      expect(readTownName()).toBe('Castle')
    })

    test('given hero left the town when it walks out and back in then the town screen opens again', async () => {
      const { user } = await setupApp(aTownVisit())
      await enterTownAt(4, 3)
      await leaveTown(user)

      confirmTileClickByDispatch(4, 4)
      await flushMicrotasks()
      expectHeroAt(4, 4)
      confirmTileClickByDispatch(4, 3)
      await flushMicrotasks()

      expect(queryTownScreen()).toBeTruthy()
    })
  })

  describe('the panel', () => {
    test('given hero has an army when it enters a town then its stacks show in the visiting hero row', async () => {
      await setupApp(
        aTownVisit({
          hero: aHero()
            .at(4, 5)
            .withArmy([
              { creature: 'PIKEMAN', count: 332 },
              { creature: 'ARCHER', count: 54 }
            ])
        })
      )

      await enterTownAt(4, 3)

      expect(readVisitingHeroArmy()).toEqual(['Pikemen 332', 'Archers 54', '', '', '', '', ''])
    })

    test('given hero has an empty slot between stacks when it enters a town then that slot is empty in the visiting hero row', async () => {
      await setupApp(
        aTownVisit({
          hero: aHero()
            .at(4, 5)
            .withArmy([{ creature: 'PIKEMAN', count: 10 }, null, { creature: 'ANGEL', count: 1 }])
        })
      )

      await enterTownAt(4, 3)

      expect(readVisitingHeroArmy()).toEqual(['Pikemen 10', '', 'Angel 1', '', '', '', ''])
    })

    test('given hero enters a town then the hero is shown at the start of the visiting hero row', async () => {
      await setupApp(aTownVisit())

      await enterTownAt(4, 3)

      expect(getVisitingHero(HERO_NAME)).toBeTruthy()
    })

    test('given hero enters a town then the garrison row above shows seven empty slots', async () => {
      await setupApp(aTownVisit())

      await enterTownAt(4, 3)

      expect(readGarrison()).toEqual(EMPTY_SLOTS)
    })

    test('given player has resources when the hero enters a town then the resources and the date still show along the bottom', async () => {
      await setupApp(aTownVisit().withStartingResources({ GOLD_PILE: 4000 }))

      await enterTownAt(4, 3)

      expect(queryTownScreen()).toBeTruthy()
      expectResourceTotal('Gold', 4000)
      expectCalendarDate({ month: 1, week: 1, day: 1 })
    })

    test("shows the town's daily income, 500 gold with its Village Hall", async () => {
      await setupApp(aTownVisit())

      await enterTownAt(4, 3)

      expect(readTownIncome()).toBe('500')
    })

    test('shows the higher income right after the player builds a Town Hall', async () => {
      const { user } = await setupApp(
        aTownVisit({
          town: aTown().ownedByPlayer().withBuildings(['TAVERN'])
        }).withStartingResources({ GOLD_PILE: 2500 })
      )
      await enterTownAt(4, 3)

      await buildInTown(user, 'Town Hall')

      expect(readTownIncome()).toBe('1000')
    })
  })

  describe('leaving it', () => {
    test('given town screen is open when the player clicks Leave town then the adventure map is back with the hero on the entrance', async () => {
      const { user } = await setupApp(aTownVisit())
      await enterTownAt(4, 3)

      await leaveTown(user)

      expect(queryTownScreen()).toBeNull()
      expectHeroAt(4, 3)
    })

    test.each([
      ['Enter', '{Enter}'],
      ['Escape', '{Escape}']
    ])('given town screen is open when the player presses %s then the town screen closes', async (_, key) => {
      const { user } = await setupApp(aTownVisit())
      await enterTownAt(4, 3)

      await pressKey(user, key)

      expect(queryTownScreen()).toBeNull()
    })

    test('given hero spent movement points reaching the town when the player leaves it then the hero has those points left', async () => {
      const { user } = await setupApp(aTownVisit())
      await enterTownAt(4, 3)

      await leaveTown(user)

      expectMovementPoints(1300)
    })

    test('given town screen is open when the player presses arrow keys then the map does not scroll', async () => {
      await setupApp(
        aScenario()
          .withSize(60, 40)
          .withEntities(aHero().at(20, 17), aTown().at(20, 15))
          .withDefinitions(gameDefinitions),
        { viewportSize: { width: 1000, height: 700 } }
      )
      await enterTownAt(20, 15)
      const centreInTown = getMapViewCentreTile()

      panCamera('ArrowRight', 20)

      expect(getMapViewCentreTile()).toEqual(centreInTown)
    })

    test('given town screen is open when the player clicks the map then the hero does not move', async () => {
      await setupApp(aTownVisit())
      await enterTownAt(4, 3)

      confirmTileClickByDispatch(4, 5)
      await flushMicrotasks()

      expectHeroAt(4, 3)
    })
  })

  describe('reloading', () => {
    test('given town screen is open when the page reloads then the town screen is shown again', async () => {
      const eventLog = createMemoryEventLog()
      await setupApp(aTownVisit({ town: aTown().named('Whitemoon') }), { eventLog })
      await enterTownAt(4, 3)

      await setupApp(aTownVisit({ town: aTown().named('Whitemoon') }), { eventLog })
      await flushMicrotasks()

      expect(readTownName()).toBe('Whitemoon')
    })

    test('given player left the town when the page reloads then the adventure map is shown', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(aTownVisit(), { eventLog })
      await enterTownAt(4, 3)
      await leaveTown(user)

      await setupApp(aTownVisit(), { eventLog })
      await flushMicrotasks()

      expect(queryTownScreen()).toBeNull()
      expectHeroAt(4, 3)
    })
  })
})
