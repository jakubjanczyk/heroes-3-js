// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { endTurns, expectResourceTotal, getTownInTownList } from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aTown, aTownDefinition } from './builders.js'
import {
  buildInTown,
  clickBuildingOnPicture,
  leaveTown,
  readTownMessage
} from './town-screen.utils.js'

const LOWEST_ROLL = () => 0
const HIGHEST_ROLL = () => 0.99

const POND_DESCRIPTION = 'The pond fills with something precious each week.'
const FOUNTAIN_DESCRIPTION = 'The fountain brings the defenders luck.'
const NOTHING_YET = 'The pond has not produced anything yet.'

const pond = {
  name: 'Mystic Pond',
  cost: { GOLD_PILE: 1000 },
  description: POND_DESCRIPTION,
  weeklyResources: {
    anyOf: ['MERCURY_PILE', 'SULFUR_PILE', 'CRYSTAL_PILE', 'GEMS_PILE'],
    amount: { min: 1, max: 4 }
  }
}

const fountain = {
  name: 'Fountain of Fortune',
  cost: { GOLD_PILE: 1000 },
  requires: ['POND'],
  upgrades: 'POND',
  structure: false,
  description: FOUNTAIN_DESCRIPTION
}

const WETLAND = 'WETLAND'

const gameDefinitions = {
  hero: { name: 'Sir Christian' },
  resources: readGameData('resources.json'),
  buildings: readGameData('buildings.json'),
  towns: {
    [WETLAND]: aTownDefinition()
      .withName('Wetland')
      .withBuildings({ POND: pond, FOUNTAIN: fountain })
      .withHall([[['VILLAGE_HALL'], ['POND', 'FOUNTAIN']]])
      .withPicture({
        VILLAGE_HALL: { x: 100, y: 100 },
        POND: { x: 300, y: 100 },
        FOUNTAIN: { x: 300, y: 100 }
      })
      .build()
  }
}

const aMarshford = (buildings) =>
  aTown().withType(WETLAND).named('Marshford').ownedByPlayer().withBuildings(buildings).at(4, 3)

const aPondScenario = (buildings) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(aHero().at(4, 5), aMarshford(buildings))
    .withDefinitions(gameDefinitions)
    .withStartingResources({ GOLD_PILE: 5000 })

function setupApp({ buildings = ['POND'], random = HIGHEST_ROLL, eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: aPondScenario(buildings).build(),
    appConfig: { random, interactionModalTransitionMs: 0 },
    eventLog
  })
}

async function openMarshford(user) {
  await user.dblClick(getTownInTownList('Marshford'))
}

describe('Mystic Pond', () => {
  test.each([
    { roll: 'lowest', random: LOWEST_ROLL, resource: 'Mercury', amount: 1 },
    { roll: 'highest', random: HIGHEST_ROLL, resource: 'Gems', amount: 4 }
  ])("a new week adds the pond's rare resource to the resource bar, $amount $resource on the $roll roll", async ({
    random,
    resource,
    amount
  }) => {
    const { user } = await setupApp({ random })

    await endTurns(user, 7)

    expectResourceTotal(resource, amount)
  })

  test('the pond gives nothing on the other days of the week', async () => {
    const { user } = await setupApp()

    await endTurns(user, 6)

    expectResourceTotal('Gems', 0)
  })

  test('a pond built during the week first produces when the next week starts', async () => {
    const { user } = await setupApp({ buildings: [] })
    await openMarshford(user)
    await buildInTown(user, 'Mystic Pond')
    await leaveTown(user)

    await endTurns(user, 6)
    expectResourceTotal('Gems', 0)
    await endTurns(user, 1)

    expectResourceTotal('Gems', 4)
  })

  test('clicking the pond says what it produced this week', async () => {
    const { user } = await setupApp()
    await endTurns(user, 7)
    await openMarshford(user)

    await clickBuildingOnPicture(user, 'Mystic Pond')

    expect(readTownMessage()).toBe(`${POND_DESCRIPTION}\n\nThe pond produced 4 Gems this week.`)
  })

  test('clicking the pond before its first week says it has not produced anything yet', async () => {
    const { user } = await setupApp()
    await openMarshford(user)

    await clickBuildingOnPicture(user, 'Mystic Pond')

    expect(readTownMessage()).toBe(`${POND_DESCRIPTION}\n\n${NOTHING_YET}`)
  })

  test('the pond keeps producing after the Fountain of Fortune is built over it', async () => {
    const { user } = await setupApp({ buildings: ['POND', 'FOUNTAIN'] })

    await endTurns(user, 7)

    expectResourceTotal('Gems', 4)
  })

  test("clicking the Fountain of Fortune shows its description, then the pond's and what the pond produced", async () => {
    const { user } = await setupApp({ buildings: ['POND', 'FOUNTAIN'] })
    await endTurns(user, 7)
    await openMarshford(user)

    await clickBuildingOnPicture(user, 'Fountain of Fortune')

    expect(readTownMessage()).toBe(
      `${FOUNTAIN_DESCRIPTION}\n\n${POND_DESCRIPTION}\n\nThe pond produced 4 Gems this week.`
    )
  })

  test('after a reload the pond says the same resources it produced', async () => {
    const eventLog = createMemoryEventLog()
    const { user } = await setupApp({ eventLog })
    await endTurns(user, 7)

    const reloaded = await setupApp({ random: LOWEST_ROLL, eventLog })
    await openMarshford(reloaded.user)
    await clickBuildingOnPicture(reloaded.user, 'Mystic Pond')

    expect(readTownMessage()).toBe(`${POND_DESCRIPTION}\n\nThe pond produced 4 Gems this week.`)
  })
})
