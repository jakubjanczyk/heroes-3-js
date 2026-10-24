// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { getHeroInfoBox, readArmySlots } from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'
import {
  clickHeroInHeroList,
  clickHeroScreenArmySlot,
  clickHeroScreenSplitButton,
  closeHeroScreen,
  getHeroScreen,
  getHeroScreenSplitButton,
  hoverHeroScreenArmySlot,
  readHeroScreenArmy,
  readHeroScreenSelectedSlot,
  readHeroScreenStatusBar,
  shiftClickHeroScreenArmySlot
} from './hero-screen.utils.js'
import {
  cancelSplit,
  confirmSplit,
  dragSplitSlider,
  querySplitWindow
} from './split-window.utils.js'
import { enterTownAt, getVisitingHero, readVisitingHeroArmy } from './town-screen.utils.js'

const HERO_NAME = 'Sir Christian'

const gameDefinitions = {
  hero: { ...readGameData('hero.json'), name: HERO_NAME },
  heroClasses: readGameData('hero-classes.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

const pikemen = (count) => ({ creature: 'PIKEMAN', count })
const archers = (count) => ({ creature: 'ARCHER', count })

// The hero starts at (4, 5), two tiles below Whitemoon's entrance at (4, 3).
const anArmyScenario = ({ army = [pikemen(10), archers(5)] } = {}) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(
      aHero().at(4, 5).withArmy(army),
      aTown().named('Whitemoon').ownedByPlayer().at(4, 3)
    )
    .withDefinitions(gameDefinitions)

async function setupApp(scenario, options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    ...options
  })
}

async function openHeroScreen(user) {
  await clickHeroInHeroList(user, HERO_NAME)
  getHeroScreen()
}

async function startOnHeroScreen(scenario = anArmyScenario(), options = {}) {
  const app = await setupApp(scenario, options)
  await openHeroScreen(app.user)
  return app
}

async function openSplitFromSlot1ToSlot3(user) {
  await clickHeroScreenArmySlot(user, 1)
  await shiftClickHeroScreenArmySlot(user, 3)
}

