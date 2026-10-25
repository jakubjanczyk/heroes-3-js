// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { confirmMove } from './adventure-map.utils.js'
import {
  clickInfoBoxArmySlot,
  expectStatusBarText,
  getDateBox,
  getHeroInfoBox,
  getKingdomOverview,
  getTownInfoBox,
  getTownInTownList,
  hoverInfoBoxArmySlot,
  queryFoundResourcesBox,
  queryKingdomOverview,
  readArmySlots,
  readInfoBoxSelectedSlot,
  shiftClickInfoBoxArmySlot
} from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aResource, aScenario, aTown } from './builders.js'
import { clickHeroInHeroList, readHeroScreenArmy } from './hero-screen.utils.js'
import { querySplitWindow } from './split-window.utils.js'
import { readGarrison } from './town-screen.utils.js'

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

// The hero starts at (1, 1) with a pile of gold right below it; Whitemoon stands away from both.
const anArmyScenario = ({ army = [pikemen(10), archers(5)], garrison = [] } = {}) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(
      aHero().at(1, 1).withArmy(army),
      aResource().withType('GOLD_PILE').at(1, 2),
      aTown().named('Whitemoon').ownedByPlayer().withGarrison(garrison).at(5, 4)
    )
    .withDefinitions(gameDefinitions)

async function setupApp(scenario = anArmyScenario(), options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0, fadeOutMsByKind: { RESOURCE: 0 } },
    ...options
  })
}

function readHeroBoxArmy() {
  return readArmySlots(getHeroInfoBox())
}

function readTownBoxGarrison() {
  return readArmySlots(getTownInfoBox(), 'Garrison')
}

async function selectWhitemoon(user) {
  await user.click(getTownInTownList('Whitemoon'))
}

async function startWithWhitemoonSelected(garrison = [pikemen(10), archers(5)], options = {}) {
  const app = await setupApp(anArmyScenario({ garrison }), options)
  await selectWhitemoon(app.user)
  return app
}

