// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  clickTile,
  expectHeroAt,
  expectResourceNotPresent,
  expectResourcePresent,
  getHeroEntity,
  getMapViewCentreTile,
  holdRightButtonOn,
  panCamera,
  queryInfoPopup
} from './adventure-map.utils.js'
import {
  clickEndTurn,
  expectCalendarDate,
  expectResourceTotal,
  getTownInTownList
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { aHero, aMonster, aResource, aScenario, aTown } from './builders.js'
import { clickHeroInHeroList } from './hero-screen.utils.js'
import { openTavern, openThievesGuild, readThievesGuildRanking } from './town-screen.utils.js'

const goldDefinitions = { resources: { GOLD_PILE: { name: 'Gold', amount: 100 } } }

// Long enough for every computer hero's walk and the piles fading out after it.
const COMPUTER_TURN_MS = 2000

const aBlueHero = (x, y = 0) => aHero().withId('hero-2').ownedBy('blue').at(x, y)

const aPile = (id, x, y = 0) => aResource().withId(id).at(x, y)

// The player's hero stands at the left end of a one-row map, out of the computer heroes' way.
const aRowScenario = (...entities) =>
  aScenario()
    .withSize(30)
    .withEntities(aHero().at(0, 0), ...entities)
    .withDefinitions(goldDefinitions)

async function setupApp(scenario) {
  return setupMovementBehaviorApp({ loadGameOptions: scenario.build() })
}

async function endTurn(user) {
  await clickEndTurn(user)
  await waitMs(COMPUTER_TURN_MS)
}

describe('computer turns behavior', () => {
  // A hero picks a pile up from the tile next to it, paying 100 for the step onto it: the pile
  // at 18 costs 300, and the one at 4 then 1400 more, over the 1500 a day.
  test('a blue hero walks to the nearest resource pile and picks it up', async () => {
    const { user } = await setupApp(
      aRowScenario(aBlueHero(15), aPile('near-pile', 18), aPile('far-pile', 4))
    )

    await endTurn(user)

    expectResourceNotPresent('near-pile')
    expectResourcePresent('far-pile')
  })

  // From 17, with 1200 left, the hero walks 12 tiles to 5, next to the far pile.
  test('a blue hero walks towards a pile too far for one day', async () => {
    const { user } = await setupApp(
      aRowScenario(aBlueHero(15), aPile('near-pile', 18), aPile('far-pile', 4))
    )

    await endTurn(user)

    expectHeroAt(5, 0, 'hero-2')
  })

  test('a blue hero picks up a pile too far for one day on the next day', async () => {
    const { user } = await setupApp(
      aRowScenario(aBlueHero(15), aPile('near-pile', 18), aPile('far-pile', 4))
    )

    await endTurn(user)
    await endTurn(user)

    expectResourceNotPresent('far-pile')
  })

  // 300 for the pile at 18, then 400 from 17 for the one at 13.
  test('a blue hero picks up several piles in one turn while its movement points last', async () => {
    const { user } = await setupApp(
      aRowScenario(aBlueHero(15), aPile('first-pile', 18), aPile('second-pile', 13))
    )

    await endTurn(user)

    expectResourceNotPresent('first-pile')
    expectResourceNotPresent('second-pile')
  })

  test("the player's resources don't change when a blue hero picks up a pile", async () => {
    const { user } = await setupApp(aRowScenario(aBlueHero(15), aPile('pile', 18)))

    await endTurn(user)

    expectResourceTotal('Gold', 0)
  })

  // The monster at 19 guards the pile's tile, so picking it up starts a battle.
  test("a blue hero doesn't walk to a pile it can only reach past a monster", async () => {
    const { user } = await setupApp(
      aRowScenario(aBlueHero(15), aPile('pile', 18), aMonster().at(19, 0))
    )

    await endTurn(user)

    expectHeroAt(15, 0, 'hero-2')
    expectResourcePresent('pile')
  })

  // The town's entrance is at (15, 3); its building covers the tiles either side and the rows
  // above, so a hero leaves it through the row below, where the pile is.
  test('a blue hero standing in its town stays there', async () => {
    const { user } = await setupApp(
      aScenario()
        .withSize(30, 5)
        .withEntities(
          aHero().at(0, 3),
          aTown().ownedBy('blue').at(15, 3),
          aBlueHero(15, 3),
          aPile('pile', 18, 4)
        )
        .withDefinitions({ ...goldDefinitions, towns: readGameData('towns.json') })
    )

    await endTurn(user)

    expectHeroAt(15, 3, 'hero-2')
    expectResourcePresent('pile')
  })

  // Both heroes are five tiles from the pile; blue plays before tan.
  test("blue's hero gets to a pile before tan's", async () => {
    const { user } = await setupApp(
      aRowScenario(
        aBlueHero(10),
        aHero().withId('hero-3').ownedBy('tan').at(20, 0),
        aPile('pile', 15)
      )
    )

    await endTurn(user)

    expectHeroAt(14, 0, 'hero-2')
    expectHeroAt(20, 0, 'hero-3')
  })

  // Computer players start with 7500 gold and the pile gives 100; the player starts with none
  // and gets only their towns' income.
  test("a blue hero picking up gold puts blue ahead of tan in the Thieves' Guild's gold row", async () => {
    const tavernTown = (id, name, x) =>
      aTown().withId(id).named(name).ownedByPlayer().withBuildings(['TAVERN']).at(x, 3)
    const { user } = await setupApp(
      aScenario()
        .withSize(30, 5)
        .withEntities(
          aHero().at(0, 4),
          tavernTown('town-1', 'Whitemoon', 4),
          tavernTown('town-2', 'Greenfield', 12),
          aBlueHero(20, 4),
          aHero().withId('hero-3').ownedBy('tan').at(29, 0),
          aPile('pile', 23, 4)
        )
        .withDefinitions({
          ...goldDefinitions,
          towns: readGameData('towns.json'),
          buildings: readGameData('buildings.json'),
          tavern: readGameData('tavern.json')
        })
    )

    await endTurn(user)
    await user.dblClick(getTownInTownList('Whitemoon'))
    await openTavern(user)
    await openThievesGuild(user)

    expect(readThievesGuildRanking('Gold')).toEqual({
      '1st': ['blue'],
      '2nd': ['tan'],
      '3rd': ['red']
    })
  })
})

const STEP_MS = 100

// Five tiles wide, so the map can centre on any tile from 2 to 37.
const VIEWPORT = { width: 160, height: 160 }

// The player's hero stands at (5, 4) by their town, on the bottom row of a 40 by 5 map; blue's
// hero walks along that row from 25 to the tile next to its pile at 35, one step every 100 ms.
const aWatchedScenario = ({ playerHeroX = 5, blueHeroX = 25, pileX = 35 } = {}) =>
  aScenario()
    .withSize(40, 5)
    .withEntities(
      aHero().at(playerHeroX, 4),
      aTown().named('Whitemoon').ownedByPlayer().at(1, 3),
      aBlueHero(blueHeroX, 4),
      aPile('pile', pileX, 4)
    )
    .withDefinitions({ ...goldDefinitions, towns: readGameData('towns.json') })

async function setupWatchedApp(scenario, { eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    movementStepDelayMs: STEP_MS,
    viewportSize: VIEWPORT,
    eventLog
  })
}

