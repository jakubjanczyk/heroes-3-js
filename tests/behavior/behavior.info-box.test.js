// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { confirmMove } from './adventure-map.utils.js'
import {
  clickEndTurn,
  closeInteractionModal,
  endTurns,
  getDateBox,
  getHeroInfoBox,
  getTownInfoBox,
  getTownInTownList,
  queryDateBox,
  queryFoundResourcesBox,
  readDateBox,
  readFoundResources
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { aHero, aResource, aScenario, aTown } from './builders.js'

const gameDefinitions = {
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

// The hero starts next to a pile of 100 gold, east of it; the town stands away from both.
const aPickupScenario = () =>
  aScenario()
    .withSize(8, 7)
    .withEntities(
      aHero(),
      aResource().withType('GOLD_PILE').at(1, 0),
      aTown().named('Whitemoon').ownedByPlayer().at(4, 4)
    )
    .withDefinitions(gameDefinitions)

const MESSAGE_MS = 3000

async function setupApp(options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: aPickupScenario().build(),
    appConfig: { fadeOutMsByKind: { RESOURCE: 0 } },
    ...options
  })
}

async function collectGold(user) {
  await confirmMove(user, 1, 0)
}

describe('info box behavior', () => {
  test("shows the collected resource's picture and amount in place of the hero", async () => {
    const { user } = await setupApp()

    await collectGold(user)

    expect(readFoundResources()).toEqual(['Gold 100'])
  })

  test('keeps showing the resource just before 3 seconds have passed', async () => {
    const { user } = await setupApp()

    await collectGold(user)
    await waitMs(MESSAGE_MS - 1)

    expect(readFoundResources()).toEqual(['Gold 100'])
  })

  test('shows the hero again once 3 seconds have passed', async () => {
    const { user } = await setupApp()

    await collectGold(user)
    await waitMs(MESSAGE_MS)

    expect(queryFoundResourcesBox()).toBeNull()
    expect(getHeroInfoBox()).toBeTruthy()
  })

  test('shows the hero again when the player clicks the info box', async () => {
    const { user } = await setupApp()

    await collectGold(user)
    await user.click(queryFoundResourcesBox())

    expect(queryFoundResourcesBox()).toBeNull()
    expect(getHeroInfoBox()).toBeTruthy()
  })

  test('shows the hero again when the hero starts moving', async () => {
    const { user } = await setupApp()

    await collectGold(user)
    await confirmMove(user, 0, 1)

    expect(queryFoundResourcesBox()).toBeNull()
    expect(getHeroInfoBox()).toBeTruthy()
  })

  test("shows the town's box when the player selects a town in the town list while the resource is shown", async () => {
    const { user } = await setupApp()

    await collectGold(user)
    await user.click(getTownInTownList('Whitemoon'))
    await flushMicrotasks()

    expect(queryFoundResourcesBox()).toBeNull()
    expect(getTownInfoBox()).toBeTruthy()
  })

  test('shows the hero, not the resource, after a reload right after the pickup', async () => {
    const eventLog = createMemoryEventLog()
    const { user } = await setupApp({ eventLog })
    await collectGold(user)

    await setupApp({ eventLog })
    await flushMicrotasks()

    expect(queryFoundResourcesBox()).toBeNull()
    expect(getHeroInfoBox()).toBeTruthy()
  })
})

describe('info box date behavior', () => {
  test('shows "Day 2" in the info box after the player ends the first day', async () => {
    const { user } = await setupApp()

    await clickEndTurn(user)

    expect(readDateBox().text).toBe('Day 2')
  })

  // The day counts within the week and the week within the month: day 29 is Month 2, Week 1, Day 1.
  test.each([
    [2, 'Day 2'],
    [7, 'Day 7'],
    [8, 'Week 2'],
    [10, 'Day 3'],
    [22, 'Week 4'],
    [29, 'Week 1']
  ])('shows the date of day %i as "%s"', async (day, text) => {
    const { user } = await setupApp()

    await endTurns(user, day - 1)

    expect(readDateBox().text).toBe(text)
  })

  test('shows the rising sun on a new day', async () => {
    const { user } = await setupApp()

    await clickEndTurn(user)

    expect(readDateBox().picture).toBe('Sunrise')
  })

  test.each([
    [8, 2],
    [15, 3],
    [22, 4],
    [29, 1]
  ])('shows on day %i the sunrise of week %i', async (day, week) => {
    const { user } = await setupApp()

    await endTurns(user, day - 1)

    expect(readDateBox().picture).toBe(`Sunrise of week ${week}`)
  })

  test('keeps showing the date just before 3 seconds have passed', async () => {
    const { user } = await setupApp()

    await clickEndTurn(user)
    await waitMs(MESSAGE_MS - 1)

    expect(readDateBox().text).toBe('Day 2')
  })

  test('shows the hero again once 3 seconds have passed', async () => {
    const { user } = await setupApp()

    await clickEndTurn(user)
    await waitMs(MESSAGE_MS)

    expect(queryDateBox()).toBeNull()
    expect(getHeroInfoBox()).toBeTruthy()
  })

  test('shows the hero again when the player clicks the info box during the date', async () => {
    const { user } = await setupApp()

    await clickEndTurn(user)
    await user.click(getDateBox())

    expect(queryDateBox()).toBeNull()
    expect(getHeroInfoBox()).toBeTruthy()
  })

  test('shows the hero again when the hero starts moving', async () => {
    const { user } = await setupApp()

    await clickEndTurn(user)
    await confirmMove(user, 0, 1)

    expect(queryDateBox()).toBeNull()
    expect(getHeroInfoBox()).toBeTruthy()
  })

  test("shows the town's box when the player selects a town in the town list while the date shows", async () => {
    const { user } = await setupApp()

    await clickEndTurn(user)
    await user.click(getTownInTownList('Whitemoon'))
    await flushMicrotasks()

    expect(queryDateBox()).toBeNull()
    expect(getTownInfoBox()).toBeTruthy()
  })

  test('shows the hero, not the date, after a reload right after ending the day', async () => {
    const eventLog = createMemoryEventLog()
    const { user } = await setupApp({ eventLog })
    await clickEndTurn(user)

    await setupApp({ eventLog })
    await flushMicrotasks()

    expect(queryDateBox()).toBeNull()
    expect(getHeroInfoBox()).toBeTruthy()
  })

  test('keeps showing the date while the new week popup is still open after 3 seconds', async () => {
    const { user } = await setupApp()
    await endTurns(user, 6)

    await clickEndTurn(user)
    await waitMs(MESSAGE_MS)

    expect(readDateBox().text).toBe('Week 2')
  })

  test('shows the hero again when the player clicks the date after closing the new week popup', async () => {
    const { user } = await setupApp()
    await endTurns(user, 6)
    await clickEndTurn(user)
    await waitMs(MESSAGE_MS)
    await closeInteractionModal(user)

    await user.click(getDateBox())

    expect(queryDateBox()).toBeNull()
    expect(getHeroInfoBox()).toBeTruthy()
  })
})
