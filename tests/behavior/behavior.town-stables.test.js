// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import {
  closeInteractionModal,
  endTurns,
  expectInteractionModalClosed,
  expectMovementPoints,
  readMessage
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aBonusObject, aHero, aScenario, aTown } from './builders.js'
import { buildInTown, enterTownAt, leaveTown, readVisitingHeroArmy } from './town-screen.utils.js'

const HEAD_GROOM =
  'The head groom approaches leading a fine looking war horse. "This steed will help speed you in your travels. Alas, his endurance will wane with a lot of heavy riding, and you must return for a fresh mount at the start of the week."'
const MAP_STABLES_VISITED = 'You have already visited the stables this week.'

const gameDefinitions = {
  hero: { name: 'Sir Christian' },
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  bonusObjects: readGameData('bonus-objects.json')
}

const PLENTY_OF_RESOURCES = {
  GOLD_PILE: 20000,
  WOOD_PILE: 50,
  ORE_PILE: 50,
  MERCURY_PILE: 50,
  SULFUR_PILE: 50,
  CRYSTAL_PILE: 50,
  GEMS_PILE: 50
}

const UP_TO_THE_BARRACKS = ['FORT', 'GUARDHOUSE', 'BLACKSMITH', 'BARRACKS']
const WITH_THE_STABLES = [...UP_TO_THE_BARRACKS, 'STABLES']

// The town's entrance is at (4, 3), two steps of 100 above the hero; the map's Stables, when there
// are some, have their entrance below the hero, at (4, 6). No entrance is walked onto or off from
// straight above, so the walk onto the map's Stables costs 241 (a step and a diagonal) and the
// walk between them and the town 441 (three steps and a diagonal).
const TOWN_ENTRANCE = { x: 4, y: 3 }
const MAP_STABLES_ENTRANCE = { x: 4, y: 6 }

const aStablesScenario = ({
  buildings = WITH_THE_STABLES,
  hero = aHero().at(4, 5),
  mapStables = false
} = {}) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(
      hero,
      aTown().named('Whitemoon').ownedByPlayer().withBuildings(buildings).at(4, 3),
      ...(mapStables ? [aBonusObject().withType('STABLES').at(4, 6)] : [])
    )
    .withDefinitions(gameDefinitions)
    .withStartingResources(PLENTY_OF_RESOURCES)

async function setupApp(scenario = aStablesScenario(), { eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    eventLog
  })
}

async function walkTo({ x, y }) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

async function enterTheTown() {
  await enterTownAt(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
}

async function enterAndLeave(user) {
  await enterTheTown()
  await closeInteractionModal(user)
  await leaveTown(user)
}

describe('the Stables in a Castle town', () => {
  test("walking into the town shows the head groom's message", async () => {
    await setupApp()

    await enterTheTown()

    expect(readMessage()).toBe(HEAD_GROOM)
  })

  // 1500, less two steps of 100 into the town, and 400 more.
  test('walking into the town gives the hero 400 movement points, above the maximum', async () => {
    const { user } = await setupApp()

    await enterAndLeave(user)

    expectMovementPoints(1700)
  })

  test('the next day the hero starts with the maximum and 400 more', async () => {
    const { user } = await setupApp()
    await enterAndLeave(user)

    await endTurns(user, 1)

    expectMovementPoints(1900)
  })

  test('on the first day of the next week the hero starts with the maximum', async () => {
    const { user } = await setupApp()
    await enterAndLeave(user)

    await endTurns(user, 7)

    expectMovementPoints(1500)
  })

  // 1700 after the first visit, less a step out of the town and one back.
  test('walking into the town again the same week shows no message and gives nothing', async () => {
    const { user } = await setupApp()
    await enterAndLeave(user)
    await walkTo({ x: 4, y: 4 })

    await enterTheTown()

    expectInteractionModalClosed()
    await leaveTown(user)
    expectMovementPoints(1500)
  })

  // 1500, less 241 onto the map's Stables and 441 into the town, and 400 from the map's Stables
  // only.
  test("a hero who visited the map's Stables this week gets no message and nothing in the town", async () => {
    const { user } = await setupApp(aStablesScenario({ mapStables: true }))
    await walkTo(MAP_STABLES_ENTRANCE)
    await closeInteractionModal(user)

    await enterTheTown()

    expectInteractionModalClosed()
    await leaveTown(user)
    expectMovementPoints(1218)
  })

  // 1700 after the town, less 441 down to the map's Stables.
  test("a hero who got the bonus in the town gets nothing at the map's Stables that week", async () => {
    const { user } = await setupApp(aStablesScenario({ mapStables: true }))
    await enterAndLeave(user)

    await walkTo(MAP_STABLES_ENTRANCE)

    expect(readMessage()).toBe(MAP_STABLES_VISITED)
    expectMovementPoints(1259)
  })

  test('building the Stables while a hero is in the town shows the message', async () => {
    const { user } = await setupApp(aStablesScenario({ buildings: UP_TO_THE_BARRACKS }))
    await enterTheTown()

    await buildInTown(user, 'Stables')

    expect(readMessage()).toBe(HEAD_GROOM)
  })

  test('building the Stables while a hero is in the town gives the hero 400 movement points', async () => {
    const { user } = await setupApp(aStablesScenario({ buildings: UP_TO_THE_BARRACKS }))
    await enterTheTown()

    await buildInTown(user, 'Stables')

    await closeInteractionModal(user)
    await leaveTown(user)
    expectMovementPoints(1700)
  })

  test('a hero with Cavaliers keeps them as Cavaliers', async () => {
    const hero = aHero()
      .withArmy([{ creature: 'CAVALIER', count: 5 }])
      .at(4, 5)
    const { user } = await setupApp(aStablesScenario({ hero }))

    await enterTheTown()

    await closeInteractionModal(user)
    expect(readVisitingHeroArmy()[0]).toBe('Cavaliers 5')
  })

  test('walking into a Castle town without the Stables shows no message', async () => {
    await setupApp(aStablesScenario({ buildings: UP_TO_THE_BARRACKS }))

    await enterTheTown()

    expectInteractionModalClosed()
  })

  test('after a reload no message shows again', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aStablesScenario()
    const { user: firstUser } = await setupApp(scenario, { eventLog })
    await enterAndLeave(firstUser)

    await setupApp(scenario, { eventLog })

    expectInteractionModalClosed()
  })

  test('after a reload the hero still starts the next day with the 400', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aStablesScenario()
    const { user: firstUser } = await setupApp(scenario, { eventLog })
    await enterAndLeave(firstUser)
    const { user } = await setupApp(scenario, { eventLog })

    await endTurns(user, 1)

    expectMovementPoints(1900)
  })
})