function readHeroTile(heroId) {
  const hero = getHeroEntity(heroId)
  return { x: Number(hero.dataset.tileX), y: Number(hero.dataset.tileY) }
}

function queryOpenDialogs() {
  return screen.queryAllByRole('dialog')
}

describe('watching computer turns behavior', () => {
  test('a blue hero the player can see walks to its pile one step at a time', async () => {
    const { user } = await setupWatchedApp(aWatchedScenario())

    await clickEndTurn(user)
    await waitMs(2 * STEP_MS + STEP_MS / 2)

    expectHeroAt(27, 4, 'hero-2')
  })

  test('the map follows a blue hero the player can see', async () => {
    const { user } = await setupWatchedApp(aWatchedScenario())

    await clickEndTurn(user)
    await waitMs(2 * STEP_MS + STEP_MS / 2)

    expect(getMapViewCentreTile().x).toBe(27)
  })

  // The player sees up to 5 tiles from their hero at 5, so up to 10; blue's hero, up to 30.
  test('a blue hero under the fog of war is next to its pile at once', async () => {
    const { user } = await setupWatchedApp(aWatchedScenario({ pileX: 29 }).withFogOfWar(true))

    await clickEndTurn(user)
    await waitMs(STEP_MS / 2)

    expectHeroAt(28, 4, 'hero-2')
  })

  // The player sees up to 12 from their hero at 7. From 16 to the pile at 11 the steps up to 13
  // are under the fog; 13 to 12 ends on a tile the player has explored, so it is the first shown.
  test('a blue hero walking out of the fog of war is shown from its first step onto an explored tile', async () => {
    const { user } = await setupWatchedApp(
      aWatchedScenario({ playerHeroX: 7, blueHeroX: 16, pileX: 11 }).withFogOfWar(true)
    )

    await clickEndTurn(user)
    await waitMs(STEP_MS / 2)
    expectHeroAt(13, 4, 'hero-2')

    await waitMs(STEP_MS)
    expectHeroAt(12, 4, 'hero-2')
  })

  // The same walk out of the fog as above: the map stays on the player's hero at 7 while the
  // steps are hidden, then follows the first one shown.
  test('the map follows a blue hero walking out of the fog of war only once the player can see it', async () => {
    const { user } = await setupWatchedApp(
      aWatchedScenario({ playerHeroX: 7, blueHeroX: 16, pileX: 11 }).withFogOfWar(true)
    )

    await clickEndTurn(user)
    await waitMs(STEP_MS / 2)
    expect(getMapViewCentreTile().x).toBe(7)

    await waitMs(STEP_MS)
    expect(getMapViewCentreTile().x).toBe(12)
  })

  test("the map is back on the player's hero when their turn starts", async () => {
    const { user } = await setupWatchedApp(aWatchedScenario())

    await clickEndTurn(user)
    await waitMs(COMPUTER_TURN_MS)

    expect(getMapViewCentreTile().x).toBe(5)
  })

  describe("the player's clicks and keys during blue's turn", () => {
    test.each([
      {
        input: 'a move to a tile',
        act: (user) => clickTile(user, 7, 4).then(() => clickTile(user, 7, 4))
      },
      { input: 'End Turn', act: (user) => clickEndTurn(user) },
      { input: 'the hero in the hero list', act: (user) => clickHeroInHeroList(user, 'Hero') },
      {
        input: 'a town in the town list',
        act: (user) => user.dblClick(getTownInTownList('Whitemoon'))
      },
      {
        input: 'System options',
        act: (user) => user.click(screen.getByRole('button', { name: 'System options' }))
      },
      { input: 'a right-click on a tile', act: (user) => holdRightButtonOn(user, 6, 4) },
      { input: 'an arrow key', act: async () => panCamera('ArrowLeft', 3) }
    ])('$input changes nothing', async ({ act }) => {
      const { user } = await setupWatchedApp(aWatchedScenario())
      await clickEndTurn(user)
      await waitMs(STEP_MS + STEP_MS / 2)

      await act(user)

      expect(queryOpenDialogs()).toEqual([])
      expect(queryInfoPopup()).toBeNull()
      expect(getMapViewCentreTile().x).toBe(readHeroTile('hero-2').x)
      await waitMs(COMPUTER_TURN_MS)
      expectHeroAt(5, 4)
      expectCalendarDate({ month: 1, week: 1, day: 2 })
    })
  })

  test("the player's hero walks again once blue's turn is over", async () => {
    const { user } = await setupWatchedApp(aWatchedScenario())
    await clickEndTurn(user)
    await waitMs(COMPUTER_TURN_MS)

    await clickTile(user, 7, 4)
    await clickTile(user, 7, 4)
    await waitMs(COMPUTER_TURN_MS)

    expectHeroAt(7, 4)
  })

  describe("after a reload during blue's turn", () => {
    async function reloadDuringBluesTurn() {
      const eventLog = createMemoryEventLog()
      const { user } = await setupWatchedApp(aWatchedScenario(), { eventLog })
      await clickEndTurn(user)
      await waitMs(2 * STEP_MS + STEP_MS / 2)
      return setupWatchedApp(aWatchedScenario(), { eventLog })
    }

    test('the blue hero walks on and picks up its pile, and the next day starts', async () => {
      await reloadDuringBluesTurn()

      await waitMs(COMPUTER_TURN_MS)

      expectHeroAt(34, 4, 'hero-2')
      expectResourceNotPresent('pile')
      expectCalendarDate({ month: 1, week: 1, day: 2 })
    })

    test("a move to a tile changes nothing until blue's turn is over", async () => {
      const { user } = await reloadDuringBluesTurn()
      await waitMs(STEP_MS / 2)

      await clickTile(user, 7, 4)
      await clickTile(user, 7, 4)
      await waitMs(COMPUTER_TURN_MS)

      expectHeroAt(5, 4)
    })
  })
})
