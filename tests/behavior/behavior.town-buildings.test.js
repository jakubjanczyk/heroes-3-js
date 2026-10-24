// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { clickEndTurn, expectResourceTotal, getTownInTownList } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  pressKey,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'
import { GRASS, WATER } from './terrain-codes.js'
import {
  buildInTown,
  closeHall,
  enterTownAt,
  getBuildButton,
  getTownInTownScreenList,
  leaveTown,
  openBuildingWindow,
  openHall,
  queryHall,
  queryTownScreen,
  readBuildingCost,
  readBuildingRequirements,
  readHall,
  readHallStatus
} from './town-screen.utils.js'

const gameDefinitions = {
  hero: { name: 'Sir Christian' },
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

// Two towns side by side, their entrances at (4, 3) and (12, 3); each building covers the two
// tiles either side of its entrance and the rows above. The hero starts two tiles below the
// first entrance. The player starts with Heroes 3's Normal resources, enough for any building here,
// unless a test says otherwise.
const WHITEMOON_ENTRANCE = { x: 4, y: 3 }
const MAP_WIDTH = 16
const MAP_HEIGHT = 7

const aWhitemoon = () => aTown().withId('town-1').named('Whitemoon').ownedByPlayer().at(4, 3)
const aKirkwall = () => aTown().withId('town-2').named('Kirkwall').ownedByPlayer().at(12, 3)

const aTownScenario = ({ whitemoon = aWhitemoon(), kirkwall = aKirkwall() } = {}) =>
  aScenario()
    .withSize(MAP_WIDTH, MAP_HEIGHT)
    .withEntities(aHero().at(4, 5), whitemoon, kirkwall)
    .withDefinitions(gameDefinitions)
    .withoutStartingResources()

async function setupApp(scenario, options = {}) {
  return setupMovementBehaviorApp({ loadGameOptions: scenario.build(), ...options })
}

async function setupAppInWhitemoon(scenario = aTownScenario(), options = {}) {
  const app = await setupApp(scenario, options)
  await enterTownAt(WHITEMOON_ENTRANCE.x, WHITEMOON_ENTRANCE.y)
  return app
}

async function openTownFromTownList(user, townName) {
  await user.click(getTownInTownList(townName))
  await user.click(getTownInTownList(townName))
}

const CAPITOL_REQUIREMENTS = [
  'TAVERN',
  'TOWN_HALL',
  'MAGE_GUILD_1',
  'MARKETPLACE',
  'BLACKSMITH',
  'CITY_HALL',
  'FORT',
  'CITADEL',
  'CASTLE'
]

describe('town buildings behavior', () => {
  describe('the Hall', () => {
    test('opens the Hall when the player clicks the Hall icon on the town screen', async () => {
      const { user } = await setupAppInWhitemoon()

      await openHall(user)

      expect(queryHall()).toBeTruthy()
    })

    test('lists the Castle buildings in rows as Heroes 3 does, each slot showing the next building of its chain', async () => {
      const { user } = await setupAppInWhitemoon()

      await openHall(user)

      expect(readHall()).toEqual([
        ['Town Hall', 'Fort', 'Tavern', 'Blacksmith'],
        ['Marketplace', 'Mage Guild Level 1', 'Shipyard'],
        ['Stables', 'Griffin Bastion'],
        ['Guardhouse', "Archers' Tower", 'Griffin Tower', 'Barracks'],
        ['Monastery', 'Training Grounds', 'Portal of Glory']
      ])
    })

    test('shows the last building of a fully built chain as built', async () => {
      const { user } = await setupAppInWhitemoon(
        aTownScenario({ whitemoon: aWhitemoon().withBuildings(['FORT', 'CITADEL', 'CASTLE']) })
      )

      await openHall(user)

      expect(readHall()[0][1]).toBe('Castle')
      expect(readHallStatus('Castle')).toBe('Built')
    })

    test('shows the buildings a scenario starts the town with', async () => {
      const { user } = await setupAppInWhitemoon(
        aTownScenario({ whitemoon: aWhitemoon().withBuildings(['TAVERN']) })
      )

      await openHall(user)

      expect(readHall()[0][2]).toBe('Brotherhood of the Sword')
    })

    test('returns to the town screen when the player closes the Hall', async () => {
      const { user } = await setupAppInWhitemoon()
      await openHall(user)

      await closeHall(user)

      expect(queryHall()).toBeNull()
      expect(queryTownScreen()).toBeTruthy()
    })

    test('returns to the town screen when the player presses Escape in the Hall', async () => {
      const { user } = await setupAppInWhitemoon()
      await openHall(user)

      await pressKey(user, '{Escape}')

      expect(queryHall()).toBeNull()
      expect(queryTownScreen()).toBeTruthy()
    })
  })

  describe('what can be built', () => {
    test('shows a building whose required buildings stand as one that can be built', async () => {
      const { user } = await setupAppInWhitemoon()

      await openHall(user)

      expect(readHallStatus('Tavern')).toBe('Can be built')
    })

    test('shows a building whose required buildings are missing as one that cannot be built yet', async () => {
      const { user } = await setupAppInWhitemoon()

      await openHall(user)

      // The Town Hall needs a Tavern.
      expect(readHallStatus('Town Hall')).toBe('Requirements not met')
    })

    test('shows that the Shipyard cannot be built in a town with no water next to it', async () => {
      const { user } = await setupAppInWhitemoon()

      await openHall(user)

      expect(readHallStatus('Shipyard')).toBe('Needs water nearby')
    })

    test('shows the Shipyard as one that can be built in a town by the water', async () => {
      // Water on the tile right of the town's building, at (7, 2).
      const tiles = new Array(MAP_WIDTH * MAP_HEIGHT).fill(GRASS)
      tiles[2 * MAP_WIDTH + 7] = WATER
      const { user } = await setupAppInWhitemoon(aTownScenario().withTiles(tiles))

      await openHall(user)

      expect(readHallStatus('Shipyard')).toBe('Can be built')
    })

    test('shows that nothing more can be built today once the town has built something', async () => {
      const { user } = await setupAppInWhitemoon()
      await buildInTown(user, 'Tavern')

      await openHall(user)

      expect(readHallStatus('Blacksmith')).toBe('Already built here today')
    })

    test('shows that a second Capitol cannot be built while another town of the player has one', async () => {
      const { user } = await setupAppInWhitemoon(
        aTownScenario({
          whitemoon: aWhitemoon().withBuildings([...CAPITOL_REQUIREMENTS, 'CAPITOL']),
          kirkwall: aKirkwall().withBuildings(CAPITOL_REQUIREMENTS)
        })
      )
      await user.click(getTownInTownScreenList('Kirkwall'))

      await openHall(user)

      expect(readHallStatus('Capitol')).toBe('Only one Capitol per player')
    })

    test('can build again in the town on the next day', async () => {
      const { user } = await setupAppInWhitemoon()
      await buildInTown(user, 'Tavern')
      await leaveTown(user)
      await clickEndTurn(user)

      await openTownFromTownList(user, 'Whitemoon')
      await openHall(user)

      expect(readHallStatus('Blacksmith')).toBe('Can be built')
    })
  })

  describe('building', () => {
    test("shows a building's cost and the buildings it still needs when the player clicks it", async () => {
      const { user } = await setupAppInWhitemoon(
        aTownScenario({ whitemoon: aWhitemoon().withBuildings(['MAGE_GUILD_1']) })
      )
      await openHall(user)

      const monastery = await openBuildingWindow(user, 'Monastery')

      expect(readBuildingCost(monastery)).toEqual([
        '5 Wood',
        '2 Mercury',
        '5 Ore',
        '2 Sulfur',
        '2 Crystal',
        '2 Gems',
        '3000 Gold'
      ])
      expect(readBuildingRequirements(monastery)).toBe('Requires: Barracks')
    })

    test('marks a building the player builds as built', async () => {
      const { user } = await setupAppInWhitemoon()

      await buildInTown(user, 'Blacksmith')

      await openHall(user)
      expect(readHallStatus('Blacksmith')).toBe('Built')
    })

    test('moves the slot on to the next building of its chain once one is built', async () => {
      const { user } = await setupAppInWhitemoon()

      await buildInTown(user, 'Tavern')

      await openHall(user)
      expect(readHall()[0][2]).toBe('Brotherhood of the Sword')
    })

    test('returns to the town screen once the building is built', async () => {
      const { user } = await setupAppInWhitemoon()

      await buildInTown(user, 'Tavern')

      expect(queryHall()).toBeNull()
      expect(queryTownScreen()).toBeTruthy()
    })

    test.each([
      ['its required buildings are missing', [], 'Town Hall'],
      ['it is already built', ['TAVERN', 'BROTHERHOOD_OF_THE_SWORD'], 'Brotherhood of the Sword'],
      ['the town has no water next to it', [], 'Shipyard']
    ])('disables Build when %s', async (_case, buildings, buildingName) => {
      const { user } = await setupAppInWhitemoon(
        aTownScenario({ whitemoon: aWhitemoon().withBuildings(buildings) })
      )
      await openHall(user)

      const buildingWindow = await openBuildingWindow(user, buildingName)

      expect(getBuildButton(buildingWindow).disabled).toBe(true)
    })

    test('disables Build when the town has already built something today', async () => {
      const { user } = await setupAppInWhitemoon()
      await buildInTown(user, 'Tavern')
      await openHall(user)

      const blacksmith = await openBuildingWindow(user, 'Blacksmith')

      expect(getBuildButton(blacksmith).disabled).toBe(true)
    })

    test('keeps the buildings after a reload', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupAppInWhitemoon(aTownScenario(), { eventLog })
      await buildInTown(user, 'Tavern')

      const reloaded = await setupApp(aTownScenario(), { eventLog })
      await openHall(reloaded.user)

      expect(readHall()[0][2]).toBe('Brotherhood of the Sword')
    })

    test('builds only in the town the player built in', async () => {
      const { user } = await setupAppInWhitemoon()
      await buildInTown(user, 'Tavern')

      await user.click(getTownInTownScreenList('Kirkwall'))
      await openHall(user)

      expect(readHall()[0][2]).toBe('Tavern')
    })
  })
  describe('paying for buildings', () => {
    // The Tavern costs 5 Wood and 500 Gold, the Blacksmith 5 Wood and 1000 Gold.
    test("takes a building's cost off the player's resources when the player builds it", async () => {
      const { user } = await setupAppInWhitemoon(
        aTownScenario().withStartingResources({ WOOD_PILE: 20, GOLD_PILE: 2000 })
      )

      await buildInTown(user, 'Tavern')

      expectResourceTotal('Wood', 15)
      expectResourceTotal('Gold', 1500)
    })

    test('can build when the player has exactly what the building costs', async () => {
      const { user } = await setupAppInWhitemoon(
        aTownScenario().withStartingResources({ WOOD_PILE: 5, GOLD_PILE: 500 })
      )

      await buildInTown(user, 'Tavern')

      await openHall(user)
      expect(readHall()[0][2]).toBe('Brotherhood of the Sword')
    })

    test('shows a building the player cannot afford as one that cannot be built for lack of resources', async () => {
      const { user } = await setupAppInWhitemoon(
        aTownScenario().withStartingResources({ WOOD_PILE: 5, GOLD_PILE: 499 })
      )

      await openHall(user)

      expect(readHallStatus('Tavern')).toBe('Not enough resources')
    })

    test('disables Build when the player cannot afford the building', async () => {
      const { user } = await setupAppInWhitemoon(
        aTownScenario().withStartingResources({ WOOD_PILE: 5, GOLD_PILE: 499 })
      )
      await openHall(user)

      const tavern = await openBuildingWindow(user, 'Tavern')

      expect(getBuildButton(tavern).disabled).toBe(true)
    })

    test('marks the resources the player is short of in the building window', async () => {
      const { user } = await setupAppInWhitemoon(
        aTownScenario().withStartingResources({ WOOD_PILE: 5, GOLD_PILE: 499 })
      )
      await openHall(user)

      const tavern = await openBuildingWindow(user, 'Tavern')

      expect(readBuildingCost(tavern)).toEqual(['5 Wood', '500 Gold (not enough)'])
    })

    test('shows a building as unaffordable in another town once building has spent the resources', async () => {
      const { user } = await setupAppInWhitemoon(
        aTownScenario().withStartingResources({ WOOD_PILE: 10, GOLD_PILE: 1000 })
      )
      // Leaves 5 Wood and 500 Gold, short of the Blacksmith's 1000 Gold.
      await buildInTown(user, 'Tavern')

      await user.click(getTownInTownScreenList('Kirkwall'))
      await openHall(user)

      expect(readHallStatus('Blacksmith')).toBe('Not enough resources')
    })

    test('keeps the resources spent after a reload', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aTownScenario().withStartingResources({ WOOD_PILE: 20, GOLD_PILE: 2000 })
      const { user } = await setupAppInWhitemoon(scenario, { eventLog })
      await buildInTown(user, 'Tavern')

      await setupApp(scenario, { eventLog })

      expectResourceTotal('Wood', 15)
      expectResourceTotal('Gold', 1500)
    })
  })
})
