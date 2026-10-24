// @vitest-environment jsdom
import { within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { confirmMove } from './adventure-map.utils.js'
import {
  clickEndTurn,
  closeInteractionModal,
  endTurns,
  getDateBox,
  getHeroInfoBox,
  getKingdomOverview,
  getTownInfoBox,
  getTownInTownList,
  queryDateBox,
  queryFoundResourcesBox,
  queryKingdomOverview,
  readDateBox,
  readFoundResources,
  readKingdomOverviewFlags,
  readKingdomOverviewHalls
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { aHero, aResource, aScenario, aTown } from './builders.js'
import { buildInTown, enterTownAt, leaveTown } from './town-screen.utils.js'

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

    expect(queryFoundResourcesBox()).toBeNull()
    expect(getTownInfoBox()).toBeTruthy()
  })

  test('shows the hero, not the resource, after a reload right after the pickup', async () => {
    const eventLog = createMemoryEventLog()
    const { user } = await setupApp({ eventLog })
    await collectGold(user)

    await setupApp({ eventLog })

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

    expect(queryDateBox()).toBeNull()
    expect(getTownInfoBox()).toBeTruthy()
  })

  test('shows the hero, not the date, after a reload right after ending the day', async () => {
    const eventLog = createMemoryEventLog()
    const { user } = await setupApp({ eventLog })
    await clickEndTurn(user)

    await setupApp({ eventLog })

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

// Two towns side by side, their entrances at (4, 3) and (12, 3); each building covers the two
// tiles either side of its entrance and the rows above. The hero starts two tiles below the
// first entrance.
const WHITEMOON_ENTRANCE = { x: 4, y: 3 }

const aWhitemoon = () => aTown().withId('town-1').named('Whitemoon').ownedByPlayer().at(4, 3)
const aKirkwall = () => aTown().withId('town-2').named('Kirkwall').ownedByPlayer().at(12, 3)

const aTwoTownScenario = ({ whitemoon = aWhitemoon(), kirkwall = aKirkwall() } = {}) =>
  aScenario()
    .withSize(16, 7)
    .withEntities(aHero().at(4, 5), whitemoon, kirkwall)
    .withDefinitions(gameDefinitions)

const NO_TOWNS = { 'Village Hall': 0, 'Town Hall': 0, 'City Hall': 0, Capitol: 0 }

async function setupTwoTownApp(scenario = aTwoTownScenario(), options = {}) {
  return setupMovementBehaviorApp({ loadGameOptions: scenario.build(), ...options })
}

async function openKingdomOverview(user) {
  await user.click(getHeroInfoBox())
}

async function openDateFromOverview(user) {
  await openKingdomOverview(user)
  await user.click(getKingdomOverview())
}

describe('info box views behavior', () => {
  test("shows the kingdom overview when the player clicks the hero's info box", async () => {
    const { user } = await setupTwoTownApp()

    await user.click(getHeroInfoBox())

    expect(getKingdomOverview()).toBeTruthy()
  })

  test("shows the kingdom overview when the player clicks a town's info box", async () => {
    const { user } = await setupTwoTownApp()
    await user.click(getTownInTownList('Whitemoon'))

    await user.click(getTownInfoBox())

    expect(getKingdomOverview()).toBeTruthy()
  })

  test.each([
    [[], 'Village Hall'],
    [['TAVERN', 'TOWN_HALL'], 'Town Hall'],
    [['TAVERN', 'TOWN_HALL', 'CITY_HALL'], 'City Hall'],
    [['TAVERN', 'TOWN_HALL', 'CITY_HALL', 'CAPITOL'], 'Capitol']
  ])('counts a town with the buildings %j under its %s', async (buildings, hall) => {
    const { user } = await setupTwoTownApp(
      aTwoTownScenario({
        whitemoon: aTown().withId('town-1').named('Whitemoon').at(4, 3),
        kirkwall: aKirkwall().withBuildings(buildings)
      })
    )

    await openKingdomOverview(user)

    expect(readKingdomOverviewHalls()).toEqual({ ...NO_TOWNS, [hall]: 1 })
  })

  test('counts two towns with the same hall as 2', async () => {
    const { user } = await setupTwoTownApp(
      aTwoTownScenario({
        whitemoon: aWhitemoon().withBuildings(['TAVERN', 'TOWN_HALL']),
        kirkwall: aKirkwall().withBuildings(['TAVERN', 'TOWN_HALL'])
      })
    )

    await openKingdomOverview(user)

    expect(readKingdomOverviewHalls()).toEqual({ ...NO_TOWNS, 'Town Hall': 2 })
  })

  test("leaves towns the player doesn't own out of the counts", async () => {
    const { user } = await setupTwoTownApp(
      aTwoTownScenario({
        kirkwall: aTown().withId('town-2').named('Kirkwall').withBuildings(['CAPITOL']).at(12, 3)
      })
    )

    await openKingdomOverview(user)

    expect(readKingdomOverviewHalls()).toEqual({ ...NO_TOWNS, 'Village Hall': 1 })
  })

  test('counts a town once the hero has captured it', async () => {
    const { user } = await setupTwoTownApp(
      aTwoTownScenario({ whitemoon: aTown().withId('town-1').named('Whitemoon').at(4, 3) })
    )
    await enterTownAt(WHITEMOON_ENTRANCE.x, WHITEMOON_ENTRANCE.y)
    await leaveTown(user)

    await openKingdomOverview(user)

    expect(readKingdomOverviewHalls()).toEqual({ ...NO_TOWNS, 'Village Hall': 2 })
  })

  test('counts a town under its new hall once the player builds it', async () => {
    const { user } = await setupTwoTownApp(
      aTwoTownScenario({ whitemoon: aWhitemoon().withBuildings(['TAVERN']) }).withStartingResources(
        {
          GOLD_PILE: 2500
        }
      )
    )
    await enterTownAt(WHITEMOON_ENTRANCE.x, WHITEMOON_ENTRANCE.y)
    await buildInTown(user, 'Town Hall')
    await leaveTown(user)

    await openKingdomOverview(user)

    expect(readKingdomOverviewHalls()).toEqual({ ...NO_TOWNS, 'Village Hall': 1, 'Town Hall': 1 })
  })

  test('shows empty allies and enemies rows under the halls', async () => {
    const { user } = await setupTwoTownApp()

    await openKingdomOverview(user)

    expect(readKingdomOverviewFlags()).toEqual({ allies: [], enemies: [] })
  })

  test('keeps showing the overview just before 3 seconds have passed', async () => {
    const { user } = await setupTwoTownApp()

    await openKingdomOverview(user)
    await waitMs(MESSAGE_MS - 1)

    expect(getKingdomOverview()).toBeTruthy()
  })

  test('shows the hero again once 3 seconds have passed on the overview', async () => {
    const { user } = await setupTwoTownApp()

    await openKingdomOverview(user)
    await waitMs(MESSAGE_MS)

    expect(queryKingdomOverview()).toBeNull()
    expect(getHeroInfoBox()).toBeTruthy()
  })

  // The game starts on the first day of week 1.
  test('shows the date when the player clicks the kingdom overview', async () => {
    const { user } = await setupTwoTownApp()

    await openDateFromOverview(user)

    expect(readDateBox()).toEqual({ text: 'Week 1', picture: 'Sunrise of week 1' })
  })

  test("shows the day's date when the overview is clicked later in the week", async () => {
    const { user } = await setupTwoTownApp()
    await endTurns(user, 2)
    await user.click(getDateBox())

    await openDateFromOverview(user)

    expect(readDateBox()).toEqual({ text: 'Day 3', picture: 'Sunrise' })
  })

  test("shows the week and its sunrise when the overview is clicked on a week's first day", async () => {
    const { user } = await setupTwoTownApp()
    await endTurns(user, 7)
    await user.click(getDateBox())

    await openDateFromOverview(user)

    expect(readDateBox()).toEqual({ text: 'Week 2', picture: 'Sunrise of week 2' })
  })

  test("shows the day's date after a reload when the overview is clicked", async () => {
    const eventLog = createMemoryEventLog()
    const { user } = await setupTwoTownApp(aTwoTownScenario(), { eventLog })
    await endTurns(user, 2)
    const reloaded = await setupTwoTownApp(aTwoTownScenario(), { eventLog })

    await openDateFromOverview(reloaded.user)

    expect(readDateBox().text).toBe('Day 3')
  })

  test('keeps showing the date shown by a click just before 3 seconds have passed', async () => {
    const { user } = await setupTwoTownApp()
    await openKingdomOverview(user)
    await waitMs(MESSAGE_MS - 1)

    await user.click(getKingdomOverview())
    await waitMs(MESSAGE_MS - 1)

    expect(readDateBox().text).toBe('Week 1')
  })

  test('shows the hero again once 3 seconds have passed on the date shown by a click', async () => {
    const { user } = await setupTwoTownApp()

    await openDateFromOverview(user)
    await waitMs(MESSAGE_MS)

    expect(queryDateBox()).toBeNull()
    expect(getHeroInfoBox()).toBeTruthy()
  })

  test('shows the hero again when the player clicks the date shown by a click', async () => {
    const { user } = await setupTwoTownApp()
    await openDateFromOverview(user)

    await user.click(getDateBox())

    expect(queryDateBox()).toBeNull()
    expect(getHeroInfoBox()).toBeTruthy()
  })

  test("shows the town's box again after going round the views from a selected town", async () => {
    const { user } = await setupTwoTownApp()
    await user.click(getTownInTownList('Whitemoon'))
    await user.click(getTownInfoBox())
    await user.click(getKingdomOverview())

    await user.click(getDateBox())

    expect(getTownInfoBox()).toBeTruthy()
  })

  test("keeps the hero's box when the player clicks a unit in it", async () => {
    const { user } = await setupTwoTownApp()

    await user.click(within(getHeroInfoBox()).getByRole('img', { name: /^Skeleton/ }))

    expect(queryKingdomOverview()).toBeNull()
    expect(getHeroInfoBox()).toBeTruthy()
  })

  test("keeps the town's box when the player clicks a unit in its garrison", async () => {
    const { user } = await setupTwoTownApp(
      aTwoTownScenario({
        whitemoon: aWhitemoon().withGarrison([{ creature: 'SKELETON', count: 5 }])
      })
    )
    await user.click(getTownInTownList('Whitemoon'))

    await user.click(within(getTownInfoBox()).getByRole('img', { name: /^Skeleton/ }))

    expect(queryKingdomOverview()).toBeNull()
    expect(getTownInfoBox()).toBeTruthy()
  })

  test('shows the hero again when the hero starts moving while the overview is shown', async () => {
    const { user } = await setupTwoTownApp()
    await openKingdomOverview(user)

    await confirmMove(user, 5, 5)

    expect(queryKingdomOverview()).toBeNull()
    expect(getHeroInfoBox()).toBeTruthy()
  })

  test("shows the town's box when the player selects a town in the town list while the overview is shown", async () => {
    const { user } = await setupTwoTownApp()
    await openKingdomOverview(user)

    await user.click(getTownInTownList('Whitemoon'))

    expect(queryKingdomOverview()).toBeNull()
    expect(getTownInfoBox()).toBeTruthy()
  })
})
