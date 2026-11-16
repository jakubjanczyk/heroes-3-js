// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { confirmTileClickByDispatch, holdRightButtonOn } from './adventure-map.utils.js'
import {
  clickEndTurn,
  expectResourceTotal,
  getTownInTownList,
  readTownBox
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { ARMY_THAT_WINS, aHero, aResource, aScenario, aTown } from './builders.js'
import {
  enterTownAt,
  leaveTown,
  openTavern,
  openThievesGuild,
  readThievesGuildRanking,
  readTownPicture
} from './town-screen.utils.js'

const buildings = readGameData('buildings.json')
const towns = readGameData('towns.json')

const gameDefinitions = {
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns,
  buildings,
  tavern: readGameData('tavern.json')
}

// Computer players start with 7500 gold, 10 wood, 10 ore and 4 of each rare resource, too little
// for some buildings; a test that needs one of them makes it cheaper.
function withCheaperBuildings(costs) {
  const cheaper = (catalogue) =>
    Object.fromEntries(
      Object.entries(catalogue).map(([buildingId, building]) => [
        buildingId,
        costs[buildingId] ? { ...building, cost: costs[buildingId] } : building
      ])
    )
  return {
    ...gameDefinitions,
    buildings: cheaper(buildings),
    towns: { ...towns, CASTLE: { ...towns.CASTLE, buildings: cheaper(towns.CASTLE.buildings) } }
  }
}

const CASTLE_HALL_BUILDINGS = towns.CASTLE.hall.flat(2)

const allCastleBuildingsExcept = (left) =>
  CASTLE_HALL_BUILDINGS.filter((buildingId) => !left.includes(buildingId))

const HALLS = ['TAVERN', 'TOWN_HALL', 'MAGE_GUILD_1', 'MARKETPLACE', 'BLACKSMITH', 'CITY_HALL']
const FORTS = ['FORT', 'CITADEL', 'CASTLE']

// Besides the Capitol, these need more gold, wood or rare resources than blue starts with, or
// water.
const UNAFFORDABLE_BUT_CAPITOL = [
  'MAGE_GUILD_3',
  'MAGE_GUILD_4',
  'SHIPYARD',
  'LIGHTHOUSE',
  'TRAINING_GROUNDS',
  'UPG_TRAINING_GROUNDS',
  'PORTAL_OF_GLORY',
  'UPG_PORTAL_OF_GLORY'
]

const COMPUTER_TURN_MS = 2000

// Blue's towns stand with their entrances at (4, 3) and (12, 3); each covers the two tiles either
// side of its entrance and the rows above. The player's hero starts two tiles below the first.
const KIRKWALL = { x: 4, y: 3 }
const GREENFIELD = { x: 12, y: 3 }

const aBlueKirkwall = () => aTown().withId('town-1').named('Kirkwall').ownedBy('blue').at(4, 3)
const aBlueGreenfield = () => aTown().withId('town-2').named('Greenfield').ownedBy('blue').at(12, 3)

const aTownScenario = (...entities) =>
  aScenario()
    .withSize(30, 7)
    .withEntities(aHero().at(4, 5), ...entities)
    .withDefinitions(gameDefinitions)

async function setupApp(scenario, options = {}) {
  return setupMovementBehaviorApp({ loadGameOptions: scenario.build(), ...options })
}

async function endDays(user, days = 1) {
  for (let day = 0; day < days; day += 1) {
    await clickEndTurn(user)
    await waitMs(COMPUTER_TURN_MS)
  }
}

const PLAYER_WALK_MS = 1000

// The player takes the empty town and reads what stands in it.
async function readPictureOfTownTakenAt({ x, y }) {
  confirmTileClickByDispatch(x, y)
  await waitMs(PLAYER_WALK_MS)
  return readTownPicture()
}

describe('computer towns building behavior', () => {
  test("blue's town builds a Tavern on its first turn, on the way to its Town Hall", async () => {
    const { user } = await setupApp(aTownScenario(aBlueKirkwall()))

    await endDays(user)

    expect(await readPictureOfTownTakenAt(KIRKWALL)).toEqual(['Tavern', 'Village Hall'])
  })

  // Blue pays 500 for the Tavern and earns 500 from its Village Hall, so it still has 7500.
  test("blue's town builds its Town Hall the next day, once its Tavern stands", async () => {
    const { user } = await setupApp(aTownScenario(aBlueKirkwall()))

    await endDays(user, 2)

    expect(await readPictureOfTownTakenAt(KIRKWALL)).toEqual(['Tavern', 'Town Hall'])
  })

  // Of the buildings its City Hall needs, the Mage Guild comes first; the Brotherhood of the
  // Sword would come first without them.
  test("blue's town builds a building its next hall needs before the rest", async () => {
    const { user } = await setupApp(
      aTownScenario(aBlueKirkwall().withBuildings(['TAVERN', 'TOWN_HALL']))
    )

    await endDays(user)

    expect(await readPictureOfTownTakenAt(KIRKWALL)).toEqual([
      'Mage Guild Level 1',
      'Tavern',
      'Town Hall'
    ])
  })

  test("blue's town with all its halls builds its first dwelling", async () => {
    const { user } = await setupApp(
      aTownScenario(aBlueKirkwall().withBuildings([...HALLS, ...FORTS, 'CAPITOL']))
    )

    await endDays(user)

    expect(await readPictureOfTownTakenAt(KIRKWALL)).toEqual([
      'Blacksmith',
      'Capitol',
      'Castle',
      'Guardhouse',
      'Mage Guild Level 1',
      'Marketplace',
      'Tavern'
    ])
  })

  test("blue's town builds its next dwelling before upgrading one", async () => {
    const { user } = await setupApp(
      aTownScenario(aBlueKirkwall().withBuildings([...HALLS, ...FORTS, 'CAPITOL', 'GUARDHOUSE']))
    )

    await endDays(user)

    const picture = await readPictureOfTownTakenAt(KIRKWALL)
    expect(picture).toContain("Archers' Tower")
    expect(picture).not.toContain('Upg. Guardhouse')
  })

  // The Training Grounds need the Stables; without them blue would upgrade its Guardhouse.
  test("blue's town builds what its next dwelling needs before upgrading one", async () => {
    const { user } = await setupApp(
      aTownScenario(
        aBlueKirkwall().withBuildings([
          ...HALLS,
          ...FORTS,
          'CAPITOL',
          'GUARDHOUSE',
          'ARCHERS_TOWER',
          'GRIFFIN_TOWER',
          'BARRACKS',
          'MONASTERY'
        ])
      )
    )

    await endDays(user)

    const picture = await readPictureOfTownTakenAt(KIRKWALL)
    expect(picture).toContain('Stables')
    expect(picture).not.toContain('Upg. Guardhouse')
  })

  // The Tavern's chain is the first in the Hall after the halls and the forts.
  test("blue's town with all its halls and dwellings builds from the rest of the Hall", async () => {
    const { user } = await setupApp(
      aTownScenario(
        aBlueKirkwall().withBuildings(
          allCastleBuildingsExcept(['BROTHERHOOD_OF_THE_SWORD', 'RESOURCE_SILO'])
        )
      )
    )

    await endDays(user)

    const picture = await readPictureOfTownTakenAt(KIRKWALL)
    expect(picture).toContain('Brotherhood of the Sword')
    expect(picture).not.toContain('Resource Silo')
  })

  // The Capitol costs 10000 gold, more than blue's 7500.
  test("blue's town passes over a building blue can't pay for and builds the next one it can", async () => {
    const { user } = await setupApp(
      aTownScenario(aBlueKirkwall().withBuildings([...HALLS, ...FORTS]))
    )

    await endDays(user)

    const picture = await readPictureOfTownTakenAt(KIRKWALL)
    expect(picture).toContain('Guardhouse')
    expect(picture).not.toContain('Capitol')
  })

  test("each of blue's towns builds on the same day", async () => {
    const { user } = await setupApp(aTownScenario(aBlueKirkwall(), aBlueGreenfield()))
    await endDays(user)
    await enterTownAt(KIRKWALL.x, KIRKWALL.y)
    await leaveTown(user)

    expect(await readPictureOfTownTakenAt(GREENFIELD)).toEqual(['Tavern', 'Village Hall'])
  })

  test("blue's second town doesn't build a Capitol while its first has one", async () => {
    const { user } = await setupApp(
      aScenario()
        .withSize(30, 7)
        .withEntities(
          aHero().at(12, 5),
          aBlueKirkwall().withBuildings(allCastleBuildingsExcept(UNAFFORDABLE_BUT_CAPITOL)),
          aBlueGreenfield().withBuildings([...HALLS, ...FORTS])
        )
        .withDefinitions(withCheaperBuildings({ CAPITOL: { GOLD_PILE: 1000 } }))
    )

    await endDays(user)

    const picture = await readPictureOfTownTakenAt(GREENFIELD)
    expect(picture).not.toContain('Capitol')
    expect(picture).toContain('Guardhouse')
  })

  test("the player's resources don't change when blue builds", async () => {
    const { user } = await setupApp(aTownScenario(aBlueKirkwall()).withoutStartingResources())

    await endDays(user)

    expectResourceTotal('Gold', 20000)
  })

  // Blue pays 2500 for its Town Hall and earns 1000 from it: 6000 against tan's 7500. The player
  // starts with nothing and earns 500 from each Village Hall. The Gold row needs two Taverns.
  test("blue's building puts blue behind tan in the Thieves' Guild's gold row", async () => {
    // Their garrisons keep blue's hero away.
    const aTavernTown = (id, name, x) =>
      aTown()
        .withId(id)
        .named(name)
        .ownedByPlayer()
        .withBuildings(['TAVERN'])
        .withGarrison(ARMY_THAT_WINS)
        .at(x, 3)
    const { user } = await setupApp(
      aTownScenario(
        aBlueKirkwall().withBuildings(['TAVERN']),
        aTavernTown('town-3', 'Whitemoon', 18),
        aTavernTown('town-4', 'Stonehold', 24),
        aHero().withId('hero-3').ownedBy('tan').at(29, 0)
      )
    )

    await endDays(user)
    await user.dblClick(getTownInTownList('Whitemoon'))
    await openTavern(user)
    await openThievesGuild(user)

    expect(readThievesGuildRanking('Gold')).toEqual({
      '1st': ['tan'],
      '2nd': ['blue'],
      '3rd': ['red']
    })
  })

  test("the fort icon in blue's town box shows a Fort the day after blue builds one", async () => {
    const { user } = await setupApp(
      aTownScenario(aBlueKirkwall().withBuildings([...HALLS, 'CAPITOL'])).withDefinitions(
        withCheaperBuildings({ FORT: { GOLD_PILE: 1000 } })
      )
    )

    await endDays(user)
    await holdRightButtonOn(user, KIRKWALL.x, KIRKWALL.y)

    expect(readTownBox(screen.getByRole('tooltip')).buildings).toEqual(['Fort'])
  })

  describe("while blue's hero walks after its town has built", () => {
    const STEP_MS = 100

    // Blue's hero walks along the bottom row from 15 to the tile next to its pile at 25, one
    // step every 100 ms.
    const aWatchedScenario = () =>
      aTownScenario(
        aBlueKirkwall(),
        aHero().withId('hero-2').ownedBy('blue').at(15, 6),
        aResource().withId('pile').at(25, 6)
      )

    async function setupWatchedApp(options = {}) {
      return setupApp(aWatchedScenario(), {
        movementStepDelayMs: STEP_MS,
        ...options
      })
    }

    test("after a reload during blue's turn, blue's town doesn't build a second building that day", async () => {
      const eventLog = createMemoryEventLog()
      const first = await setupWatchedApp({ eventLog })
      await clickEndTurn(first.user)
      await waitMs(2 * STEP_MS + STEP_MS / 2)
      await setupWatchedApp({ eventLog })

      await waitMs(COMPUTER_TURN_MS)

      expect(await readPictureOfTownTakenAt(KIRKWALL)).toEqual(['Tavern', 'Village Hall'])
    })
  })
})
