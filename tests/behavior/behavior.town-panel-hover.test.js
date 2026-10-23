// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { getTownInTownList } from './adventure-panels.utils.js'
import { flushMicrotasks, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'
import {
  getCreatureSlot,
  getHallIcon,
  getLeaveTownButton,
  getTownInTownScreenList,
  queryFortIcon,
  readTownStatusBar,
  recruitInTown
} from './town-screen.utils.js'

const gameDefinitions = {
  hero: { name: 'Sir Christian' },
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

// A Guardhouse makes 14 Pikemen a week and starts with one week of them.
const aWhitemoonScenario = ({ buildings = ['FORT', 'GUARDHOUSE'] } = {}) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(
      aHero().at(4, 5),
      aTown().named('Whitemoon').ownedByPlayer().withBuildings(buildings).at(4, 3)
    )
    .withDefinitions(gameDefinitions)
    .withStartingResources({ GOLD_PILE: 10000 })

async function openWhitemoon(scenario = aWhitemoonScenario()) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 }
  })
  await app.user.dblClick(getTownInTownList('Whitemoon'))
  await flushMicrotasks()
  return app
}

describe('town panel hover behavior', () => {
  test('hovering a creature in the panel shows how many are available and its weekly growth', async () => {
    const { user } = await openWhitemoon()
    await recruitInTown(user, 'Pikemen', { count: 5 })

    await user.hover(getCreatureSlot(1))

    expect(readTownStatusBar()).toBe('9 Pikemen available, +14 growth')
  })

  test('hovering a creature with one available names it in the singular', async () => {
    const { user } = await openWhitemoon()
    await recruitInTown(user, 'Pikemen', { count: 13 })

    await user.hover(getCreatureSlot(1))

    expect(readTownStatusBar()).toBe('1 Pikeman available, +14 growth')
  })

  test("hovering the Hall icon shows the town's hall", async () => {
    const { user } = await openWhitemoon(aWhitemoonScenario({ buildings: ['TOWN_HALL'] }))

    await user.hover(getHallIcon())

    expect(readTownStatusBar()).toBe('Town Hall')
  })

  test("hovering the Fort icon shows the town's fort", async () => {
    const { user } = await openWhitemoon(aWhitemoonScenario({ buildings: ['FORT', 'CITADEL'] }))

    await user.hover(queryFortIcon('Citadel'))

    expect(readTownStatusBar()).toBe('Citadel')
  })

  test('hovering the Leave town button says what it does', async () => {
    const { user } = await openWhitemoon()

    await user.hover(getLeaveTownButton())

    expect(readTownStatusBar()).toBe('Leave town')
  })

  test('hovering a town in the town list shows its name', async () => {
    const { user } = await openWhitemoon()

    await user.hover(getTownInTownScreenList('Whitemoon'))

    expect(readTownStatusBar()).toBe('Whitemoon')
  })

  test.each([
    ['a creature', () => getCreatureSlot(1)],
    ['the Hall icon', () => getHallIcon()],
    ['the Fort icon', () => queryFortIcon('Fort')],
    ['the Leave town button', () => getLeaveTownButton()],
    ['a town in the list', () => getTownInTownScreenList('Whitemoon')]
  ])('moving off %s clears the status bar', async (_, getElement) => {
    const { user } = await openWhitemoon()
    await user.hover(getElement())

    await user.unhover(getElement())

    expect(readTownStatusBar()).toBe('')
  })
})