describe('hero screen army behavior', () => {
  describe('selecting a stack', () => {
    test("clicking a stack in the hero's army frames it", async () => {
      const { user } = await startOnHeroScreen()

      await clickHeroScreenArmySlot(user, 2)

      expect(readHeroScreenSelectedSlot()).toBe(2)
    })

    test('clicking the framed stack again unframes it', async () => {
      const { user } = await startOnHeroScreen()
      await clickHeroScreenArmySlot(user, 1)

      await clickHeroScreenArmySlot(user, 1)

      expect(readHeroScreenSelectedSlot()).toBeNull()
    })

    test('clicking an empty slot with no stack framed frames nothing', async () => {
      const { user } = await startOnHeroScreen()

      await clickHeroScreenArmySlot(user, 4)

      expect(readHeroScreenSelectedSlot()).toBeNull()
    })
  })

  describe('moving stacks', () => {
    test('a stack moves to an empty slot', async () => {
      const { user } = await startOnHeroScreen()

      await clickHeroScreenArmySlot(user, 1)
      await clickHeroScreenArmySlot(user, 4)

      expect(readHeroScreenArmy()).toEqual(['', 'Archers 5', '', 'Pikemen 10', '', '', ''])
    })

    test('stacks of different creatures swap places', async () => {
      const { user } = await startOnHeroScreen()

      await clickHeroScreenArmySlot(user, 1)
      await clickHeroScreenArmySlot(user, 2)

      expect(readHeroScreenArmy()).toEqual(['Archers 5', 'Pikemen 10', '', '', '', '', ''])
    })

    test('stacks of the same creature merge into the clicked one', async () => {
      const { user } = await startOnHeroScreen(
        anArmyScenario({ army: [pikemen(10), archers(5), pikemen(4)] })
      )

      await clickHeroScreenArmySlot(user, 1)
      await clickHeroScreenArmySlot(user, 3)

      expect(readHeroScreenArmy()).toEqual(['', 'Archers 5', 'Pikemen 14', '', '', '', ''])
    })

    test('no stack is framed once a stack has moved', async () => {
      const { user } = await startOnHeroScreen()

      await clickHeroScreenArmySlot(user, 1)
      await clickHeroScreenArmySlot(user, 4)

      expect(readHeroScreenSelectedSlot()).toBeNull()
    })

    test("the hero's only stack moves to an empty slot whole", async () => {
      const { user } = await startOnHeroScreen(anArmyScenario({ army: [pikemen(10)] }))

      await clickHeroScreenArmySlot(user, 1)
      await clickHeroScreenArmySlot(user, 5)

      expect(readHeroScreenArmy()).toEqual(['', '', '', '', 'Pikemen 10', '', ''])
    })
  })

  describe('splitting', () => {
    test('shift+clicking an empty slot with a stack framed opens the split window', async () => {
      const { user } = await startOnHeroScreen()

      await openSplitFromSlot1ToSlot3(user)

      expect(querySplitWindow('Split Pikemen')).toBeTruthy()
    })

    test('shift+clicking a stack of the same creature opens the split window', async () => {
      const { user } = await startOnHeroScreen(
        anArmyScenario({ army: [pikemen(10), archers(5), pikemen(4)] })
      )

      await openSplitFromSlot1ToSlot3(user)

      expect(querySplitWindow('Split Pikemen')).toBeTruthy()
    })

    test('shift+clicking a stack of a different creature swaps them instead', async () => {
      const { user } = await startOnHeroScreen()
      await clickHeroScreenArmySlot(user, 1)

      await shiftClickHeroScreenArmySlot(user, 2)

      expect(querySplitWindow()).toBeNull()
      expect(readHeroScreenArmy()).toEqual(['Archers 5', 'Pikemen 10', '', '', '', '', ''])
    })

    test('the Split button is disabled while no stack is framed', async () => {
      await startOnHeroScreen()

      expect(getHeroScreenSplitButton().disabled).toBe(true)
    })

    test('with a stack framed, pressing Split and then an empty slot opens the split window', async () => {
      const { user } = await startOnHeroScreen()
      await clickHeroScreenArmySlot(user, 1)

      await clickHeroScreenSplitButton(user)
      await clickHeroScreenArmySlot(user, 3)

      expect(querySplitWindow('Split Pikemen')).toBeTruthy()
    })

    test('pressing Split again leaves split mode, so the next click moves the stack', async () => {
      const { user } = await startOnHeroScreen()
      await clickHeroScreenArmySlot(user, 1)
      await clickHeroScreenSplitButton(user)

      await clickHeroScreenSplitButton(user)
      await clickHeroScreenArmySlot(user, 3)

      expect(querySplitWindow()).toBeNull()
      expect(readHeroScreenArmy()).toEqual(['', 'Archers 5', 'Pikemen 10', '', '', '', ''])
    })

    test('OK splits a stack into an empty slot', async () => {
      const { user } = await startOnHeroScreen()
      await openSplitFromSlot1ToSlot3(user)
      dragSplitSlider(4)

      await confirmSplit(user)

      expect(readHeroScreenArmy()).toEqual(['Pikemen 6', 'Archers 5', 'Pikemen 4', '', '', '', ''])
    })

    test('OK on two stacks of the same creature shares them out as chosen', async () => {
      const { user } = await startOnHeroScreen(
        anArmyScenario({ army: [pikemen(10), archers(5), pikemen(4)] })
      )
      await openSplitFromSlot1ToSlot3(user)
      dragSplitSlider(7)

      await confirmSplit(user)

      expect(readHeroScreenArmy()).toEqual(['Pikemen 7', 'Archers 5', 'Pikemen 7', '', '', '', ''])
    })

    test('Cancel leaves the army as it was', async () => {
      const { user } = await startOnHeroScreen()
      await openSplitFromSlot1ToSlot3(user)
      dragSplitSlider(4)

      await cancelSplit(user)

      expect(readHeroScreenArmy()).toEqual(['Pikemen 10', 'Archers 5', '', '', '', '', ''])
    })
  })

  describe('the status bar', () => {
    test('hovering a stack offers to select it', async () => {
      const { user } = await startOnHeroScreen()

      await hoverHeroScreenArmySlot(user, 1)

      expect(readHeroScreenStatusBar()).toBe('Select Pikeman')
    })

    test('hovering an empty slot says it is empty', async () => {
      const { user } = await startOnHeroScreen()

      await hoverHeroScreenArmySlot(user, 3)

      expect(readHeroScreenStatusBar()).toBe('Empty')
    })

    test('with a stack framed, hovering another creature offers to exchange them', async () => {
      const { user } = await startOnHeroScreen()
      await clickHeroScreenArmySlot(user, 1)

      await hoverHeroScreenArmySlot(user, 2)

      expect(readHeroScreenStatusBar()).toBe('Exchange Pikeman with Archer')
    })

    test('with a stack framed, hovering the same creature offers to combine them', async () => {
      const { user } = await startOnHeroScreen(
        anArmyScenario({ army: [pikemen(10), archers(5), pikemen(4)] })
      )
      await clickHeroScreenArmySlot(user, 1)

      await hoverHeroScreenArmySlot(user, 3)

      expect(readHeroScreenStatusBar()).toBe('Combine Pikeman armies')
    })

    test('with a stack framed, hovering an empty slot offers to move it', async () => {
      const { user } = await startOnHeroScreen()
      await clickHeroScreenArmySlot(user, 1)

      await hoverHeroScreenArmySlot(user, 3)

      expect(readHeroScreenStatusBar()).toBe('Move Pikeman')
    })

    test('with a stack framed, hovering that stack shows nothing', async () => {
      const { user } = await startOnHeroScreen()
      await hoverHeroScreenArmySlot(user, 1)

      await clickHeroScreenArmySlot(user, 1)

      expect(readHeroScreenStatusBar()).toBe('')
    })
  })

  describe('after closing the hero screen', () => {
    test('the hero info box shows the rearranged army', async () => {
      const { user } = await startOnHeroScreen()
      await clickHeroScreenArmySlot(user, 1)
      await clickHeroScreenArmySlot(user, 2)

      await closeHeroScreen(user)

      expect(readArmySlots(getHeroInfoBox())).toEqual([
        'Archers 5',
        'Pikemen 10',
        '',
        '',
        '',
        '',
        ''
      ])
    })

    test('opened from a town, the town screen shows the rearranged visiting army', async () => {
      const { user } = await setupApp(anArmyScenario())
      await enterTownAt(4, 3)
      await user.click(getVisitingHero(HERO_NAME))
      await user.click(getVisitingHero(HERO_NAME))
      await clickHeroScreenArmySlot(user, 1)
      await clickHeroScreenArmySlot(user, 2)

      await closeHeroScreen(user)

      expect(readVisitingHeroArmy()).toEqual(['Archers 5', 'Pikemen 10', '', '', '', '', ''])
    })

    test('reloading shows the rearranged army', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await startOnHeroScreen(anArmyScenario(), { eventLog })
      await clickHeroScreenArmySlot(user, 1)
      await clickHeroScreenArmySlot(user, 2)

      const { user: reloadedUser } = await setupApp(anArmyScenario(), { eventLog })
      await openHeroScreen(reloadedUser)

      expect(readHeroScreenArmy()).toEqual(['Archers 5', 'Pikemen 10', '', '', '', '', ''])
    })
  })
})