describe('info box army behavior', () => {
  describe("the hero's army", () => {
    test('clicking a stack frames it', async () => {
      const { user } = await setupApp()

      await clickInfoBoxArmySlot(user, 2)

      expect(readInfoBoxSelectedSlot()).toBe(2)
    })

    test('clicking the framed stack again unframes it', async () => {
      const { user } = await setupApp()
      await clickInfoBoxArmySlot(user, 1)

      await clickInfoBoxArmySlot(user, 1)

      expect(readInfoBoxSelectedSlot()).toBeNull()
    })

    test('clicking an empty slot with no stack framed frames nothing', async () => {
      const { user } = await setupApp()

      await clickInfoBoxArmySlot(user, 4)

      expect(readInfoBoxSelectedSlot()).toBeNull()
    })

    test('a framed stack moves to an empty slot', async () => {
      const { user } = await setupApp()

      await clickInfoBoxArmySlot(user, 1)
      await clickInfoBoxArmySlot(user, 4)

      expect(readHeroBoxArmy()).toEqual(['', 'Archers 5', '', 'Pikemen 10', '', '', ''])
    })

    test('stacks of different creatures swap places', async () => {
      const { user } = await setupApp()

      await clickInfoBoxArmySlot(user, 1)
      await clickInfoBoxArmySlot(user, 2)

      expect(readHeroBoxArmy()).toEqual(['Archers 5', 'Pikemen 10', '', '', '', '', ''])
    })

    test('stacks of the same creature merge into the clicked one', async () => {
      const { user } = await setupApp(
        anArmyScenario({ army: [pikemen(10), archers(5), pikemen(4)] })
      )

      await clickInfoBoxArmySlot(user, 1)
      await clickInfoBoxArmySlot(user, 3)

      expect(readHeroBoxArmy()).toEqual(['', 'Archers 5', 'Pikemen 14', '', '', '', ''])
    })

    test("the hero's only stack moves whole to an empty slot", async () => {
      const { user } = await setupApp(anArmyScenario({ army: [pikemen(10)] }))

      await clickInfoBoxArmySlot(user, 1)
      await clickInfoBoxArmySlot(user, 5)

      expect(readHeroBoxArmy()).toEqual(['', '', '', '', 'Pikemen 10', '', ''])
    })

    test('no stack is framed once a stack has moved', async () => {
      const { user } = await setupApp()

      await clickInfoBoxArmySlot(user, 1)
      await clickInfoBoxArmySlot(user, 4)

      expect(readInfoBoxSelectedSlot()).toBeNull()
    })

    test('clicking a slot keeps the box on the hero', async () => {
      const { user } = await setupApp()

      await clickInfoBoxArmySlot(user, 1)

      expect(queryKingdomOverview()).toBeNull()
      expect(getHeroInfoBox()).toBeTruthy()
    })

    test('clicking the box outside the slots still shows the kingdom overview', async () => {
      const { user } = await setupApp()
      await clickInfoBoxArmySlot(user, 1)

      await user.click(getHeroInfoBox())

      expect(getKingdomOverview()).toBeTruthy()
    })

    test('coming back to the hero from the kingdom overview shows no stack framed', async () => {
      const { user } = await setupApp()
      await clickInfoBoxArmySlot(user, 1)
      await user.click(getHeroInfoBox())

      await user.click(getKingdomOverview())
      await user.click(getDateBox())

      expect(readInfoBoxSelectedSlot()).toBeNull()
    })

    test('Shift+click on a slot moves the stack rather than opening the split window', async () => {
      const { user } = await setupApp()
      await clickInfoBoxArmySlot(user, 1)

      await shiftClickInfoBoxArmySlot(user, 3)

      expect(querySplitWindow()).toBeNull()
      expect(readHeroBoxArmy()).toEqual(['', 'Archers 5', 'Pikemen 10', '', '', '', ''])
    })

    test('the hero screen shows the rearranged army', async () => {
      const { user } = await setupApp()
      await clickInfoBoxArmySlot(user, 1)
      await clickInfoBoxArmySlot(user, 2)

      await clickHeroInHeroList(user, HERO_NAME)

      expect(readHeroScreenArmy()).toEqual(['Archers 5', 'Pikemen 10', '', '', '', '', ''])
    })

    test('reloading shows the rearranged army', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(anArmyScenario(), { eventLog })
      await clickInfoBoxArmySlot(user, 1)
      await clickInfoBoxArmySlot(user, 2)

      await setupApp(anArmyScenario(), { eventLog })

      expect(readHeroBoxArmy()).toEqual(['Archers 5', 'Pikemen 10', '', '', '', '', ''])
    })
  })

  describe("the town's garrison", () => {
    test('a garrison stack moves to an empty slot', async () => {
      const { user } = await startWithWhitemoonSelected()

      await clickInfoBoxArmySlot(user, 1)
      await clickInfoBoxArmySlot(user, 4)

      expect(readTownBoxGarrison()).toEqual(['', 'Archers 5', '', 'Pikemen 10', '', '', ''])
    })

    test('garrison stacks of different creatures swap places', async () => {
      const { user } = await startWithWhitemoonSelected()

      await clickInfoBoxArmySlot(user, 1)
      await clickInfoBoxArmySlot(user, 2)

      expect(readTownBoxGarrison()).toEqual(['Archers 5', 'Pikemen 10', '', '', '', '', ''])
    })

    test('clicking a slot keeps the box on the town', async () => {
      const { user } = await startWithWhitemoonSelected()

      await clickInfoBoxArmySlot(user, 1)

      expect(queryKingdomOverview()).toBeNull()
      expect(getTownInfoBox()).toBeTruthy()
    })

    test('the town screen shows the rearranged garrison', async () => {
      const { user } = await startWithWhitemoonSelected()
      await clickInfoBoxArmySlot(user, 1)
      await clickInfoBoxArmySlot(user, 2)

      await user.dblClick(getTownInTownList('Whitemoon'))

      expect(readGarrison()).toEqual(['Archers 5', 'Pikemen 10', '', '', '', '', ''])
    })

    test('reloading shows the rearranged garrison', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await startWithWhitemoonSelected(undefined, { eventLog })
      await clickInfoBoxArmySlot(user, 1)
      await clickInfoBoxArmySlot(user, 2)

      const { user: reloadedUser } = await setupApp(
        anArmyScenario({ garrison: [pikemen(10), archers(5)] }),
        { eventLog }
      )
      await selectWhitemoon(reloadedUser)

      expect(readTownBoxGarrison()).toEqual(['Archers 5', 'Pikemen 10', '', '', '', '', ''])
    })
  })

  describe('unframing when the box changes', () => {
    test('selecting a town and then the hero again shows no stack framed', async () => {
      const { user } = await setupApp()
      await clickInfoBoxArmySlot(user, 1)

      await selectWhitemoon(user)
      await clickHeroInHeroList(user, HERO_NAME)

      expect(readInfoBoxSelectedSlot()).toBeNull()
    })

    test('the hero starting to move unframes the stack', async () => {
      const { user } = await setupApp()
      await clickInfoBoxArmySlot(user, 1)

      await confirmMove(user, 2, 1)

      expect(readInfoBoxSelectedSlot()).toBeNull()
    })

    test('a pickup replacing the hero unframes the stack', async () => {
      const { user } = await setupApp()
      await clickInfoBoxArmySlot(user, 1)
      await confirmMove(user, 1, 2)

      await user.click(queryFoundResourcesBox())

      expect(readInfoBoxSelectedSlot()).toBeNull()
    })
  })

  describe('the status bar', () => {
    test('hovering a stack offers to select it', async () => {
      const { user } = await setupApp()

      await hoverInfoBoxArmySlot(user, 1)

      expectStatusBarText('Select Pikeman')
    })

    test('hovering an empty slot says it is empty', async () => {
      const { user } = await setupApp()

      await hoverInfoBoxArmySlot(user, 3)

      expectStatusBarText('Empty')
    })

    test('with a stack framed, hovering another creature offers to exchange them', async () => {
      const { user } = await setupApp()
      await clickInfoBoxArmySlot(user, 1)

      await hoverInfoBoxArmySlot(user, 2)

      expectStatusBarText('Exchange Pikeman with Archer')
    })

    test('with a stack framed, hovering the same creature offers to combine them', async () => {
      const { user } = await setupApp(
        anArmyScenario({ army: [pikemen(10), archers(5), pikemen(4)] })
      )
      await clickInfoBoxArmySlot(user, 1)

      await hoverInfoBoxArmySlot(user, 3)

      expectStatusBarText('Combine Pikeman armies')
    })

    test('with a stack framed, hovering an empty slot offers to move it', async () => {
      const { user } = await setupApp()
      await clickInfoBoxArmySlot(user, 1)

      await hoverInfoBoxArmySlot(user, 3)

      expectStatusBarText('Move Pikeman')
    })

    test('hovering a garrison stack offers to select it', async () => {
      const { user } = await startWithWhitemoonSelected()

      await hoverInfoBoxArmySlot(user, 2)

      expectStatusBarText('Select Archer')
    })

    test('moving off a slot onto the rest of the box shows the box text again', async () => {
      const { user } = await setupApp()
      await hoverInfoBoxArmySlot(user, 1)

      await user.hover(getHeroInfoBox())

      expectStatusBarText('Status Window')
    })
  })
})
