// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  confirmTileClickByDispatch,
  expectHeroAt,
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
  waitForBattleResults
} from './battle.utils.js'
import { ARMY_THAT_WINS, aHero, aScenario, aTown } from './builders.js'
import { queryTownScreen, readGarrison, readTownName } from './town-screen.utils.js'

const HERO_NAME = 'Sir Christian'
const ENEMY_HERO = 'Valeska'

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
// rows above. The hero starts two tiles below the entrance and stops on the tile between.
const ENTRANCE = { x: 4, y: 3 }
const NEXT_TO_ENTRANCE = { x: 4, y: 4 }

const aKirkwall = () =>
  aTown()
    .named('Kirkwall')
    .ownedBy('blue')
    .withGarrison([stack('ARCHER', 4)])
    .at(ENTRANCE.x, ENTRANCE.y)

const aBlueHero = (army = [stack('PIKEMAN', 10)]) =>
  aHero()
    .withId('hero-2')
    .withName(ENEMY_HERO)
    .ownedBy('blue')
    .withArmy(army)
    .at(ENTRANCE.x, ENTRANCE.y)

const aDefendedTownScenario = ({
  town = aKirkwall(),
  defender = aBlueHero(),
  hero = aHero().withArmy(ARMY_THAT_WINS).at(4, 5),
  others = []
} = {}) =>
  aScenario()
    .withSize(9, 7)
    .withEntities(hero, town, defender, ...others)
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

async function winWithAutoCombat(user) {
  await user.click(getBattleButton('Auto combat'))
  await waitForBattleResults()
}

async function captureTown(user) {
  await attackTown()
  await winWithAutoCombat(user)
  await closeBattleResults(user)
  await waitMs()
}

const readBattleStackNames = () =>
  readBattleStacks()
    .map(({ stack }) => stack)
    .sort()

const SEVEN_STACKS = [
  stack('PIKEMAN', 1),
  stack('ARCHER', 1),
  stack('HALBERDIER', 1),
  stack('MARKSMAN', 1),
  stack('SWORDSMAN', 1),
  stack('CRUSADER', 1),
  stack('MONK', 1)
]

// One Angel (speed 12) against 20 Swordsmen (speed 5) from the garrison and 4 Archers of the blue
// hero: the Angel moves first, to where the Swordsmen walk up and attack it; its strike back kills
// 2 of them.
const aRetreatScenario = () =>
  aDefendedTownScenario({
    town: aKirkwall().withGarrison([stack('SWORDSMAN', 20)]),
    defender: aBlueHero([stack('ARCHER', 4)]),
    hero: aHero()
      .withArmy([stack('ANGEL', 1)])
      .at(4, 5),
    others: [aHero().withId('hero-3').withName('Sir Mullich').withArmy(ARMY_THAT_WINS).at(4, 6)]
  })

async function retreatAfterSwordsmenLoseTwo(user) {
  await moveActiveStackTo(user, 9, 9)
  await retreat(user)
  await closeBattleResults(user)
}

