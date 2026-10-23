// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  getHeroInfoBox,
  getTownInfoBox,
  getTownInTownList,
  readArmySlots
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'
import {
  clickGarrisonSlot,
  clickVisitingHeroSlot,
  enterTownAt,
  leaveTown,
  readGarrison,
  readSelectedStack,
  readVisitingHeroArmy
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
const griffins = (count) => ({ creature: 'GRIFFIN', count })

// Whitemoon's entrance is at (4, 3) and the hero starts two tiles below it, so it can walk in, while
// the player can also open the town from the town list without it.
const anExchangeScenario = ({ garrison = [pikemen(10)], army = [archers(5)] } = {}) =>
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

async function startWithHeroInWhitemoon(scenario = anExchangeScenario(), options = {}) {
  const app = await setupApp(scenario, options)
  await enterTownAt(4, 3)
  return app
}

async function openWhitemoonWithoutHero(scenario) {
  const app = await setupApp(scenario)
  await app.user.dblClick(getTownInTownList('Whitemoon'))
  await flushMicrotasks()
  return app
}

describe('town garrison exchange behavior', () => {
  describe('selecting a stack', () => {
    test('clicking a stack in the garrison frames it', async () => {
      const { user } = await startWithHeroInWhitemoon()

      await clickGarrisonSlot(user, 1)

      expect(readSelectedStack()).toBe('Garrison 1')
    })

    test("clicking a stack in the visiting hero's army frames it", async () => {
      const { user } = await startWithHeroInWhitemoon()

      await clickVisitingHeroSlot(user, 1)

      expect(readSelectedStack()).toBe('Visiting hero army 1')
    })

    test('clicking the framed stack again unframes it', async () => {
      const { user } = await startWithHeroInWhitemoon()
      await clickGarrisonSlot(user, 1)

      await clickGarrisonSlot(user, 1)

      expect(readSelectedStack()).toBeNull()
    })

    test('clicking an empty slot with no stack framed frames nothing', async () => {
      const { user } = await startWithHeroInWhitemoon()

      await clickGarrisonSlot(user, 3)

      expect(readSelectedStack()).toBeNull()
    })
  })

  describe('between the garrison and the visiting hero', () => {
    test("a garrison stack moves to an empty slot in the hero's army", async () => {
      const { user } = await startWithHeroInWhitemoon()

      await clickGarrisonSlot(user, 1)
      await clickVisitingHeroSlot(user, 2)

      expect(readGarrison()).toEqual(['', '', '', '', '', '', ''])
      expect(readVisitingHeroArmy()).toEqual(['Archers 5', 'Pikemen 10', '', '', '', '', ''])
    })

    test("a stack of the hero's moves to an empty slot in the garrison", async () => {
      const { user } = await startWithHeroInWhitemoon(
        anExchangeScenario({ army: [archers(5), griffins(2)] })
      )

      await clickVisitingHeroSlot(user, 2)
      await clickGarrisonSlot(user, 3)

      expect(readGarrison()).toEqual(['Pikemen 10', '', 'Griffins 2', '', '', '', ''])
      expect(readVisitingHeroArmy()).toEqual(['Archers 5', '', '', '', '', '', ''])
    })

    test('stacks of different creatures swap places', async () => {
      const { user } = await startWithHeroInWhitemoon()

      await clickGarrisonSlot(user, 1)
      await clickVisitingHeroSlot(user, 1)

      expect(readGarrison()[0]).toBe('Archers 5')
      expect(readVisitingHeroArmy()[0]).toBe('Pikemen 10')
    })

    test('stacks of the same creature merge into the clicked one', async () => {
      const { user } = await startWithHeroInWhitemoon(
        anExchangeScenario({ garrison: [pikemen(10)], army: [archers(5), pikemen(4)] })
      )

      await clickGarrisonSlot(user, 1)
      await clickVisitingHeroSlot(user, 2)

      expect(readGarrison()[0]).toBe('')
      expect(readVisitingHeroArmy()).toEqual(['Archers 5', 'Pikemen 14', '', '', '', '', ''])
    })

    test('no stack is framed once a stack has moved', async () => {
      const { user } = await startWithHeroInWhitemoon()

      await clickGarrisonSlot(user, 1)
      await clickVisitingHeroSlot(user, 2)

      expect(readSelectedStack()).toBeNull()
    })
  })

  describe('within one row', () => {
    test('a garrison stack moves to an empty garrison slot', async () => {
      const { user } = await startWithHeroInWhitemoon()

      await clickGarrisonSlot(user, 1)
      await clickGarrisonSlot(user, 4)

      expect(readGarrison()).toEqual(['', '', '', 'Pikemen 10', '', '', ''])
    })

    test('two garrison stacks swap places', async () => {
      const { user } = await startWithHeroInWhitemoon(
        anExchangeScenario({ garrison: [pikemen(10), griffins(3)] })
      )

      await clickGarrisonSlot(user, 1)
      await clickGarrisonSlot(user, 2)

      expect(readGarrison()).toEqual(['Griffins 3', 'Pikemen 10', '', '', '', '', ''])
    })

    test("the hero's stacks swap places", async () => {
      const { user } = await startWithHeroInWhitemoon(
        anExchangeScenario({ army: [archers(5), griffins(2)] })
      )

      await clickVisitingHeroSlot(user, 2)
      await clickVisitingHeroSlot(user, 1)

      expect(readVisitingHeroArmy()).toEqual(['Griffins 2', 'Archers 5', '', '', '', '', ''])
    })

    test('with no hero in town, the garrison can still be rearranged', async () => {
      const { user } = await openWhitemoonWithoutHero(
        anExchangeScenario({ garrison: [pikemen(10), griffins(3)] })
      )

      await clickGarrisonSlot(user, 2)
      await clickGarrisonSlot(user, 5)

      expect(readGarrison()).toEqual(['Pikemen 10', '', '', '', 'Griffins 3', '', ''])
    })
  })

  describe("the hero's army is never left empty", () => {
    test("the hero's last stack does not move to an empty garrison slot", async () => {
      const { user } = await startWithHeroInWhitemoon()

      await clickVisitingHeroSlot(user, 1)
      await clickGarrisonSlot(user, 2)

      expect(readGarrison()).toEqual(['Pikemen 10', '', '', '', '', '', ''])
      expect(readVisitingHeroArmy()).toEqual(['Archers 5', '', '', '', '', '', ''])
    })

    test("the hero's last stack does not merge into a garrison stack of the same creature", async () => {
      const { user } = await startWithHeroInWhitemoon(
        anExchangeScenario({ garrison: [archers(10)], army: [archers(5)] })
      )

      await clickVisitingHeroSlot(user, 1)
      await clickGarrisonSlot(user, 1)

      expect(readGarrison()[0]).toBe('Archers 10')
      expect(readVisitingHeroArmy()[0]).toBe('Archers 5')
    })

    test("the hero's last stack stays framed when it can't move", async () => {
      const { user } = await startWithHeroInWhitemoon()

      await clickVisitingHeroSlot(user, 1)
      await clickGarrisonSlot(user, 2)

      expect(readSelectedStack()).toBe('Visiting hero army 1')
    })

    test("the hero's last stack can swap with a garrison stack", async () => {
      const { user } = await startWithHeroInWhitemoon()

      await clickVisitingHeroSlot(user, 1)
      await clickGarrisonSlot(user, 1)

      expect(readGarrison()[0]).toBe('Archers 5')
      expect(readVisitingHeroArmy()[0]).toBe('Pikemen 10')
    })
  })

  describe('outside the town screen', () => {
    test("after leaving town, the hero info box shows the hero's new army", async () => {
      const { user } = await startWithHeroInWhitemoon()
      await clickGarrisonSlot(user, 1)
      await clickVisitingHeroSlot(user, 2)

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

    test('after leaving town, the town box shows the new garrison', async () => {
      const { user } = await startWithHeroInWhitemoon(
        anExchangeScenario({ army: [archers(5), griffins(2)] })
      )
      await clickVisitingHeroSlot(user, 2)
      await clickGarrisonSlot(user, 2)
      await leaveTown(user)

      await user.click(getTownInTownList('Whitemoon'))
      await flushMicrotasks()

      expect(readArmySlots(getTownInfoBox(), 'Garrison')).toEqual([
        'Pikemen 10',
        'Griffins 2',
        '',
        '',
        '',
        '',
        ''
      ])
    })
  })

  describe('reloading', () => {
    test('after an exchange, the garrison and the hero army are as they were', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await startWithHeroInWhitemoon(anExchangeScenario(), { eventLog })
      await clickGarrisonSlot(user, 1)
      await clickVisitingHeroSlot(user, 1)

      await setupApp(anExchangeScenario(), { eventLog })
      await flushMicrotasks()

      expect(readGarrison()[0]).toBe('Archers 5')
      expect(readVisitingHeroArmy()[0]).toBe('Pikemen 10')
    })
  })
})
