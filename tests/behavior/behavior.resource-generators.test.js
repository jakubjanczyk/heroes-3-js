// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import {
  confirmTileClickByDispatch,
  expectHeroAt,
  getResourceGeneratorEntity
} from './adventure-map.utils.js'
import {
  closeInteractionModal,
  endTurns,
  expectResourceTotal,
  getInteractionModalMessage,
  readMessageRewards
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, aResourceGenerator, aScenario } from './builders.js'
import { clickHeroInHeroList } from './hero-screen.utils.js'

const LOWEST_ROLL = () => 0
const HIGHEST_ROLL = () => 0.99

const WINDMILL_GIVES =
  'The keeper of the mill announces: "Milord, I have been working very hard to provide you with these resources, come back next week for more."'
const WINDMILL_EMPTY =
  'The keeper of the mill announces: "Milord, I am sorry, there are no resources currently available. Please try again next week."'
const WATER_WHEEL_GIVES =
  'The keeper of the mill announces: "Milord, I have been working very hard to provide you with this gold, come back next week for more."'
const WATER_WHEEL_EMPTY =
  'The keeper of the mill announces: "Milord, I am sorry, there is no gold currently available. Please try again next week."'
const MYSTICAL_GARDEN_GIVES =
  'The sound of music brings you to a small garden, where you are able to sneak up on a leprechaun who is happily dancing about in the clearing. You capture him, and in exchange for his freedom he guides you to a small pot filled with precious things.'
const MYSTICAL_GARDEN_EMPTY =
  'The sound of music brings you to a small garden, where you attempt to sneak up on a leprechaun who is happily dancing about in the clearing. You try to capture him, but his nimbleness allows him to elude you.'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  resources: readGameData('resources.json'),
  resourceGenerators: readGameData('resource-generators.json')
}

// The object's entrance is at (2, 1), the tile right of it is the rest of the object, and the
// hero stands right below the entrance, so entering it takes one step.
function aGeneratorScenario(type, heroes = [aHero().at(2, 2)]) {
  return aScenario()
    .withSize(5, 3)
    .withEntities(...heroes, aResourceGenerator().withType(type).at(2, 1))
    .withDefinitions(gameDefinitions)
    .build()
}

async function setupGenerator(type, { random = LOWEST_ROLL, heroes, eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: aGeneratorScenario(type, heroes),
    appConfig: { random },
    eventLog
  })
}

