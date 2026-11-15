// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  clickTile,
  expectHeroAt,
  expectResourceNotPresent,
  expectResourcePresent,
  getDwellingEntity,
  getHeroEntity,
  getMapViewCentreTile,
  getMineEntity,
  holdRightButtonOn,
  isTileExplored,
  panCamera,
  queryInfoPopup,
  queryMinimapHeroMarker,
  queryMinimapShield,
  readMinimapHeroTile,
  readMinimapTileColour,
  readOwnerFlags
} from './adventure-map.utils.js'
import {
  clickEndTurn,
  expectCalendarDate,
  expectResourceTotal,
  getTownInTownList,
  queryCapturedMineBox,
  readDateBox,
  readTurnBox
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import { aDwelling, aHero, aMine, aMonster, aResource, aScenario, aTown } from './builders.js'
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

  // The player sees up to 5 tiles from their hero at 5, so up to 10; blue's hero, up to 30. It
  // picks up the pile from 28, explores to (35, 3) at the right edge, and has one step left for
  // the way back towards the unexplored ground on the left.
  test('a blue hero under the fog of war walks its whole turn at once', async () => {
    const { user } = await setupWatchedApp(aWatchedScenario({ pileX: 29 }).withFogOfWar(true))

    await clickEndTurn(user)
    await waitMs(STEP_MS / 2)

    expectHeroAt(34, 3, 'hero-2')
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

  describe("the hourglass and the shield during blue's turn", () => {
    test("the info box shows the hourglass with blue's flag", async () => {
      const { user } = await setupWatchedApp(aWatchedScenario())

      await clickEndTurn(user)
      await waitMs(STEP_MS / 2)

      expect(readTurnBox()).toEqual({
        name: "Blue player's turn",
        pictures: ['Blue player flag', 'Hourglass']
      })
    })

    // Blue's hero picks up the pile at 28 from 27 after two steps, then walks on to the one at 35
    // until its ninth step.
    test('the info box shows the hourglass while a blue hero the player can see walks to its pile and picks it up', async () => {
      const { user } = await setupWatchedApp(
        aWatchedScenario().withEntities(
          aHero().at(5, 4),
          aTown().named('Whitemoon').ownedByPlayer().at(1, 3),
          aBlueHero(25, 4),
          aPile('first-pile', 28, 4),
          aPile('pile', 35, 4)
        )
      )

      await clickEndTurn(user)
      await waitMs(6 * STEP_MS + STEP_MS / 2)

      expectResourceNotPresent('first-pile')
      expect(readTurnBox().name).toBe("Blue player's turn")
    })

    // Blue has only a town, so its turn passes at once; tan's hero walks from 25 to its pile at 35.
    test("the info box shows tan's flag once blue's turn is over and tan's starts", async () => {
      const { user } = await setupWatchedApp(
        aWatchedScenario().withEntities(
          aHero().at(5, 4),
          aTown().named('Whitemoon').ownedByPlayer().at(1, 3),
          aTown().named('Bluewater').ownedBy('blue').at(15, 1),
          aHero().withId('hero-3').ownedBy('tan').at(25, 4),
          aPile('pile', 35, 4)
        )
      )

      await clickEndTurn(user)
      await waitMs(2 * STEP_MS + STEP_MS / 2)

      expect(readTurnBox()).toEqual({
        name: "Tan player's turn",
        pictures: ['Tan player flag', 'Hourglass']
      })
    })

    test("the info box shows the new day's date when the player's turn starts", async () => {
      const { user } = await setupWatchedApp(aWatchedScenario())

      await clickEndTurn(user)
      await waitMs(COMPUTER_TURN_MS)

      expect(readDateBox().text).toBe('Day 2')
    })

    test('the minimap is covered by the shield', async () => {
      const { user } = await setupWatchedApp(aWatchedScenario())

      await clickEndTurn(user)
      await waitMs(STEP_MS / 2)

      expect(queryMinimapShield()).not.toBeNull()
    })

    test("the minimap shows where the blue hero ended up once the player's turn starts", async () => {
      const { user } = await setupWatchedApp(aWatchedScenario())

      await clickEndTurn(user)
      await waitMs(COMPUTER_TURN_MS)

      expect(queryMinimapShield()).toBeNull()
      expect(readMinimapHeroTile('hero-2', { width: 40, height: 5 })).toEqual({ x: 34, y: 4 })
    })
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

    test("the info box shows the hourglass with blue's flag", async () => {
      await reloadDuringBluesTurn()

      expect(readTurnBox().name).toBe("Blue player's turn")
    })

    test('the minimap is covered by the shield', async () => {
      await reloadDuringBluesTurn()

      expect(queryMinimapShield()).not.toBeNull()
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

const PLAYER_BLUE = 'rgb(49, 82, 255)'

const captureDefinitions = {
  ...goldDefinitions,
  mines: readGameData('mines.json'),
  resources: readGameData('resources.json'),
  monsters: readGameData('monsters.json'),
  dwellings: readGameData('dwellings.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const aMineAt = (id, x, y = 1) => aMine().withId(id).at(x, y)

// Mines and dwellings stand on the middle row with their entrance there; blue's hero walks along
// the bottom row and steps up into one from the tile below it.
const aCaptureScenario = (...entities) =>
  aScenario()
    .withSize(30, 3)
    .withEntities(aHero().at(0, 2), ...entities)
    .withDefinitions(captureDefinitions)

describe('computer heroes capturing mines and dwellings behavior', () => {
  // The mine at 18 is four tiles away; the one at 6 is over 1100 further, more than is left.
  test('a blue hero walks to the nearest unflagged mine and flags it blue', async () => {
    const { user } = await setupApp(
      aCaptureScenario(aBlueHero(15, 2), aMineAt('near-mine', 18), aMineAt('far-mine', 6))
    )

    await endTurn(user)

    expect(readOwnerFlags(getMineEntity('near-mine'))).toEqual(['Blue player flag'])
    expect(readOwnerFlags(getMineEntity('far-mine'))).toEqual([])
  })

  test("a blue hero takes the player's mine, and it shows blue's flag on the map and the minimap", async () => {
    await loadAppStyles()
    const { user } = await setupApp(
      aCaptureScenario(aBlueHero(15, 2), aMineAt('mine-1', 18).ownedByPlayer())
    )

    await endTurn(user)

    expect(readOwnerFlags(getMineEntity('mine-1'))).toEqual(['Blue player flag'])
    expect(readMinimapTileColour(18, 1)).toBe(PLAYER_BLUE)
  })

  test('a blue hero walks past a mine blue already owns to the next one', async () => {
    const { user } = await setupApp(
      aCaptureScenario(
        aBlueHero(15, 2),
        aMineAt('blue-mine', 18).ownedBy('blue'),
        aMineAt('free-mine', 22)
      )
    )

    await endTurn(user)

    expect(readOwnerFlags(getMineEntity('free-mine'))).toEqual(['Blue player flag'])
  })

  test('a blue hero picks up a pile nearer than a mine, then goes on to the mine', async () => {
    const { user } = await setupApp(
      aCaptureScenario(aBlueHero(15, 2), aPile('pile', 17, 2), aMineAt('mine-1', 21))
    )

    await endTurn(user)

    expectResourceNotPresent('pile')
    expect(readOwnerFlags(getMineEntity('mine-1'))).toEqual(['Blue player flag'])
  })

  // Every tile next to the mine's entrance but the ones above it is next to the monster too.
  test("a blue hero doesn't walk to a mine it can only reach past a monster", async () => {
    const { user } = await setupApp(
      aCaptureScenario(aBlueHero(15, 2), aMineAt('mine-1', 18), aMonster().at(19, 2))
    )

    await endTurn(user)

    expectHeroAt(15, 2, 'hero-2')
    expect(readOwnerFlags(getMineEntity('mine-1'))).toEqual([])
  })

  test("a blue hero doesn't walk to a mine another player's hero stands on", async () => {
    const { user } = await setupApp(
      aCaptureScenario(
        aBlueHero(15, 2),
        aHero().withId('hero-3').ownedBy('tan').at(18, 1),
        aMineAt('mine-1', 18)
      )
    )

    await endTurn(user)

    expectHeroAt(15, 2, 'hero-2')
    expectHeroAt(18, 1, 'hero-3')
  })

  test('a blue hero flags an unguarded dwelling, and no window opens for the player', async () => {
    const { user } = await setupApp(
      aCaptureScenario(aBlueHero(15, 2), aDwelling().withType('GUARDHOUSE').at(18, 1))
    )

    await endTurn(user)

    expect(readOwnerFlags(getDwellingEntity())).toEqual(['Blue player flag'])
    expect(queryOpenDialogs()).toEqual([])
  })

  test("a blue hero doesn't walk to a guarded dwelling", async () => {
    const { user } = await setupApp(
      aCaptureScenario(aBlueHero(15, 2), aDwelling().withType('MONASTERY').at(18, 1))
    )

    await endTurn(user)

    expectHeroAt(15, 2, 'hero-2')
    expect(readOwnerFlags(getDwellingEntity())).toEqual([])
  })

  test('the player gets no income from their mine the day after blue takes it', async () => {
    const { user } = await setupApp(
      aCaptureScenario(aBlueHero(15, 2), aMineAt('mine-1', 18).ownedByPlayer())
    )

    await endTurn(user)

    expectResourceTotal('Gold', 0)
  })

  // Computer players start with 7500 gold; blue's Gold Mine pays it 1000 on day 2.
  test("blue's Gold Mine puts blue ahead of tan in the Thieves' Guild's gold row the next day", async () => {
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
          aMineAt('mine-1', 23, 3)
        )
        .withDefinitions(captureDefinitions)
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

  // Blue's hero steps under the mine at 28 after three steps and into it on the fourth, then
  // walks on towards the pile at 35.
  const aWatchedCaptureScenario = () =>
    aWatchedScenario()
      .withEntities(
        aHero().at(5, 4),
        aTown().named('Whitemoon').ownedByPlayer().at(1, 3),
        aBlueHero(25, 4),
        aMineAt('mine-1', 28, 3).ownedByPlayer(),
        aPile('pile', 35, 4)
      )
      .withDefinitions(captureDefinitions)

  test('the info box keeps the hourglass when blue takes a mine, and shows no captured mine after', async () => {
    const { user } = await setupWatchedApp(aWatchedCaptureScenario())

    await clickEndTurn(user)
    await waitMs(5 * STEP_MS + STEP_MS / 2)

    expect(readOwnerFlags(getMineEntity('mine-1'))).toEqual(['Blue player flag'])
    expect(readTurnBox().name).toBe("Blue player's turn")

    await waitMs(COMPUTER_TURN_MS)

    expect(queryCapturedMineBox()).toBeNull()
  })

  test('after a reload during blue’s turn the blue hero walks on and flags the mine', async () => {
    const eventLog = createMemoryEventLog()
    const first = await setupWatchedApp(aWatchedCaptureScenario(), { eventLog })
    await clickEndTurn(first.user)
    await waitMs(STEP_MS + STEP_MS / 2)
    await setupWatchedApp(aWatchedCaptureScenario(), { eventLog })

    await waitMs(COMPUTER_TURN_MS)

    expect(readOwnerFlags(getMineEntity('mine-1'))).toEqual(['Blue player flag'])
  })
})

// Blue's hero sees 5 tiles either way along the row, and each step costs 100.
const anExploringRowScenario = (...entities) => aRowScenario(...entities).withFogOfWar(true)

describe('computer heroes exploring behavior', () => {
  // From 25 blue has explored 20 to 29: it walks to 20, next to the unexplored 19, then 15 and
  // 10, 500 each, which spends the 1500 it has.
  test('a blue hero with nothing to go to walks to the nearest tile next to ground blue has not explored, and on', async () => {
    const { user } = await setupApp(anExploringRowScenario(aBlueHero(25)))

    await endTurn(user)

    expectHeroAt(10, 0, 'hero-2')
  })

  // Blue sees the pile at 17 once at 20, and picks it up from 18.
  test('a blue hero finds a pile hidden from blue while exploring and picks it up', async () => {
    const { user } = await setupApp(anExploringRowScenario(aBlueHero(25), aPile('pile', 17)))

    await endTurn(user)

    expectResourceNotPresent('pile')
  })

  // Blue's town at (24, 3) shows blue the bottom row up to 29, so the pile at 28 is known and
  // 1300 away, more than the 500 to the unexplored ground either side of the hero.
  test('a blue hero walks to a pile blue knows of before exploring nearer ground', async () => {
    const { user } = await setupApp(
      aScenario()
        .withSize(30, 5)
        .withFogOfWar(true)
        .withEntities(
          aHero().at(0, 0),
          aTown().ownedBy('blue').at(24, 3),
          aBlueHero(15, 4),
          aPile('pile', 28, 4)
        )
        .withDefinitions({ ...goldDefinitions, towns: readGameData('towns.json') })
    )

    await endTurn(user)

    expectResourceNotPresent('pile')
  })

  // The monster at 9 guards 10, the tile next to the unexplored ground on the left, so blue goes
  // right: to 20 and 25, from where it has explored up to the end of the row.
  test("a blue hero doesn't explore where it can only go past a monster, and explores the other way", async () => {
    const { user } = await setupApp(anExploringRowScenario(aBlueHero(15), aMonster().at(9, 0)))

    await endTurn(user)

    expectHeroAt(25, 0, 'hero-2')
  })

  // Day 1 ends at 10, as above; on day 2 the hero walks to 5, from where blue sees the whole row.
  test('a blue hero keeps exploring on the next day', async () => {
    const { user } = await setupApp(anExploringRowScenario(aBlueHero(25)))

    await endTurn(user)
    await endTurn(user)

    expectHeroAt(5, 0, 'hero-2')
  })

  // The only tile next to unexplored ground, 20, is guarded by the monster at 19.
  test('a blue hero stays where it is once nothing it can reach has unexplored ground next to it', async () => {
    const { user } = await setupApp(anExploringRowScenario(aBlueHero(25), aMonster().at(19, 0)))

    await endTurn(user)

    expectHeroAt(25, 0, 'hero-2')
  })

  test('a blue hero standing in its own town leaves it to explore', async () => {
    const { user } = await setupApp(
      aScenario()
        .withSize(30, 5)
        .withFogOfWar(true)
        .withEntities(aHero().at(0, 0), aTown().ownedBy('blue').at(15, 3), aBlueHero(15, 3))
        .withDefinitions({ ...goldDefinitions, towns: readGameData('towns.json') })
    )

    await endTurn(user)

    expect(getHeroEntity('hero-2').dataset.tileX).not.toBe('15')
  })

  // The player's hero at 29 sees from 24; blue's hero explores from 25 down to 10, out of sight.
  test('a blue hero exploring off the tiles the player has explored has no marker on the minimap', async () => {
    const { user } = await setupApp(
      aScenario()
        .withSize(30)
        .withFogOfWar(true)
        .withEntities(aHero().at(29, 0), aBlueHero(25))
        .withDefinitions(goldDefinitions)
    )

    await endTurn(user)

    expect(queryMinimapHeroMarker('hero-2')).toBeNull()
  })

  // The player's hero at 0 sees up to 5. Blue's hero at 9 sees the pile at 4 and picks it up
  // from 5; from there it sees the whole row, so it stays.
  test('a blue hero walking onto the tiles the player has explored shows on the minimap', async () => {
    const { user } = await setupApp(
      aScenario()
        .withSize(10)
        .withFogOfWar(true)
        .withEntities(aHero().at(0, 0), aBlueHero(9), aPile('pile', 4))
        .withDefinitions(goldDefinitions)
    )

    await endTurn(user)

    expect(readMinimapHeroTile('hero-2', { width: 10, height: 1 })).toEqual({ x: 5, y: 0 })
  })

  // The player's hero at 0 sees up to 5; blue's hero explores from 25 down to 10.
  test("the player's fog of war stays over the tiles a blue hero explored", async () => {
    const { user } = await setupApp(anExploringRowScenario(aBlueHero(25)))

    await endTurn(user)

    expect(isTileExplored(12, 0)).toBe(false)
  })
})
