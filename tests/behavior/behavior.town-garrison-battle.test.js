// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  confirmTileClickByDispatch,
  getHeroEntity,
  getMapCursor,
  getTownEntity,
  holdRightButtonOn,
  hoverTile,
  queryInfoPopup,
  readOwnerFlags
} from './adventure-map.utils.js'
import {
  endTurns,
  expectResourceTotal,
  readArmySlots,
  readTownList
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import {
  closeBattleResults,
  getBattleButton,
  LOWEST_ROLLS,
  moveActiveStackTo,
  queryBattleScreen,
  readBattleResultsMessage,
  readBattleResultsSide,
  readBattleStacks,
  retreat,
  waitForBattleResults,
  winBattle
} from './battle.utils.js'
import { ARMY_THAT_WINS, aHero, aScenario, aTown } from './builders.js'
import { leaveTown, queryTownScreen, readGarrison, readTownName } from './town-screen.utils.js'

const HERO_NAME = 'Sir Christian'

const gameDefinitions = {
  hero: { ...readGameData('hero.json'), name: HERO_NAME },
  heroClasses: readGameData('hero-classes.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

const stack = (creature, count) => ({ creature, count })

// The town's entrance is at (4, 3); its building covers the two tiles either side and the two
// rows above. The hero starts two tiles below the entrance.
const ENTRANCE = { x: 4, y: 3 }

const PIKEMEN_AND_ARCHERS = [stack('PIKEMAN', 10), null, stack('ARCHER', 4)]

const aKirkwall = () =>
  aTown().named('Kirkwall').ownedBy('blue').withGarrison(PIKEMEN_AND_ARCHERS).at(4, 3)

const aGarrisonScenario = ({
  town = aKirkwall(),
  hero = aHero().withArmy(ARMY_THAT_WINS).at(4, 5),
  others = []
} = {}) =>
  aScenario()
    .withSize(9, 7)
    .withEntities(hero, town, ...others)
    .withDefinitions(gameDefinitions)

async function setupApp(scenario, { eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    eventLog,
    appConfig: { random: LOWEST_ROLLS, interactionModalTransitionMs: 0 }
  })
}

async function attackTown() {
  confirmTileClickByDispatch(ENTRANCE.x, ENTRANCE.y)
  await waitMs()
}

async function captureTown(user) {
  await attackTown()
  await winBattle(user)
  await waitMs()
}

const readBattleStackNames = () =>
  readBattleStacks()
    .map(({ stack }) => stack)
    .sort()

// One Angel (speed 12) against 20 Swordsmen (speed 5): the Angel moves first, to where the
// Swordsmen walk up and attack it; its strike back kills 2 of them.
const aSwordsmenGarrison = () => aKirkwall().withGarrison([stack('SWORDSMAN', 20)])

async function retreatAfterSwordsmenLoseTwo(user) {
  await moveActiveStackTo(user, 6, 9)
  await retreat(user)
  await closeBattleResults(user)
}

describe('attacking a town garrison behavior', () => {
  describe('the cursor', () => {
    test('given a blue town with a garrison the hero can reach when the mouse is over its entrance then the cursor is the swords', async () => {
      const { user } = await setupApp(aGarrisonScenario())
      await loadAppStyles()

      await hoverTile(user, ENTRANCE.x, ENTRANCE.y)

      expect(getMapCursor()).toBe('attack')
    })

    test('given a blue town with an empty garrison when the mouse is over its entrance then the cursor is the horse', async () => {
      const { user } = await setupApp(
        aGarrisonScenario({ town: aKirkwall().withGarrison([null, null]) })
      )
      await loadAppStyles()

      await hoverTile(user, ENTRANCE.x, ENTRANCE.y)

      expect(getMapCursor()).toBe('visit')
    })
  })

  describe('the battle', () => {
    test("when the hero enters a blue town with a garrison then a battle starts against the garrison's stacks", async () => {
      await setupApp(aGarrisonScenario())

      await attackTown()

      expect(queryBattleScreen()).toBeTruthy()
      expect(readBattleStackNames()).toEqual(['Angels 10', 'Archers 4', 'Pikemen 10'])
    })

    test('when the hero enters a neutral town with a garrison then a battle starts against it', async () => {
      await setupApp(
        aGarrisonScenario({
          town: aTown()
            .named('Kirkwall')
            .withGarrison([stack('SWORDSMAN', 5)])
            .at(4, 3)
        })
      )

      await attackTown()

      expect(readBattleStackNames()).toEqual(['Angels 10', 'Swordsmen 5'])
    })

    test('given the battle is against a town garrison then Surrender is disabled, saying there is no hero to surrender to', async () => {
      await setupApp(aGarrisonScenario())

      await attackTown()

      const surrender = getBattleButton('Surrender')
      expect(surrender.disabled).toBe(true)
      expect(surrender.title).toBe('There is no hero to surrender to')
    })

    test('the results window names the garrison by its strongest creature', async () => {
      const { user } = await setupApp(aGarrisonScenario())
      await attackTown()

      await user.click(getBattleButton('Auto combat'))
      await waitForBattleResults()

      // Archers are worth more than Pikemen, though the Pikemen stand in the first slot.
      expect(readBattleResultsSide('Defender')).toEqual(['Archers', 'Defeated'])
    })
  })

  describe('winning', () => {
    test("makes the town the player's, with only the player's flag and in the town list", async () => {
      const { user } = await setupApp(aGarrisonScenario())

      await captureTown(user)
      await leaveTown(user)

      expect(readOwnerFlags(getTownEntity())).toEqual(['Red player flag'])
      expect(readTownList()).toEqual(['Kirkwall'])
    })

    test('opens the town screen with the hero visiting and the garrison empty', async () => {
      const { user } = await setupApp(aGarrisonScenario())

      await captureTown(user)

      expect(queryTownScreen()).toBeTruthy()
      expect(readTownName()).toBe('Kirkwall')
      expect(readGarrison()).toEqual(['', '', '', '', '', '', ''])
    })

    test("shows the town's popup with an empty garrison once it is the player's", async () => {
      const { user } = await setupApp(aGarrisonScenario())
      await captureTown(user)
      await leaveTown(user)

      await holdRightButtonOn(user, 3, 2)

      expect(readArmySlots(queryInfoPopup(), 'Garrison')).toEqual(['', '', '', '', '', '', ''])
    })

    test("gives the hero the garrison's hit points as experience when the town has no walls", async () => {
      const { user } = await setupApp(aGarrisonScenario())
      await attackTown()

      await user.click(getBattleButton('Auto combat'))
      await waitForBattleResults()

      // 10 Pikemen and 4 Archers of 10 hit points each.
      expect(readBattleResultsMessage()).toEqual([
        'A glorious victory!',
        `For valor in combat, ${HERO_NAME} receives 140 experience`
      ])
    })

    test('gives the hero 500 more experience for a town with a Fort, as for a siege', async () => {
      const { user } = await setupApp(
        aGarrisonScenario({ town: aKirkwall().withBuildings(['FORT']) })
      )
      await attackTown()

      await user.click(getBattleButton('Auto combat'))
      await waitForBattleResults()

      expect(readBattleResultsMessage()).toEqual([
        'A glorious victory!',
        `For valor in combat, ${HERO_NAME} receives 640 experience`
      ])
    })

    test("pays the town's income to the player from the next day", async () => {
      const { user } = await setupApp(aGarrisonScenario())
      await captureTown(user)
      await leaveTown(user)

      await endTurns(user, 1)

      expectResourceTotal('Gold', 500)
    })
  })

  describe('losing', () => {
    test('given the hero is beaten then it leaves the map and the town stays blue', async () => {
      const { user } = await setupApp(
        aGarrisonScenario({
          town: aKirkwall().withGarrison([stack('ANGEL', 5)]),
          hero: aHero()
            .withArmy([stack('PIKEMAN', 1)])
            .at(4, 5)
        })
      )
      await attackTown()

      await user.click(getBattleButton('Auto combat'))
      await waitForBattleResults()
      await closeBattleResults(user)

      expect(getHeroEntity()).toBeNull()
      expect(readOwnerFlags(getTownEntity())).toEqual(['Blue player flag'])
    })

    test('given the hero retreated then the next hero to attack fights what is left of the garrison', async () => {
      const { user } = await setupApp(
        aGarrisonScenario({
          town: aSwordsmenGarrison(),
          hero: aHero()
            .withArmy([stack('ANGEL', 1)])
            .at(4, 5),
          others: [aHero().withId('hero-2').withName('Valeska').withArmy(ARMY_THAT_WINS).at(4, 6)]
        })
      )
      await attackTown()
      await retreatAfterSwordsmenLoseTwo(user)

      await attackTown()

      expect(readBattleStackNames()).toEqual(['Angels 10', 'Swordsmen 18'])
    })
  })

  describe('after a reload', () => {
    test('keeps a town won from its garrison the player’s, with its garrison empty', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(aGarrisonScenario(), { eventLog })
      await captureTown(user)
      await leaveTown(user)

      const reloaded = await setupApp(aGarrisonScenario(), { eventLog })

      expect(readOwnerFlags(getTownEntity())).toEqual(['Red player flag'])
      await holdRightButtonOn(reloaded.user, 3, 2)
      expect(readArmySlots(queryInfoPopup(), 'Garrison')).toEqual(['', '', '', '', '', '', ''])
    })

    test('keeps what is left of the garrison after the hero retreated', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = () =>
        aGarrisonScenario({
          town: aSwordsmenGarrison(),
          hero: aHero()
            .withArmy([stack('ANGEL', 1)])
            .at(4, 5),
          others: [aHero().withId('hero-2').withName('Valeska').withArmy(ARMY_THAT_WINS).at(4, 6)]
        })
      const { user } = await setupApp(scenario(), { eventLog })
      await attackTown()
      await retreatAfterSwordsmenLoseTwo(user)

      await setupApp(scenario(), { eventLog })
      await attackTown()

      expect(readBattleStackNames()).toEqual(['Angels 10', 'Swordsmen 18'])
    })
  })
})