async function enterAt(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

async function enterGenerator() {
  await enterAt(2, 1)
}

async function stepOffAndEnterAgain(user) {
  await closeInteractionModal(user)
  await enterAt(2, 2)
  await enterGenerator()
}

describe('resource generators on the map', () => {
  test.each([
    { type: 'WINDMILL', name: 'Windmill' },
    { type: 'WATER_WHEEL', name: 'Water Wheel' },
    { type: 'MYSTICAL_GARDEN', name: 'Mystical Garden' }
  ])('shows the $name on the map', async ({ type, name }) => {
    await setupGenerator(type)

    const entity = getResourceGeneratorEntity()
    expect(entity?.textContent).toBe(name)
    expect(entity?.dataset.tileX).toBe('2')
    expect(entity?.dataset.tileY).toBe('1')
  })

  test('the hero walks onto the entrance', async () => {
    await setupGenerator('WINDMILL')

    await enterGenerator()

    expectHeroAt(2, 1)
  })

  test('the hero cannot walk onto the rest of the object', async () => {
    await setupGenerator('WINDMILL', { heroes: [aHero().at(3, 2)] })

    await enterAt(3, 1)

    expectHeroAt(3, 2)
  })

  describe('Windmill', () => {
    test("entering shows the keeper's message with what the mill gives", async () => {
      await setupGenerator('WINDMILL')

      await enterGenerator()

      expect(getInteractionModalMessage().textContent).toBe(WINDMILL_GIVES)
      expect(readMessageRewards()).toEqual(['3 Ore'])
    })

    // The mill picks one of Ore, Mercury, Sulfur, Crystal and Gems, never Wood or Gold, and 3 to 6
    // of it.
    test.each([
      { roll: 'lowest', random: LOWEST_ROLL, resource: 'Ore', amount: 3 },
      { roll: 'highest', random: HIGHEST_ROLL, resource: 'Gems', amount: 6 }
    ])('on the $roll roll gives $amount $resource', async ({ random, resource, amount }) => {
      await setupGenerator('WINDMILL', { random })

      await enterGenerator()

      expectResourceTotal(resource, amount)
    })

    test('entering again the same week says there are no resources', async () => {
      const { user } = await setupGenerator('WINDMILL')
      await enterGenerator()

      await stepOffAndEnterAgain(user)

      expect(getInteractionModalMessage().textContent).toBe(WINDMILL_EMPTY)
      expect(readMessageRewards()).toEqual([])
    })

    test('entering again the same week gives nothing', async () => {
      const { user } = await setupGenerator('WINDMILL')
      await enterGenerator()

      await stepOffAndEnterAgain(user)

      expectResourceTotal('Ore', 3)
    })

    test('another hero entering the same week gets nothing', async () => {
      const { user } = await setupGenerator('WINDMILL', {
        heroes: [
          aHero().withName('Sir Christian').at(2, 2),
          aHero().withId('hero-2').withName('Valeska').at(1, 2)
        ]
      })
      await enterGenerator()
      await closeInteractionModal(user)
      await enterAt(3, 2)

      await clickHeroInHeroList(user, 'Valeska')
      await enterGenerator()

      expect(getInteractionModalMessage().textContent).toBe(WINDMILL_EMPTY)
    })

    test('a new week gives resources again', async () => {
      const { user } = await setupGenerator('WINDMILL')
      await enterGenerator()
      await closeInteractionModal(user)
      await enterAt(2, 2)

      await endTurns(user, 7)
      await enterGenerator()

      expect(getInteractionModalMessage().textContent).toBe(WINDMILL_GIVES)
      expectResourceTotal('Ore', 6)
    })
  })

  describe('Water Wheel', () => {
    test('gives 500 gold in the first week', async () => {
      await setupGenerator('WATER_WHEEL')

      await enterGenerator()

      expect(getInteractionModalMessage().textContent).toBe(WATER_WHEEL_GIVES)
      expect(readMessageRewards()).toEqual(['500 Gold'])
      expectResourceTotal('Gold', 500)
    })

    test('gives 1000 gold from the second week', async () => {
      const { user } = await setupGenerator('WATER_WHEEL')

      await endTurns(user, 7)
      await enterGenerator()

      expect(readMessageRewards()).toEqual(['1000 Gold'])
      expectResourceTotal('Gold', 1000)
    })

    test('entering again the same week says there is no gold', async () => {
      const { user } = await setupGenerator('WATER_WHEEL')
      await enterGenerator()

      await stepOffAndEnterAgain(user)

      expect(getInteractionModalMessage().textContent).toBe(WATER_WHEEL_EMPTY)
      expectResourceTotal('Gold', 500)
    })
  })

  describe('Mystical Garden', () => {
    test.each([
      { roll: 'lowest', random: LOWEST_ROLL, reward: '5 Gems', resource: 'Gems', amount: 5 },
      { roll: 'highest', random: HIGHEST_ROLL, reward: '500 Gold', resource: 'Gold', amount: 500 }
    ])('on the $roll roll gives $reward', async ({ random, reward, resource, amount }) => {
      await setupGenerator('MYSTICAL_GARDEN', { random })

      await enterGenerator()

      expect(getInteractionModalMessage().textContent).toBe(MYSTICAL_GARDEN_GIVES)
      expect(readMessageRewards()).toEqual([reward])
      expectResourceTotal(resource, amount)
    })

    test('entering again the same week the leprechaun eludes the hero', async () => {
      const { user } = await setupGenerator('MYSTICAL_GARDEN')
      await enterGenerator()

      await stepOffAndEnterAgain(user)

      expect(getInteractionModalMessage().textContent).toBe(MYSTICAL_GARDEN_EMPTY)
      expectResourceTotal('Gems', 5)
    })
  })

  describe('reload', () => {
    test('what the Windmill gave is kept and it stays empty for the week', async () => {
      const session = { eventLog: createMemoryEventLog() }
      const { user } = await setupGenerator('WINDMILL', session)
      await enterGenerator()
      await closeInteractionModal(user)
      await enterAt(2, 2)

      await setupGenerator('WINDMILL', { ...session, random: HIGHEST_ROLL })
      await enterGenerator()

      expect(getInteractionModalMessage().textContent).toBe(WINDMILL_EMPTY)
      expectResourceTotal('Ore', 3)
    })
  })
})
