// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { getHeroInfoBox, readArmySlots } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  pressKey,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'
import {
  cancelSplit,
  clickSplitFewer,
  clickSplitMore,
  confirmSplit,
  dragSplitSlider,
  querySplitWindow,
  readSplitCounts,
  typeSplitCount
} from './split-window.utils.js'
import {
  clickGarrisonSlot,
  clickSplitButton,
  clickVisitingHeroSlot,
  enterTownAt,
  getSplitButton,
  leaveTown,
  readGarrison,
  readSelectedStack,
  readVisitingHeroArmy,
  shiftClickGarrisonSlot,
  shiftClickVisitingHeroSlot
} from './town-screen.utils.js'

const gameDefinitions = {
  hero: { name: 'Sir Christian' },
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

const pikemen = (count) => ({ creature: 'PIKEMAN', count })
const archers = (count) => ({ creature: 'ARCHER', count })

// Whitemoon's entrance is at (4, 3) and the hero starts two tiles below it, so it can walk in.
const aSplitScenario = ({ garrison = [pikemen(30)], army = [archers(5)] } = {}) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(
      aHero().at(4, 5).withArmy(army),
      aTown().named('Whitemoon').ownedByPlayer().withGarrison(garrison).at(4, 3)
    )
    .withDefinitions(gameDefinitions)

async function setupApp(scenario, options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    ...options
  })
}

async function startWithHeroInWhitemoon(scenario = aSplitScenario(), options = {}) {
  const app = await setupApp(scenario, options)
  await enterTownAt(4, 3)
  return app
}

// Frames the first garrison stack and Shift+clicks the hero's second slot.
async function openSplitFromGarrisonToHero(user) {
  await clickGarrisonSlot(user, 1)
  await shiftClickVisitingHeroSlot(user, 2)
}

