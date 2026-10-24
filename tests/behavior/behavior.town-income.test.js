// @vitest-environment jsdom
import { describe, test } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import { endTurns, expectResourceTotal } from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aMine, aScenario, aTown } from './builders.js'
import { buildInTown, enterTownAt, leaveTown } from './town-screen.utils.js'

const gameDefinitions = {
  mines: readGameData('mines.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

// Two towns side by side, their entrances at (4, 3) and (12, 3); each building covers the two
// tiles either side of its entrance and the rows above. The hero starts two tiles below the
// first entrance, and a mine's entrance is four tiles to its right. The player starts with no
// resources, so the gold on the resource bar is what the towns paid.
const WHITEMOON_ENTRANCE = { x: 4, y: 3 }
const MINE_ENTRANCE = { x: 8, y: 5 }

const aWhitemoon = () => aTown().withId('town-1').named('Whitemoon').at(4, 3)
const aKirkwall = () => aTown().withId('town-2').named('Kirkwall').at(12, 3)

const aTownScenario = ({ whitemoon = aWhitemoon(), kirkwall = aKirkwall() } = {}) =>
  aScenario()
    .withSize(16, 7)
    .withEntities(
      aHero().at(4, 5),
      whitemoon,
      kirkwall,
      aMine().withType('GOLD_MINE').at(MINE_ENTRANCE.x, MINE_ENTRANCE.y)
    )
    .withDefinitions(gameDefinitions)

async function setupApp(scenario, options = {}) {
  return setupMovementBehaviorApp({ loadGameOptions: scenario.build(), ...options })
}

describe('town income behavior', () => {
  test('adds 500 gold at the start of the next day for an owned town with its Village Hall', async () => {
    const { user } = await setupApp(aTownScenario({ whitemoon: aWhitemoon().ownedByPlayer() }))

    await endTurns(user, 1)

    expectResourceTotal('Gold', 500)
  })

  test.each([
    { hall: 'Town Hall', buildings: ['TOWN_HALL'], gold: 1000 },
    { hall: 'City Hall', buildings: ['TOWN_HALL', 'CITY_HALL'], gold: 2000 },
    { hall: 'Capitol', buildings: ['TOWN_HALL', 'CITY_HALL', 'CAPITOL'], gold: 4000 }
  ])('pays only its highest hall, $gold gold a day with a $hall', async ({ buildings, gold }) => {
    const { user } = await setupApp(
      aTownScenario({ whitemoon: aWhitemoon().ownedByPlayer().withBuildings(buildings) })
    )

    await endTurns(user, 1)

    expectResourceTotal('Gold', gold)
  })

  test('pays nothing for a town the player does not own', async () => {
    const { user } = await setupApp(aTownScenario())

    await endTurns(user, 1)

    expectResourceTotal('Gold', 0)
  })

  test('adds up the income of every owned town', async () => {
    const { user } = await setupApp(
      aTownScenario({
        whitemoon: aWhitemoon().ownedByPlayer(),
        kirkwall: aKirkwall().ownedByPlayer().withBuildings(['TOWN_HALL', 'CITY_HALL'])
      })
    )

    await endTurns(user, 1)

    // Village Hall 500 + City Hall 2000.
    expectResourceTotal('Gold', 2500)
  })

  test('pays for a town captured today from the next day', async () => {
    const { user } = await setupApp(aTownScenario())
    await enterTownAt(WHITEMOON_ENTRANCE.x, WHITEMOON_ENTRANCE.y)
    await leaveTown(user)

    await endTurns(user, 1)

    expectResourceTotal('Gold', 500)
  })

  test('pays the new hall from the day after it is built', async () => {
    const { user } = await setupApp(
      aTownScenario({ whitemoon: aWhitemoon().ownedByPlayer().withBuildings(['TAVERN']) })
        // Exactly the Town Hall's cost, so all the gold after the day ends is the town's income.
        .withStartingResources({ GOLD_PILE: 2500 })
    )
    await enterTownAt(WHITEMOON_ENTRANCE.x, WHITEMOON_ENTRANCE.y)
    await buildInTown(user, 'Town Hall')
    await leaveTown(user)

    await endTurns(user, 1)

    expectResourceTotal('Gold', 1000)
  })

  test('adds town and mine income together on the same day', async () => {
    const { user } = await setupApp(aTownScenario({ whitemoon: aWhitemoon().ownedByPlayer() }))
    confirmTileClickByDispatch(MINE_ENTRANCE.x, MINE_ENTRANCE.y)

    await endTurns(user, 1)

    // Village Hall 500 + Gold mine 1000.
    expectResourceTotal('Gold', 1500)
  })

  test('keeps the gold towns paid over several days after a reload', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aTownScenario({ whitemoon: aWhitemoon().ownedByPlayer() })
    const { user } = await setupApp(scenario, { eventLog })
    await endTurns(user, 3)

    await setupApp(scenario, { eventLog })

    expectResourceTotal('Gold', 1500)
  })
})
