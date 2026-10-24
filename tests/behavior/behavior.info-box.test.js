// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { confirmMove } from './adventure-map.utils.js'
import {
  getHeroInfoBox,
  getTownInfoBox,
  getTownInTownList,
  queryFoundResourcesBox,
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