describe('town split stack behavior', () => {
  describe('opening the split window', () => {
    test('shift+clicking an empty slot with a stack framed opens the split window', async () => {
      const { user } = await startWithHeroInWhitemoon()

      await openSplitFromGarrisonToHero(user)

      expect(querySplitWindow('Split Pikemen')).toBeTruthy()
    })

    test('shift+clicking a stack of the same creature opens the split window', async () => {
      const { user } = await startWithHeroInWhitemoon(
        aSplitScenario({ army: [archers(5), pikemen(4)] })
      )

      await openSplitFromGarrisonToHero(user)

      expect(querySplitWindow('Split Pikemen')).toBeTruthy()
    })

    test('shift+clicking a stack of a different creature swaps them instead', async () => {
      const { user } = await startWithHeroInWhitemoon()
      await clickGarrisonSlot(user, 1)

      await shiftClickVisitingHeroSlot(user, 1)

      expect(querySplitWindow()).toBeNull()
      expect(readGarrison()[0]).toBe('Archers 5')
      expect(readVisitingHeroArmy()[0]).toBe('Pikemen 30')
    })

    test('with a stack framed, pressing Split and then an empty slot opens the split window', async () => {
      const { user } = await startWithHeroInWhitemoon()
      await clickGarrisonSlot(user, 1)

      await clickSplitButton(user)
      await clickVisitingHeroSlot(user, 2)

      expect(querySplitWindow('Split Pikemen')).toBeTruthy()
    })

    test('the Split button is disabled while no stack is framed', async () => {
      await startWithHeroInWhitemoon()

      expect(getSplitButton().disabled).toBe(true)
    })

    test('pressing Split again leaves split mode, so the next click moves the stack', async () => {
      const { user } = await startWithHeroInWhitemoon()
      await clickGarrisonSlot(user, 1)
      await clickSplitButton(user)

      await clickSplitButton(user)
      await clickVisitingHeroSlot(user, 2)

      expect(querySplitWindow()).toBeNull()
      expect(readVisitingHeroArmy()[1]).toBe('Pikemen 30')
    })

    // As in Heroes 3, nothing moves until the player picks the counts: the framed stack starts
    // whole on the left and the clicked slot keeps what it has on the right.
    test.each([
      ['an empty slot', [], [30, 0]],
      ['a stack of the same creature', [archers(5), pikemen(4)], [30, 4]]
    ])('splitting onto %s starts with both stacks as they are', async (_, army, counts) => {
      const { user } = await startWithHeroInWhitemoon(aSplitScenario({ army }))

      await openSplitFromGarrisonToHero(user)

      expect(readSplitCounts()).toEqual(counts)
    })
  })

  describe('choosing the counts', () => {
    test('moving the slider moves creatures between the two counts', async () => {
      const { user } = await startWithHeroInWhitemoon()
      await openSplitFromGarrisonToHero(user)

      dragSplitSlider(12)

      expect(readSplitCounts()).toEqual([18, 12])
    })

    test('the arrows move one creature at a time', async () => {
      const { user } = await startWithHeroInWhitemoon()
      await openSplitFromGarrisonToHero(user)
      dragSplitSlider(12)

      await clickSplitMore(user)
      await clickSplitMore(user)
      await clickSplitFewer(user)

      expect(readSplitCounts()).toEqual([17, 13])
    })

    test.each([
      ['left', 10, [10, 20]],
      ['right', 10, [20, 10]]
    ])('typing a number in the %s box sets the other to the rest', async (side, typed, counts) => {
      const { user } = await startWithHeroInWhitemoon()
      await openSplitFromGarrisonToHero(user)

      await typeSplitCount(user, side, typed)

      expect(readSplitCounts()).toEqual(counts)
    })

    test('typing more than the total sets that box to the total', async () => {
      const { user } = await startWithHeroInWhitemoon()
      await openSplitFromGarrisonToHero(user)

      await typeSplitCount(user, 'right', 45)

      expect(readSplitCounts()).toEqual([0, 30])
    })

    test("splitting the hero's last stack into the garrison keeps at least one with the hero", async () => {
      const { user } = await startWithHeroInWhitemoon()
      await clickVisitingHeroSlot(user, 1)
      await shiftClickGarrisonSlot(user, 2)

      dragSplitSlider(5)

      expect(readSplitCounts()).toEqual([1, 4])
    })

    test("splitting onto the hero's only stack of the same creature keeps at least one with the hero", async () => {
      const { user } = await startWithHeroInWhitemoon(aSplitScenario({ army: [pikemen(4)] }))
      await clickGarrisonSlot(user, 1)
      await shiftClickVisitingHeroSlot(user, 1)

      dragSplitSlider(0)

      expect(readSplitCounts()).toEqual([33, 1])
    })
  })

  describe('splitting', () => {
    test("OK splits a garrison stack into an empty slot of the hero's army", async () => {
      const { user } = await startWithHeroInWhitemoon()
      await openSplitFromGarrisonToHero(user)
      dragSplitSlider(10)

      await confirmSplit(user)

      expect(readGarrison()[0]).toBe('Pikemen 20')
      expect(readVisitingHeroArmy()).toEqual(['Archers 5', 'Pikemen 10', '', '', '', '', ''])
    })

    test('OK splits a stack into another slot of the same row', async () => {
      const { user } = await startWithHeroInWhitemoon()
      await clickGarrisonSlot(user, 1)
      await shiftClickGarrisonSlot(user, 3)
      dragSplitSlider(10)

      await confirmSplit(user)

      expect(readGarrison()).toEqual(['Pikemen 20', '', 'Pikemen 10', '', '', '', ''])
    })

    test('OK on two stacks of the same creature shares them out as chosen', async () => {
      const { user } = await startWithHeroInWhitemoon(
        aSplitScenario({ garrison: [pikemen(10)], army: [archers(5), pikemen(4)] })
      )
      await openSplitFromGarrisonToHero(user)
      dragSplitSlider(7)

      await confirmSplit(user)

      expect(readGarrison()[0]).toBe('Pikemen 7')
      expect(readVisitingHeroArmy()[1]).toBe('Pikemen 7')
    })

    test('Enter splits, as OK does', async () => {
      const { user } = await startWithHeroInWhitemoon()
      await openSplitFromGarrisonToHero(user)
      dragSplitSlider(10)

      await pressKey(user, '{Enter}')

      expect(querySplitWindow()).toBeNull()
      expect(readVisitingHeroArmy()[1]).toBe('Pikemen 10')
    })

    test('Escape closes the split window without splitting', async () => {
      const { user } = await startWithHeroInWhitemoon()
      await openSplitFromGarrisonToHero(user)
      dragSplitSlider(10)

      await pressKey(user, '{Escape}')

      expect(querySplitWindow()).toBeNull()
      expect(readGarrison()[0]).toBe('Pikemen 30')
    })

    test('Cancel leaves both armies as they were', async () => {
      const { user } = await startWithHeroInWhitemoon()
      await openSplitFromGarrisonToHero(user)
      dragSplitSlider(10)

      await cancelSplit(user)

      expect(readGarrison()[0]).toBe('Pikemen 30')
      expect(readVisitingHeroArmy()).toEqual(['Archers 5', '', '', '', '', '', ''])
    })

    test.each([
      ['OK', confirmSplit],
      ['Cancel', cancelSplit]
    ])('no stack is framed once %s closes the split window', async (_, closeSplitWindow) => {
      const { user } = await startWithHeroInWhitemoon()
      await openSplitFromGarrisonToHero(user)
      dragSplitSlider(10)

      await closeSplitWindow(user)

      expect(readSelectedStack()).toBeNull()
    })

    test('after a split, leaving town shows the new army in the hero info box', async () => {
      const { user } = await startWithHeroInWhitemoon()
      await openSplitFromGarrisonToHero(user)
      dragSplitSlider(10)
      await confirmSplit(user)

      await leaveTown(user)

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

    test('after a split, reloading shows the same armies', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await startWithHeroInWhitemoon(aSplitScenario(), { eventLog })
      await openSplitFromGarrisonToHero(user)
      dragSplitSlider(10)
      await confirmSplit(user)

      await setupApp(aSplitScenario(), { eventLog })

      expect(readGarrison()[0]).toBe('Pikemen 20')
      expect(readVisitingHeroArmy()[1]).toBe('Pikemen 10')
    })
  })
})
