// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { holdRightButtonOn } from './adventure-map.utils.js'

import {
  endTurns,
  expectResourceTotal,
  getTownInfoBox,
  getTownInTownList,
  readArmySlots
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  pressKey,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'
import {
  buildInTown,
  cancelRecruiting,
  chooseRecruitCreature,
  clickCreatureSlot,
  clickRecruitFewer,
  clickRecruitMax,
  clickRecruitMore,
  closeTownMessage,
  dragRecruitSlider,
  enterTownAt,
  getRecruitButton,
  leaveTown,
  openRecruitWindow,
  queryRecruitWindow,
  readAvailable,
  readChosenRecruitCreature,
  readCostPerTroop,
  readGarrison,
  readRecruitCount,
  readRecruitCreatures,
  readTotalCost,
  readTownMessage,
  readVisitingHeroArmy,
  recruit,
  recruitInTown
} from './town-screen.utils.js'

const gameDefinitions = {
  hero: { name: 'Sir Christian' },
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

const GUARDHOUSE = ['FORT', 'GUARDHOUSE']
const FULL_GARRISON = [
  'ARCHER',
  'GRIFFIN',
  'SWORDSMAN',
  'MONK',
  'CAVALIER',
  'ANGEL',
  'MARKSMAN'
].map((creature) => ({ creature, count: 1 }))

// Whitemoon's entrance is at (4, 3); the hero starts two tiles below it, so it can walk in, while
// the player can also open the town from the town list without it.
const aWhitemoon = ({ buildings = GUARDHOUSE, garrison } = {}) => {
  const town = aTown().named('Whitemoon').ownedByPlayer().withBuildings(buildings)
  return garrison ? town.withGarrison(garrison) : town
}

const aRecruitingScenario = ({
  town = aWhitemoon(),
  hero = aHero().at(4, 5),
  resources = { GOLD_PILE: 10000 }
} = {}) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(hero, town.at(4, 3))
    .withDefinitions(gameDefinitions)
    .withStartingResources(resources)

async function setupApp(scenario = aRecruitingScenario(), options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    ...options
  })
}

async function openWhitemoon(user) {
  await user.dblClick(getTownInTownList('Whitemoon'))
}

async function startInWhitemoon(scenario, options) {
  const app = await setupApp(scenario, options)
  await openWhitemoon(app.user)
  return app
}

async function endWeekAwayFromTown(user) {
  await leaveTown(user)
  await endTurns(user, 7)
  await openWhitemoon(user)
}

