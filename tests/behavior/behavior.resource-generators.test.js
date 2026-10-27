// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import {
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectNoPreview,
  expectResourceGeneratorAt,
  readResourceGeneratorName
} from './adventure-map.utils.js'
import {
  closeInteractionModal,
  endTurns,
  expectResourceTotal,
  readMessage,
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

// The object's entrance is at (2, 1) and the hero stands right below it, so entering it takes one step.
function setupMapWith(type, { random = LOWEST_ROLL, heroes = [aHero().at(2, 2)], eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: aScenario()
      .withSize(5, 3)
      .withEntities(...heroes, aResourceGenerator().withType(type).at(2, 1))
      .withDefinitions(gameDefinitions)
      .build(),
    appConfig: { random },
    eventLog
  })
}

const setupWindmill = (options) => setupMapWith('WINDMILL', options)
const setupWaterWheel = (options) => setupMapWith('WATER_WHEEL', options)
const setupMysticalGarden = (options) => setupMapWith('MYSTICAL_GARDEN', options)

async function walkTo(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

const enterEntrance = () => walkTo(2, 1)
const enterWindmill = enterEntrance
const enterWaterWheel = enterEntrance
const enterMysticalGarden = enterEntrance

async function closeMessageAndStepOff(user) {
  await closeInteractionModal(user)
  await walkTo(2, 2)
}

describe('Windmill, Water Wheel and Mystical Garden', () => {
  test.each([
    { type: 'WINDMILL', name: 'Windmill' },
    { type: 'WATER_WHEEL', name: 'Water Wheel' },
    { type: 'MYSTICAL_GARDEN', name: 'Mystical Garden' }
  ])('shows the $name on the map', async ({ type, name }) => {
    await setupMapWith(type)

    expect(readResourceGeneratorName()).toBe(name)
    expectResourceGeneratorAt(2, 1)
  })

  test("the hero walks onto the Windmill's entrance", async () => {
    await setupWindmill()

    await enterWindmill()

    expectHeroAt(2, 1)
  })

  test('the hero walks onto the tile left of the Windmill, which blocks only its entrance', async () => {
    await setupWindmill()

    await walkTo(1, 1)

    expectHeroAt(1, 1)
  })

  // The Water Wheel blocks two rows of three ending at its entrance, the Mystical Garden the tiles
  // either side of its entrance.
  test.each([
    { type: 'WATER_WHEEL', name: 'Water Wheel', x: 0, y: 1 },
    { type: 'WATER_WHEEL', name: 'Water Wheel', x: 1, y: 1 },
    { type: 'WATER_WHEEL', name: 'Water Wheel', x: 0, y: 0 },
    { type: 'WATER_WHEEL', name: 'Water Wheel', x: 1, y: 0 },
    { type: 'WATER_WHEEL', name: 'Water Wheel', x: 2, y: 0 },
    { type: 'MYSTICAL_GARDEN', name: 'Mystical Garden', x: 1, y: 1 },
    { type: 'MYSTICAL_GARDEN', name: 'Mystical Garden', x: 3, y: 1 }
  ])('shows no route to the tile the $name blocks at ($x, $y)', async ({ type, x, y }) => {
    await setupMapWith(type)

    dispatchTileClick(x, y)

    expectNoPreview()
  })

  describe('Windmill', () => {
    test("entering shows the keeper's message with what the mill gives", async () => {
      await setupWindmill()

      await enterWindmill()

      expect(readMessage()).toBe(WINDMILL_GIVES)
      expect(readMessageRewards()).toEqual(['3 Ore'])
    })

    // The mill picks one of Ore, Mercury, Sulfur, Crystal and Gems, never Wood or Gold, and 3 to 6
    // of it.
    test.each([
      { roll: 'lowest', random: LOWEST_ROLL, resource: 'Ore', amount: 3 },
      { roll: 'highest', random: HIGHEST_ROLL, resource: 'Gems', amount: 6 }
    ])('on the $roll roll gives $amount $resource', async ({ random, resource, amount }) => {
      await setupWindmill({ random })

      await enterWindmill()

      expectResourceTotal(resource, amount)
    })

    test('entering again the same week says there are no resources', async () => {
      const { user } = await setupWindmill()
      await enterWindmill()

      await closeMessageAndStepOff(user)
      await enterWindmill()

      expect(readMessage()).toBe(WINDMILL_EMPTY)
      expect(readMessageRewards()).toEqual([])
    })

    test('entering again the same week gives nothing', async () => {
      const { user } = await setupWindmill()
      await enterWindmill()

      await closeMessageAndStepOff(user)
      await enterWindmill()

      expectResourceTotal('Ore', 3)
    })

    test('another hero entering the same week gets nothing', async () => {
      const { user } = await setupWindmill({
        heroes: [
          aHero().withName('Sir Christian').at(2, 2),
          aHero().withId('hero-2').withName('Valeska').at(1, 2)
        ]
      })
      await enterWindmill()
      await closeInteractionModal(user)
      await walkTo(3, 2)

      await clickHeroInHeroList(user, 'Valeska')
      await enterWindmill()

      expect(readMessage()).toBe(WINDMILL_EMPTY)
    })

    test('a new week gives resources again', async () => {
      const { user } = await setupWindmill()
      await enterWindmill()
      await closeMessageAndStepOff(user)

      await endTurns(user, 7)
      await enterWindmill()

      expect(readMessage()).toBe(WINDMILL_GIVES)
      expectResourceTotal('Ore', 6)
    })
  })

  describe('Water Wheel', () => {
    test('gives 500 gold in the first week', async () => {
      await setupWaterWheel()

      await enterWaterWheel()

      expect(readMessage()).toBe(WATER_WHEEL_GIVES)
      expect(readMessageRewards()).toEqual(['500 Gold'])
      expectResourceTotal('Gold', 500)
    })

    test('gives 1000 gold from the second week', async () => {
      const { user } = await setupWaterWheel()

      await endTurns(user, 7)
      await enterWaterWheel()

      expect(readMessageRewards()).toEqual(['1000 Gold'])
      expectResourceTotal('Gold', 1000)
    })

    test('entering again the same week says there is no gold', async () => {
      const { user } = await setupWaterWheel()
      await enterWaterWheel()

      await closeMessageAndStepOff(user)
      await enterWaterWheel()

      expect(readMessage()).toBe(WATER_WHEEL_EMPTY)
      expectResourceTotal('Gold', 500)
    })
  })

  describe('Mystical Garden', () => {
    test.each([
      { roll: 'lowest', random: LOWEST_ROLL, reward: '5 Gems', resource: 'Gems', amount: 5 },
      { roll: 'highest', random: HIGHEST_ROLL, reward: '500 Gold', resource: 'Gold', amount: 500 }
    ])('on the $roll roll gives $reward', async ({ random, reward, resource, amount }) => {
      await setupMysticalGarden({ random })

      await enterMysticalGarden()

      expect(readMessage()).toBe(MYSTICAL_GARDEN_GIVES)
      expect(readMessageRewards()).toEqual([reward])
      expectResourceTotal(resource, amount)
    })

    test('entering again the same week the leprechaun eludes the hero', async () => {
      const { user } = await setupMysticalGarden()
      await enterMysticalGarden()

      await closeMessageAndStepOff(user)
      await enterMysticalGarden()

      expect(readMessage()).toBe(MYSTICAL_GARDEN_EMPTY)
      expectResourceTotal('Gems', 5)
    })
  })

  describe('reload', () => {
    test('what the Windmill gave is kept and it stays empty for the week', async () => {
      const session = { eventLog: createMemoryEventLog() }
      const { user } = await setupWindmill(session)
      await enterWindmill()
      await closeMessageAndStepOff(user)

      await setupWindmill({ ...session, random: HIGHEST_ROLL })
      await enterWindmill()

      expect(readMessage()).toBe(WINDMILL_EMPTY)
      expectResourceTotal('Ore', 3)
    })
  })
})
