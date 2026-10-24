// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  clickTile,
  confirmTileClickByDispatch,
  expectHeroAt,
  getMapViewCentreTile,
  getTownFlag
} from './adventure-map.utils.js'
import {
  clickEndTurn,
  getHeroInHeroList,
  getMoveButton,
  getTownInfoBox,
  getTownInTownList,
  readArmySlots,
  readTownList
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import { aHero, aScenario, aTown } from './builders.js'
import {
  enterTownAt,
  getTownInTownScreenList,
  getVisitingHero,
  leaveTown,
  readTownName,
  readTownScreenTownList,
  readVisitingHeroArmy
} from './town-screen.utils.js'

const PLAYER_RED = 'rgb(255, 0, 0)'
const HERO_NAME = 'Sir Christian'
const EMPTY_SLOTS = new Array(7).fill('')

const gameDefinitions = {
  hero: { name: HERO_NAME },
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: { CASTLE: { name: 'Castle' } }
}

// Two towns side by side, their entrances at (4, 3) and (12, 3); each building covers the two
// tiles either side of its entrance and the rows above. The hero starts two tiles below the
// first entrance.
const WHITEMOON_ENTRANCE = { x: 4, y: 3 }
const KIRKWALL_ENTRANCE = { x: 12, y: 3 }

const aWhitemoon = () => aTown().withId('town-1').named('Whitemoon').at(4, 3)
const aKirkwall = () => aTown().withId('town-2').named('Kirkwall').at(12, 3)

const aTwoTownScenario = ({
  hero = aHero().at(4, 5),
  whitemoon = aWhitemoon(),
  kirkwall = aKirkwall()
} = {}) =>
  aScenario()
    .withSize(16, 7)
    .withEntities(hero, whitemoon, kirkwall)
    .withDefinitions(gameDefinitions)

async function setupApp(scenario, options = {}) {
  return setupMovementBehaviorApp({ loadGameOptions: scenario.build(), ...options })
}

async function captureTownAt({ x, y }, user) {
  await enterTownAt(x, y)
  await leaveTown(user)
}

describe('town ownership behavior', () => {
  describe('starting town', () => {
    test("shows the player's flag on a town the scenario gives the player", async () => {
      await loadAppStyles()
      await setupApp(aTwoTownScenario({ whitemoon: aWhitemoon().ownedByPlayer() }))

      const flag = getTownFlag('town-1')
      expect(flag).not.toBeNull()
      expect(window.getComputedStyle(flag).backgroundColor).toBe(PLAYER_RED)
    })

    test('shows a town the scenario gives the player in the town list when the game starts', async () => {
      await setupApp(aTwoTownScenario({ kirkwall: aKirkwall().ownedByPlayer() }))

      expect(readTownList()).toEqual(['Kirkwall'])
    })

    test('shows a town with no owner without a flag', async () => {
      await setupApp(aTwoTownScenario())

      expect(getTownFlag('town-1')).toBeNull()
    })
  })

  describe('capturing', () => {
    test("shows the player's flag on a neutral town after the hero enters it", async () => {
      const { user } = await setupApp(aTwoTownScenario())

      await captureTownAt(WHITEMOON_ENTRANCE, user)

      expect(getTownFlag('town-1')).not.toBeNull()
    })

    test('adds a captured town to the end of the town list', async () => {
      const { user } = await setupApp(aTwoTownScenario({ kirkwall: aKirkwall().ownedByPlayer() }))

      await captureTownAt(WHITEMOON_ENTRANCE, user)

      expect(readTownList()).toEqual(['Kirkwall', 'Whitemoon'])
    })

    test('keeps a town the player already owns in its place in the list when the hero enters it again', async () => {
      const { user } = await setupApp(
        aTwoTownScenario({ hero: aHero().at(8, 5), whitemoon: aWhitemoon().ownedByPlayer() })
      )
      await captureTownAt(KIRKWALL_ENTRANCE, user)

      await captureTownAt(WHITEMOON_ENTRANCE, user)

      expect(readTownList()).toEqual(['Whitemoon', 'Kirkwall'])
    })
  })

  describe('town list on the adventure panel', () => {
    // On the 60x40 map the 1000x700 map view shows about 31 x 22 tiles, so the town at (30, 20)
    // can be centred without the view hitting the map's edge.
    const aLargeMapScenario = () =>
      aScenario()
        .withSize(60, 40)
        .withEntities(aHero().at(5, 5), aTown().named('Whitemoon').ownedByPlayer().at(30, 20))
        .withDefinitions(gameDefinitions)

    test('centres the map on a town when the player clicks it in the town list', async () => {
      const { user } = await setupApp(aLargeMapScenario(), {
        viewportSize: { width: 1000, height: 700 }
      })

      await user.click(getTownInTownList('Whitemoon'))

      expect(getMapViewCentreTile()).toEqual({ x: 30, y: 20 })
    })

    test("shows the town's name and garrison in the info box when the player clicks it in the town list", async () => {
      const { user } = await setupApp(aTwoTownScenario({ whitemoon: aWhitemoon().ownedByPlayer() }))

      await user.click(getTownInTownList('Whitemoon'))

      const infoBox = getTownInfoBox()
      expect(infoBox.querySelector('h2').textContent).toBe('Whitemoon')
      expect(readArmySlots(infoBox, 'Garrison')).toEqual(EMPTY_SLOTS)
    })

    test('does not move the hero when the player clicks the map with a town selected', async () => {
      const { user } = await setupApp(aTwoTownScenario({ whitemoon: aWhitemoon().ownedByPlayer() }))
      await user.click(getTownInTownList('Whitemoon'))

      confirmTileClickByDispatch(8, 5)
      await flushMicrotasks()

      expectHeroAt(4, 5)
    })

    test('disables Move hero when the player selects a town while the hero has a route', async () => {
      const { user } = await setupApp(aTwoTownScenario({ whitemoon: aWhitemoon().ownedByPlayer() }))
      await clickTile(user, 8, 5)

      await user.click(getTownInTownList('Whitemoon'))

      expect(getMoveButton().disabled).toBe(true)
    })

    test('enables Move hero again when the player selects the hero in the hero list', async () => {
      const { user } = await setupApp(aTwoTownScenario({ whitemoon: aWhitemoon().ownedByPlayer() }))
      await clickTile(user, 8, 5)
      await user.click(getTownInTownList('Whitemoon'))

      await user.click(getHeroInHeroList(HERO_NAME))

      expect(getMoveButton().disabled).toBe(false)
    })

    test('moves the hero when the player clicks the map after a new day starts with a town selected', async () => {
      const { user } = await setupApp(aTwoTownScenario({ whitemoon: aWhitemoon().ownedByPlayer() }))
      await user.click(getTownInTownList('Whitemoon'))

      await clickEndTurn(user)
      confirmTileClickByDispatch(8, 5)
      await flushMicrotasks()

      expectHeroAt(8, 5)
    })

    test('opens the town screen when the player clicks the selected town in the list again', async () => {
      const { user } = await setupApp(aTwoTownScenario({ whitemoon: aWhitemoon().ownedByPlayer() }))
      await user.click(getTownInTownList('Whitemoon'))

      await user.click(getTownInTownList('Whitemoon'))

      expect(readTownName()).toBe('Whitemoon')
    })

    test('opens the town screen when the player double-clicks a town in the list', async () => {
      const { user } = await setupApp(
        aTwoTownScenario({
          whitemoon: aWhitemoon().ownedByPlayer(),
          kirkwall: aKirkwall().ownedByPlayer()
        })
      )

      await user.dblClick(getTownInTownList('Kirkwall'))

      expect(readTownName()).toBe('Kirkwall')
    })
  })

  describe('opening an owned town from the map', () => {
    test('opens the town screen when the player clicks an owned town anywhere but its entrance', async () => {
      const { user } = await setupApp(aTwoTownScenario({ kirkwall: aKirkwall().ownedByPlayer() }))

      await clickTile(user, 11, 2)

      expect(readTownName()).toBe('Kirkwall')
    })

    test('walks the hero into an owned town when the player confirms a move to its entrance', async () => {
      await setupApp(aTwoTownScenario({ whitemoon: aWhitemoon().ownedByPlayer() }))

      await enterTownAt(4, 3)

      expectHeroAt(4, 3)
    })

    test('leaves the visiting hero row empty when the town is opened with no hero in it', async () => {
      const { user } = await setupApp(aTwoTownScenario({ kirkwall: aKirkwall().ownedByPlayer() }))

      await clickTile(user, 11, 2)

      expect(readVisitingHeroArmy()).toEqual(EMPTY_SLOTS)
    })

    test('shows the hero in the visiting hero row when the town is opened from the list while the hero stands at its entrance', async () => {
      const { user } = await setupApp(aTwoTownScenario({ whitemoon: aWhitemoon().ownedByPlayer() }))
      await captureTownAt(WHITEMOON_ENTRANCE, user)

      await user.dblClick(getTownInTownList('Whitemoon'))

      expect(getVisitingHero(HERO_NAME)).toBeTruthy()
    })
  })

  describe('leaving a town', () => {
    test('moves the hero when the player clicks the map after leaving a town opened from the list with the hero in it', async () => {
      const { user } = await setupApp(aTwoTownScenario({ whitemoon: aWhitemoon().ownedByPlayer() }))
      await captureTownAt(WHITEMOON_ENTRANCE, user)
      await user.dblClick(getTownInTownList('Whitemoon'))

      await leaveTown(user)
      confirmTileClickByDispatch(4, 5)
      await flushMicrotasks()

      expectHeroAt(4, 5)
    })
  })

  describe('town list on the town screen', () => {
    test('shows the owned towns in the town screen town list', async () => {
      const { user } = await setupApp(
        aTwoTownScenario({
          whitemoon: aWhitemoon().ownedByPlayer(),
          kirkwall: aKirkwall().ownedByPlayer()
        })
      )

      await user.dblClick(getTownInTownList('Whitemoon'))

      expect(readTownScreenTownList()).toEqual(['Whitemoon', 'Kirkwall'])
    })

    test('switches the town screen to another owned town when the player clicks it in that list', async () => {
      const { user } = await setupApp(
        aTwoTownScenario({
          whitemoon: aWhitemoon().ownedByPlayer(),
          kirkwall: aKirkwall().ownedByPlayer()
        })
      )
      await user.dblClick(getTownInTownList('Whitemoon'))

      await user.click(getTownInTownScreenList('Kirkwall'))

      expect(readTownName()).toBe('Kirkwall')
    })
  })

  describe('after a reload', () => {
    test('keeps a captured town owned', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(aTwoTownScenario(), { eventLog })
      await captureTownAt(WHITEMOON_ENTRANCE, user)

      await setupApp(aTwoTownScenario(), { eventLog })

      expect(getTownFlag('town-1')).not.toBeNull()
    })

    test('keeps the town list in the order the towns were taken', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(aTwoTownScenario({ hero: aHero().at(12, 5) }), {
        eventLog
      })
      await captureTownAt(KIRKWALL_ENTRANCE, user)
      await captureTownAt(WHITEMOON_ENTRANCE, user)

      await setupApp(aTwoTownScenario({ hero: aHero().at(12, 5) }), { eventLog })

      expect(readTownList()).toEqual(['Kirkwall', 'Whitemoon'])
    })

    test('shows the town screen of a town opened from the list again', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aTwoTownScenario({ kirkwall: aKirkwall().ownedByPlayer() })
      const { user } = await setupApp(scenario, { eventLog })
      await user.dblClick(getTownInTownList('Kirkwall'))

      await setupApp(scenario, { eventLog })

      expect(readTownName()).toBe('Kirkwall')
    })
  })
})