describe('an enemy hero defending its town behavior', () => {
  test('given a blue hero in a blue town the hero can reach when the mouse is over the entrance then the cursor is the swords', async () => {
    const { user } = await setupApp(aDefendedTownScenario())
    await loadAppStyles()

    await hoverTile(user, ENTRANCE.x, ENTRANCE.y)

    expect(getMapCursor()).toBe('attack')
  })

  describe('the battle', () => {
    test('when the hero walks into a blue town with a blue hero in it then the hero stops next to the entrance and a battle starts against the blue hero', async () => {
      await setupApp(aDefendedTownScenario({ town: aKirkwall().withGarrison([]) }))

      await attackTown()

      expect(queryBattleScreen()).toBeTruthy()
      expect(readBattleStackNames()).toEqual(['Angels 10', 'Pikemen 10'])
      expectHeroAt(NEXT_TO_ENTRANCE.x, NEXT_TO_ENTRANCE.y)
    })

    test("given the blue town has a garrison then its stacks fight on the blue hero's side, each in its own slot", async () => {
      await setupApp(
        aDefendedTownScenario({
          town: aKirkwall().withGarrison([stack('PIKEMAN', 5), stack('ARCHER', 4)])
        })
      )

      await attackTown()

      expect(readBattleStackNames()).toEqual(['Angels 10', 'Archers 4', 'Pikemen 10', 'Pikemen 5'])
    })

    test("given the blue hero's seven slots are full then the garrison's stacks don't fight", async () => {
      await setupApp(aDefendedTownScenario({ defender: aBlueHero(SEVEN_STACKS) }))

      await attackTown()

      expect(readBattleStackNames()).toEqual([
        'Angels 10',
        'Archer 1',
        'Crusader 1',
        'Halberdier 1',
        'Marksman 1',
        'Monk 1',
        'Pikeman 1',
        'Swordsman 1'
      ])
    })

    test('the results window names the blue hero as the defender', async () => {
      const { user } = await setupApp(aDefendedTownScenario())
      await attackTown()

      await winWithAutoCombat(user)

      expect(readBattleResultsSide('Defender')).toEqual([ENEMY_HERO, 'Defeated'])
    })
  })

  describe('winning', () => {
    test("makes the town the player's, with only the player's flag and in the town list", async () => {
      const { user } = await setupApp(aDefendedTownScenario())

      await captureTown(user)

      expect(readOwnerFlags(getTownEntity())).toEqual(['Red player flag'])
      expect(readTownList()).toEqual(['Kirkwall'])
    })

    test('the blue hero is gone from the map', async () => {
      const { user } = await setupApp(aDefendedTownScenario())

      await captureTown(user)

      expect(getHeroEntity('hero-2')).toBeNull()
    })

    test('leaves the hero next to the town, with no town screen open', async () => {
      const { user } = await setupApp(aDefendedTownScenario())

      await captureTown(user)

      expectHeroAt(NEXT_TO_ENTRANCE.x, NEXT_TO_ENTRANCE.y)
      expect(queryTownScreen()).toBeNull()
    })

    test('when the hero then walks into the town then the town screen opens with an empty garrison', async () => {
      const { user } = await setupApp(aDefendedTownScenario())
      await captureTown(user)

      await attackTown()

      expect(readTownName()).toBe('Kirkwall')
      expect(readGarrison()).toEqual(['', '', '', '', '', '', ''])
    })

    test('gives the hero the hit points killed and 500 for the blue hero as experience, for a town without walls', async () => {
      const { user } = await setupApp(aDefendedTownScenario())
      await attackTown()

      await winWithAutoCombat(user)

      // 10 Pikemen and the garrison's 4 Archers of 10 hit points each, and 500 for the beaten hero.
      expect(readBattleResultsMessage()).toEqual([
        'A glorious victory!',
        `For valor in combat, ${HERO_NAME} receives 640 experience`
      ])
    })

    test('gives 500 more for a town with a Fort', async () => {
      const { user } = await setupApp(
        aDefendedTownScenario({ town: aKirkwall().withBuildings(['FORT']) })
      )
      await attackTown()

      await winWithAutoCombat(user)

      expect(readBattleResultsMessage()).toEqual([
        'A glorious victory!',
        `For valor in combat, ${HERO_NAME} receives 1140 experience`
      ])
    })

    test("pays the town's income to the player from the next day", async () => {
      const { user } = await setupApp(aDefendedTownScenario())
      await captureTown(user)

      await endTurns(user, 1)

      expectResourceTotal('Gold', 500)
    })
  })

  describe('losing', () => {
    test('given the hero is beaten then it leaves the map and the town stays blue', async () => {
      const { user } = await setupApp(
        aDefendedTownScenario({
          defender: aBlueHero([stack('ANGEL', 5)]),
          hero: aHero()
            .withArmy([stack('PIKEMAN', 1)])
            .at(4, 5)
        })
      )
      await attackTown()

      await winWithAutoCombat(user)
      await closeBattleResults(user)

      expect(getHeroEntity()).toBeNull()
      expect(getHeroEntity('hero-2')).toBeTruthy()
      expect(readOwnerFlags(getTownEntity())).toEqual(['Blue player flag'])
    })

    test("given the hero retreated then the blue hero's popup shows only what is left of its own army", async () => {
      const { user } = await setupApp(aRetreatScenario())
      await attackTown()
      await retreatAfterSwordsmenLoseTwo(user)

      await holdRightButtonOn(user, ENTRANCE.x, ENTRANCE.y)

      expect(readArmySlots(screen.getByRole('tooltip'))).toEqual([
        'Archers Few',
        '',
        '',
        '',
        '',
        '',
        ''
      ])
    })

    test('given the hero retreated when the next hero attacks the town then it fights the blue hero and what is left of the garrison', async () => {
      const { user } = await setupApp(aRetreatScenario())
      await attackTown()
      await retreatAfterSwordsmenLoseTwo(user)

      await attackTown()

      expect(readBattleStackNames()).toEqual(['Angels 10', 'Archers 4', 'Swordsmen 18'])
    })
  })

  describe('after a reload', () => {
    test('given a battle against a blue hero in its town when the page reloads then the battle goes on against the same stacks', async () => {
      const eventLog = createMemoryEventLog()
      await setupApp(aDefendedTownScenario(), { eventLog })
      await attackTown()

      await setupApp(aDefendedTownScenario(), { eventLog })

      expect(readBattleStackNames()).toEqual(['Angels 10', 'Archers 4', 'Pikemen 10'])
    })

    test('keeps a town won from its hero the player’s, with the hero gone and the garrison empty', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(aDefendedTownScenario(), { eventLog })
      await captureTown(user)

      const reloaded = await setupApp(aDefendedTownScenario(), { eventLog })

      expect(readOwnerFlags(getTownEntity())).toEqual(['Red player flag'])
      expect(getHeroEntity('hero-2')).toBeNull()
      await holdRightButtonOn(reloaded.user, 3, 2)
      expect(readArmySlots(queryInfoPopup(), 'Garrison')).toEqual(['', '', '', '', '', '', ''])
    })
  })
})
