// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { holdRightButtonOn } from './adventure-map.utils.js'
import {
  closeInteractionModal,
  getHeroInfoBox,
  queryLevelUpPopup,
  readPrimarySkills,
  takeFromTreasureChest
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, aScenario, aTreasureChest } from './builders.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  resources: readGameData('resources.json')
}

// Rolls that land in each band of a Knight's level 2-9 chances (Attack 35%, Defense 45%,
// Power 10%, Knowledge 10%).
const ROLL_ATTACK = 0.1
const ROLL_DEFENSE = 0.5
const ROLL_POWER = 0.85
const ROLL_KNOWLEDGE = 0.95

async function setupApp(scenario, { roll = ROLL_DEFENSE, eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.withDefinitions(gameDefinitions).build(),
    eventLog,
    appConfig: { random: () => roll }
  })
}

// The hero starts next to the first chest; a second chest waits further along the row.
function aLevelScenario({ experience = 0, chests = [aTreasureChest()] } = {}) {
  return aScenario()
    .withSize(5)
    .withEntities(aHero().withExperience(experience), ...chests)
}

const firstChest = { x: 1, y: 0 }
const secondChest = { x: 3, y: 0 }
const twoTier1Chests = [
  aTreasureChest().withTier(1).at(1, 0),
  aTreasureChest().withId('chest-2').withTier(1).at(3, 0)
]

// What the level-up popup says, e.g. ['Hero is now a level 2 Knight.', '+1 Defense'].
function readLevelUpDialog() {
  const dialog = queryLevelUpPopup()
  expect(dialog).toBeTruthy()
  return within(dialog)
    .getAllByRole('paragraph')
    .map((line) => line.textContent)
}

describe('hero level behavior', () => {
  test('given a hero with no experience when they take 1000 experience from a chest then a popup says they are now a level 2 Knight and names the gained primary skill', async () => {
    const { user } = await setupApp(aLevelScenario())

    await takeFromTreasureChest(user, firstChest, 'experience')

    expect(readLevelUpDialog()).toEqual(['Hero is now a level 2 Knight.', '+1 Defense'])
  })

  test('given the hero went up a level when the player closes the popup then the info box shows the gained primary skill one higher', async () => {
    const { user } = await setupApp(aLevelScenario())
    await takeFromTreasureChest(user, firstChest, 'experience')

    await closeInteractionModal(user)

    expect(readPrimarySkills(getHeroInfoBox())).toEqual([
      'Attack 2',
      'Defense 3',
      'Power 1',
      'Knowledge 1'
    ])
  })

  test('given the hero went up a level when the player holds the right button on the hero then the popup shows the gained primary skill one higher', async () => {
    const { user } = await setupApp(aLevelScenario())
    await takeFromTreasureChest(user, firstChest, 'experience')
    await closeInteractionModal(user)

    await holdRightButtonOn(user, 0, 0)

    expect(readPrimarySkills(screen.getByRole('tooltip'))).toEqual([
      'Attack 2',
      'Defense 3',
      'Power 1',
      'Knowledge 1'
    ])
  })

  test('given a hero with no experience when they take 500 experience then no level-up popup opens', async () => {
    const { user } = await setupApp(aLevelScenario({ chests: [aTreasureChest().withTier(1)] }))

    await takeFromTreasureChest(user, firstChest, 'experience')

    expect(queryLevelUpPopup()).toBeNull()
  })

  test('given a hero took 500 experience from one chest when they take 500 more from another then they reach level 2', async () => {
    const { user } = await setupApp(aLevelScenario({ chests: twoTier1Chests }))
    await takeFromTreasureChest(user, firstChest, 'experience')

    await takeFromTreasureChest(user, secondChest, 'experience')

    expect(readLevelUpDialog()[0]).toBe('Hero is now a level 2 Knight.')
  })

  test('given a hero with 1900 experience when they take 1500 then one popup per level opens, level 3 first and level 4 after it', async () => {
    const { user } = await setupApp(
      aLevelScenario({ experience: 1900, chests: [aTreasureChest().withTier(3)] })
    )

    await takeFromTreasureChest(user, firstChest, 'experience')
    const firstPopup = readLevelUpDialog()[0]
    await closeInteractionModal(user)
    const secondPopup = readLevelUpDialog()[0]

    expect([firstPopup, secondPopup]).toEqual([
      'Hero is now a level 3 Knight.',
      'Hero is now a level 4 Knight.'
    ])
  })

  test.each([
    { roll: ROLL_ATTACK, gained: '+1 Attack' },
    { roll: ROLL_POWER, gained: '+1 Power' },
    { roll: ROLL_KNOWLEDGE, gained: '+1 Knowledge' }
  ])('given a Knight going up to level 2 when the roll is $roll then the popup shows $gained', async ({
    roll,
    gained
  }) => {
    const { user } = await setupApp(aLevelScenario(), { roll })

    await takeFromTreasureChest(user, firstChest, 'experience')

    expect(readLevelUpDialog()[1]).toBe(gained)
  })

  describe('reload', () => {
    test('given the hero gained Defense on a level-up when the page reloads then the info box still shows that Defense, with no new roll', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(aLevelScenario(), { roll: ROLL_DEFENSE, eventLog })
      await takeFromTreasureChest(user, firstChest, 'experience')
      await closeInteractionModal(user)

      await setupApp(aLevelScenario(), { roll: ROLL_ATTACK, eventLog })
      await flushMicrotasks()

      expect(readPrimarySkills(getHeroInfoBox())).toEqual([
        'Attack 2',
        'Defense 3',
        'Power 1',
        'Knowledge 1'
      ])
    })

    test('given the hero took 500 experience when the page reloads and they take 500 more then they reach level 2', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aLevelScenario({ chests: twoTier1Chests })
      const { user } = await setupApp(scenario, { eventLog })
      await takeFromTreasureChest(user, firstChest, 'experience')

      const reloaded = await setupApp(scenario, { eventLog })
      await flushMicrotasks()
      await takeFromTreasureChest(reloaded.user, secondChest, 'experience')

      expect(readLevelUpDialog()[0]).toBe('Hero is now a level 2 Knight.')
    })
  })
})