describe('town recruitment behavior', () => {
  describe('opening the recruit window', () => {
    test('clicking Pikemen in the creature panel opens the window to recruit them', async () => {
      const { user } = await startInWhitemoon()

      await openRecruitWindow(user, 'Pikemen')

      expect(queryRecruitWindow('Recruit Pikemen')).toBeTruthy()
    })

    test('clicking an empty creature slot opens nothing', async () => {
      const { user } = await startInWhitemoon()

      await clickCreatureSlot(user, 2)

      expect(queryRecruitWindow()).toBeNull()
    })

    test('Cancel closes the recruit window without buying anything', async () => {
      const { user } = await startInWhitemoon()
      await openRecruitWindow(user, 'Pikemen')

      await cancelRecruiting(user)

      expect(queryRecruitWindow()).toBeNull()
      expectResourceTotal('Gold', 10000)
      expect(readGarrison()[0]).toBe('')
    })

    test('Escape closes the recruit window without buying anything', async () => {
      const { user } = await startInWhitemoon()
      await openRecruitWindow(user, 'Pikemen')

      await pressKey(user, '{Escape}')

      expect(queryRecruitWindow()).toBeNull()
      expectResourceTotal('Gold', 10000)
    })

    test('Enter recruits the chosen number, as the Recruit button does', async () => {
      const { user } = await startInWhitemoon()
      await openRecruitWindow(user, 'Pikemen')

      await pressKey(user, '{Enter}')

      expect(queryRecruitWindow()).toBeNull()
      expect(readGarrison()[0]).toBe('Pikeman 1')
    })
  })

  describe('what it shows', () => {
    test('shows the cost of one Pikeman', async () => {
      const { user } = await startInWhitemoon()

      await openRecruitWindow(user, 'Pikemen')

      expect(readCostPerTroop()).toEqual(['60 Gold'])
    })

    test('shows every resource a creature costs', async () => {
      const { user } = await startInWhitemoon(
        aRecruitingScenario({ town: aWhitemoon({ buildings: ['PORTAL_OF_GLORY'] }) })
      )

      await openRecruitWindow(user, 'Angels')

      expect(readCostPerTroop()).toEqual(['1 Gems', '3000 Gold'])
    })

    test('a Guardhouse standing at the start of the game has a week of Pikemen available', async () => {
      const { user } = await startInWhitemoon()

      await openRecruitWindow(user, 'Pikemen')

      expect(readAvailable()).toBe(14)
    })

    // 14 a week, and half as many again from the Citadel.
    test('the week of creatures a dwelling starts with includes the Citadel bonus', async () => {
      const { user } = await startInWhitemoon(
        aRecruitingScenario({ town: aWhitemoon({ buildings: ['FORT', 'CITADEL', 'GUARDHOUSE'] }) })
      )

      await openRecruitWindow(user, 'Pikemen')

      expect(readAvailable()).toBe(21)
    })

    test('an upgraded dwelling offers both creatures with the upgraded one chosen', async () => {
      const { user } = await startInWhitemoon(
        aRecruitingScenario({
          town: aWhitemoon({ buildings: ['FORT', 'GUARDHOUSE', 'UPG_GUARDHOUSE'] })
        })
      )

      await openRecruitWindow(user, 'Halberdiers')

      expect(readRecruitCreatures()).toEqual(['Pikemen', 'Halberdiers'])
      expect(readChosenRecruitCreature()).toBe('Halberdiers')
      expect(readCostPerTroop()).toEqual(['75 Gold'])
    })

    test('choosing Pikemen in an upgraded dwelling shows their cost from the same pool', async () => {
      const { user } = await startInWhitemoon(
        aRecruitingScenario({
          town: aWhitemoon({ buildings: ['FORT', 'GUARDHOUSE', 'UPG_GUARDHOUSE'] })
        })
      )
      await openRecruitWindow(user, 'Halberdiers')

      await chooseRecruitCreature(user, 'Pikemen')

      expect(queryRecruitWindow('Recruit Pikemen')).toBeTruthy()
      expect(readCostPerTroop()).toEqual(['60 Gold'])
      expect(readAvailable()).toBe(14)
    })
  })

  describe('choosing how many', () => {
    test('starts at one creature when the player can afford one', async () => {
      const { user } = await startInWhitemoon()

      await openRecruitWindow(user, 'Pikemen')

      expect(readRecruitCount()).toBe(1)
      expect(readTotalCost()).toEqual(['60 Gold'])
      expect(getRecruitButton().disabled).toBe(false)
    })

    test('starts at none, with Recruit greyed out, when the player cannot afford one', async () => {
      const { user } = await startInWhitemoon(aRecruitingScenario({ resources: { GOLD_PILE: 59 } }))

      await openRecruitWindow(user, 'Pikemen')

      expect(readRecruitCount()).toBe(0)
      expect(readTotalCost()).toEqual(['0 Gold'])
      expect(getRecruitButton().disabled).toBe(true)
    })

    test('starts at none, with Recruit greyed out, when none are available', async () => {
      const { user } = await startInWhitemoon()
      await recruitInTown(user, 'Pikemen', { max: true })

      await openRecruitWindow(user, 'Pikemen')

      expect(readAvailable()).toBe(0)
      expect(readRecruitCount()).toBe(0)
      expect(getRecruitButton().disabled).toBe(true)
    })

    test('the right arrow recruits one more, adding to the total cost', async () => {
      const { user } = await startInWhitemoon()
      await openRecruitWindow(user, 'Pikemen')

      await clickRecruitMore(user)

      expect(readRecruitCount()).toBe(2)
      expect(readTotalCost()).toEqual(['120 Gold'])
    })

    test('the left arrow recruits one fewer', async () => {
      const { user } = await startInWhitemoon()
      await openRecruitWindow(user, 'Pikemen')
      await clickRecruitMore(user)
      await clickRecruitMore(user)

      await clickRecruitFewer(user)

      expect(readRecruitCount()).toBe(2)
    })

    test('dragging the slider sets how many to recruit and the total cost', async () => {
      const { user } = await startInWhitemoon()
      await openRecruitWindow(user, 'Pikemen')

      dragRecruitSlider(10)

      expect(readRecruitCount()).toBe(10)
      expect(readTotalCost()).toEqual(['600 Gold'])
    })

    // 14 Pikemen at 60 gold cost 840; 150 gold buys only 2.
    test('the right arrow stops at what the player can afford', async () => {
      const { user } = await startInWhitemoon(
        aRecruitingScenario({ resources: { GOLD_PILE: 150 } })
      )
      await openRecruitWindow(user, 'Pikemen')
      await clickRecruitMore(user)

      await clickRecruitMore(user)

      expect(readRecruitCount()).toBe(2)
    })

    test('the slider cannot be dragged past what the player can afford', async () => {
      const { user } = await startInWhitemoon(
        aRecruitingScenario({ resources: { GOLD_PILE: 150 } })
      )
      await openRecruitWindow(user, 'Pikemen')

      dragRecruitSlider(5)

      expect(readRecruitCount()).toBe(2)
    })

    test('Max picks every creature available when the player can afford them all', async () => {
      const { user } = await startInWhitemoon()
      await openRecruitWindow(user, 'Pikemen')

      await clickRecruitMax(user)

      expect(readRecruitCount()).toBe(14)
      expect(readTotalCost()).toEqual(['840 Gold'])
    })

    // A Castle doubles the single Angel a week to 2, so the player could buy 2 with enough of
    // everything.
    test.each([
      ['gold', { GOLD_PILE: 3500, GEMS_PILE: 10 }],
      ['gems', { GOLD_PILE: 10000, GEMS_PILE: 1 }]
    ])('Max picks as many as the player can afford when %s runs out first', async (_, resources) => {
      const { user } = await startInWhitemoon(
        aRecruitingScenario({
          town: aWhitemoon({ buildings: ['FORT', 'CITADEL', 'CASTLE', 'PORTAL_OF_GLORY'] }),
          resources
        })
      )
      await openRecruitWindow(user, 'Angels')

      await clickRecruitMax(user)

      expect(readAvailable()).toBe(2)
      expect(readRecruitCount()).toBe(1)
    })
  })

  describe('recruiting', () => {
    test('takes the total cost off the resources', async () => {
      const { user } = await startInWhitemoon()

      await recruitInTown(user, 'Pikemen', { count: 5 })

      expectResourceTotal('Gold', 9700)
    })

    test('leaves fewer available the next time the window opens', async () => {
      const { user } = await startInWhitemoon()
      await recruitInTown(user, 'Pikemen', { count: 5 })

      await openRecruitWindow(user, 'Pikemen')

      expect(readAvailable()).toBe(9)
    })

    test('closes the recruit window', async () => {
      const { user } = await startInWhitemoon()
      await openRecruitWindow(user, 'Pikemen')

      await recruit(user)

      expect(queryRecruitWindow()).toBeNull()
    })

    test('puts the recruits in the first empty garrison slot', async () => {
      const { user } = await startInWhitemoon(
        aRecruitingScenario({ town: aWhitemoon({ garrison: [{ creature: 'ARCHER', count: 6 }] }) })
      )

      await recruitInTown(user, 'Pikemen', { count: 5 })

      expect(readGarrison()).toEqual(['Archers 6', 'Pikemen 5', '', '', '', '', ''])
    })

    test('adds the recruits to a garrison stack of the same creature', async () => {
      const { user } = await startInWhitemoon(
        aRecruitingScenario({
          town: aWhitemoon({
            garrison: [
              { creature: 'ARCHER', count: 6 },
              { creature: 'PIKEMAN', count: 20 }
            ]
          })
        })
      )

      await recruitInTown(user, 'Pikemen', { count: 5 })

      expect(readGarrison()).toEqual(['Archers 6', 'Pikemen 25', '', '', '', '', ''])
    })

    test('with the garrison full of other creatures, says there is no room even with a visiting hero who has room', async () => {
      const { user } = await setupApp(
        aRecruitingScenario({
          town: aWhitemoon({ garrison: FULL_GARRISON }),
          hero: aHero()
            .at(4, 5)
            .withArmy([{ creature: 'PIKEMAN', count: 3 }])
        })
      )
      await enterTownAt(4, 3)
      await openRecruitWindow(user, 'Pikemen')

      await recruit(user)

      expect(readTownMessage()).toBe('There is no room in the garrison for this army.')
      await closeTownMessage(user)
      expectResourceTotal('Gold', 10000)
      expect(readVisitingHeroArmy()).toEqual(['Pikemen 3', '', '', '', '', '', ''])
    })

    test('the recruit window is still open after the no-room message is closed', async () => {
      const { user } = await startInWhitemoon(
        aRecruitingScenario({ town: aWhitemoon({ garrison: FULL_GARRISON }) })
      )
      await openRecruitWindow(user, 'Pikemen')
      await recruit(user)

      await closeTownMessage(user)

      expect(queryRecruitWindow('Recruit Pikemen')).toBeTruthy()
    })

    test('after leaving the town, its town box shows the recruits in the garrison', async () => {
      const { user } = await startInWhitemoon()
      await recruitInTown(user, 'Pikemen', { count: 5 })

      await leaveTown(user)

      expect(readArmySlots(getTownInfoBox(), 'Garrison')[0]).toBe('Pikemen 5')
    })

    test('after leaving the town, its right-click popup shows the recruits in the garrison', async () => {
      const { user } = await startInWhitemoon()
      await recruitInTown(user, 'Pikemen', { count: 5 })
      await leaveTown(user)

      await holdRightButtonOn(user, 4, 2)

      expect(readArmySlots(screen.getByRole('tooltip'), 'Garrison')[0]).toBe('Pikemen 5')
    })

    test("recruiting one tier leaves another tier's creatures available", async () => {
      const { user } = await startInWhitemoon(
        aRecruitingScenario({
          town: aWhitemoon({ buildings: ['FORT', 'GUARDHOUSE', 'ARCHERS_TOWER'] })
        })
      )
      await recruitInTown(user, 'Pikemen', { max: true })

      await openRecruitWindow(user, 'Archers')

      expect(readAvailable()).toBe(9)
    })
  })

  describe('growth over time', () => {
    test('a new week adds the week of creatures', async () => {
      const { user } = await startInWhitemoon()

      await endWeekAwayFromTown(user)

      await openRecruitWindow(user, 'Pikemen')
      expect(readAvailable()).toBe(28)
    })

    test('creatures left unbought pile up with the new week', async () => {
      const { user } = await startInWhitemoon()
      await recruitInTown(user, 'Pikemen', { count: 10 })

      await endWeekAwayFromTown(user)

      await openRecruitWindow(user, 'Pikemen')
      expect(readAvailable()).toBe(18)
    })

    test('ending a turn in the middle of the week adds nothing', async () => {
      const { user } = await startInWhitemoon()
      await leaveTown(user)

      await endTurns(user, 6)

      await openWhitemoon(user)
      await openRecruitWindow(user, 'Pikemen')
      expect(readAvailable()).toBe(14)
    })

    test("a neutral town's creatures pile up too, so a town captured in week 2 has two weeks of them", async () => {
      const { user } = await setupApp(
        aRecruitingScenario({ town: aTown().named('Whitemoon').withBuildings(GUARDHOUSE) })
      )
      await endTurns(user, 7)

      await enterTownAt(4, 3)

      await openRecruitWindow(user, 'Pikemen')
      expect(readAvailable()).toBe(28)
    })

    // 21 to start with (Citadel), then 28 for the week with the Castle.
    test('the new week counts a Castle built during the week', async () => {
      const { user } = await startInWhitemoon(
        aRecruitingScenario({
          town: aWhitemoon({ buildings: ['FORT', 'CITADEL', 'GUARDHOUSE'] }),
          resources: { WOOD_PILE: 10, ORE_PILE: 10, GOLD_PILE: 5000 }
        })
      )
      await buildInTown(user, 'Castle')

      await endWeekAwayFromTown(user)

      await openRecruitWindow(user, 'Pikemen')
      expect(readAvailable()).toBe(49)
    })

    test('a Guardhouse built today has a week of Pikemen straight away', async () => {
      const { user } = await startInWhitemoon(
        aRecruitingScenario({
          town: aWhitemoon({ buildings: ['FORT'] }),
          resources: { ORE_PILE: 10, GOLD_PILE: 500 }
        })
      )

      await buildInTown(user, 'Guardhouse')

      await openRecruitWindow(user, 'Pikemen')
      expect(readAvailable()).toBe(14)
    })

    test('building the upgraded dwelling keeps the creatures already there', async () => {
      const { user } = await startInWhitemoon(
        aRecruitingScenario({ resources: { ORE_PILE: 5, GOLD_PILE: 2000 } })
      )
      await recruitInTown(user, 'Pikemen', { count: 4 })

      await buildInTown(user, 'Upg. Guardhouse')

      await openRecruitWindow(user, 'Halberdiers')
      expect(readAvailable()).toBe(10)
    })
  })

  describe('reloading', () => {
    test('after recruiting, the garrison, resources and creatures available are as they were', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await startInWhitemoon(aRecruitingScenario(), { eventLog })
      await recruitInTown(user, 'Pikemen', { count: 5 })

      const { user: userAfterReload } = await setupApp(aRecruitingScenario(), { eventLog })

      expect(readGarrison()[0]).toBe('Pikemen 5')
      expectResourceTotal('Gold', 9700)
      await openRecruitWindow(userAfterReload, 'Pikemen')
      expect(readAvailable()).toBe(9)
    })

    test("after a new week, the creatures available still include that week's", async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await startInWhitemoon(aRecruitingScenario(), { eventLog })
      await endWeekAwayFromTown(user)

      const { user: userAfterReload } = await setupApp(aRecruitingScenario(), { eventLog })

      await openRecruitWindow(userAfterReload, 'Pikemen')
      expect(readAvailable()).toBe(28)
    })
  })
})
