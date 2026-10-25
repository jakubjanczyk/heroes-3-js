// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  attackMonsterAt,
  confirmMove,
  dispatchTileClick,
  expectHeroAt,
  expectNoPreview,
  expectPreviewTargetAt,
  getMapViewCentreTile,
  holdRightButtonOn,
  isTileExplored,
  readPreviewPathTiles
} from './adventure-map.utils.js'
import {
  clickEndTurn,
  getHeroInfoBox,
  getNextHeroButton,
  getTownInTownList,
  readArmySlots,
  readHeroList,
  readSelectedHeroInHeroList
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { LOWEST_ROLLS, readBattleStacks, winBattle } from './battle.utils.js'
import { ARMY_THAT_WINS, aHero, aMonster, aScenario, aTown } from './builders.js'
import {
  clickHeroInHeroList,
  closeHeroScreen,
  queryHeroScreen,
  readHeroScreenArmy,
  readHeroScreenBox,
  readHeroScreenTitle
} from './hero-screen.utils.js'
import { enterTownAt, getVisitingHero, readVisitingHeroArmy } from './town-screen.utils.js'

const LARGE_VIEWPORT_SIZE = { width: 1000, height: 700 }

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

const aFirstHero = () =>
  aHero()
    .withName('Sir Christian')
    .withArmy([{ creature: 'PIKEMAN', count: 20 }])

const aSecondHero = () =>
  aHero()
    .withId('hero-2')
    .withName('Valeska')
    .withArmy([{ creature: 'ARCHER', count: 4 }])

// Both heroes stand on the top row of a 10x3 map, five tiles apart.
const aTwoHeroScenario = () =>
  aScenario()
    .withSize(10, 3)
    .withEntities(aFirstHero().at(0, 0), aSecondHero().at(5, 0))
    .withDefinitions(gameDefinitions)

async function setupApp(scenario = aTwoHeroScenario(), options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0, fadeOutMsByKind: { MONSTER: 0 } },
    ...options
  })
}

async function selectHero(user, heroName) {
  await clickHeroInHeroList(user, heroName)
}

describe('multiple heroes behavior', () => {
  describe('hero list', () => {
    test('given two heroes when the game starts then both are in the hero list with full movement points', async () => {
      await setupApp()

      expect(readHeroList()).toEqual(['Sir Christian 1500', 'Valeska 1500'])
    })

    test('given two heroes when the game starts then the first is marked as selected in the hero list', async () => {
      await setupApp()

      expect(readSelectedHeroInHeroList()).toEqual(['Sir Christian'])
    })

    test('given a hero is selected when the player selects a town then no hero is marked as selected in the hero list', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(10, 3)
          .withEntities(
            aFirstHero().at(0, 0),
            aSecondHero().at(5, 0),
            aTown().named('Whitemoon').ownedByPlayer().at(8, 2)
          )
          .withDefinitions(gameDefinitions)
      )

      await user.click(getTownInTownList('Whitemoon'))

      expect(readSelectedHeroInHeroList()).toEqual([])
    })

    test('given the first hero is selected when the player clicks the second in the hero list then the second is selected and the camera centres on them', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(60, 40)
          .withEntities(aFirstHero().at(5, 5), aSecondHero().at(40, 25))
          .withDefinitions(gameDefinitions),
        { viewportSize: LARGE_VIEWPORT_SIZE }
      )

      await selectHero(user, 'Valeska')

      expect(readSelectedHeroInHeroList()).toEqual(['Valeska'])
      expect(getMapViewCentreTile()).toEqual({ x: 40, y: 25 })
    })

    test('given the second hero is selected when the player clicks them in the hero list then their hero screen opens', async () => {
      const { user } = await setupApp()
      await selectHero(user, 'Valeska')

      await clickHeroInHeroList(user, 'Valeska')

      expect(readHeroScreenTitle()).toEqual(['Valeska', 'Level 1 Knight'])
    })

    test('given the first hero is selected when the player clicks the second on the map then the second is selected', async () => {
      await setupApp()

      dispatchTileClick(5, 0)

      expect(readSelectedHeroInHeroList()).toEqual(['Valeska'])
      expect(queryHeroScreen()).toBeNull()
    })

    test('given the first hero is selected when the player holds the right button on the second then the popup shows the second hero and their army', async () => {
      const { user } = await setupApp()

      await holdRightButtonOn(user, 5, 0)

      const popup = screen.getByRole('tooltip')
      expect(within(popup).getByText('Valeska')).toBeTruthy()
      expect(readArmySlots(popup)).toEqual(['Archers 4', '', '', '', '', '', ''])
    })

    test('given the second hero is selected when the hero box shows then it shows their army', async () => {
      const { user } = await setupApp()

      await selectHero(user, 'Valeska')

      expect(readArmySlots(getHeroInfoBox())).toEqual(['Archers 4', '', '', '', '', '', ''])
    })
  })

  describe('Next hero', () => {
    test('given the first hero is selected when the player clicks Next hero then the second is selected and the camera centres on them', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(60, 40)
          .withEntities(aFirstHero().at(5, 5), aSecondHero().at(40, 25))
          .withDefinitions(gameDefinitions),
        { viewportSize: LARGE_VIEWPORT_SIZE }
      )

      await user.click(getNextHeroButton())

      expect(readSelectedHeroInHeroList()).toEqual(['Valeska'])
      expect(getMapViewCentreTile()).toEqual({ x: 40, y: 25 })
    })

    test('given the second hero is selected when the player clicks Next hero then the first is selected again', async () => {
      const { user } = await setupApp()
      await selectHero(user, 'Valeska')

      await user.click(getNextHeroButton())

      expect(readSelectedHeroInHeroList()).toEqual(['Sir Christian'])
    })

    // Fifteen steps of 100 use up the 1500 movement points.
    test('given the second hero has no movement points left when the player clicks Next hero then the first stays selected', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(30)
          .withEntities(aFirstHero().at(0, 0), aSecondHero().at(10, 0))
          .withDefinitions(gameDefinitions)
      )
      await selectHero(user, 'Valeska')
      await confirmMove(user, 25, 0)
      await selectHero(user, 'Sir Christian')

      await user.click(getNextHeroButton())

      expect(readSelectedHeroInHeroList()).toEqual(['Sir Christian'])
    })

    test('given the selected hero has no movement points left but the other has when the player clicks Next hero then the other is selected', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(30)
          .withEntities(aFirstHero().at(0, 0), aSecondHero().at(20, 0))
          .withDefinitions(gameDefinitions)
      )
      await confirmMove(user, 15, 0)

      await user.click(getNextHeroButton())

      expect(readSelectedHeroInHeroList()).toEqual(['Valeska'])
    })

    test('given no hero has movement points left when the moves finish then Next hero is disabled', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(40)
          .withEntities(aFirstHero().at(0, 0), aSecondHero().at(20, 0))
          .withDefinitions(gameDefinitions)
      )
      await confirmMove(user, 15, 0)
      await selectHero(user, 'Valeska')

      await confirmMove(user, 35, 0)

      expect(getNextHeroButton().disabled).toBe(true)
    })
  })

  describe('moving', () => {
    test('given the second hero is selected when the player moves them then they walk and the first stays where they are', async () => {
      const { user } = await setupApp()
      await selectHero(user, 'Valeska')

      await confirmMove(user, 8, 0)

      expectHeroAt(8, 0, 'hero-2')
      expectHeroAt(0, 0, 'hero-1')
    })

    // Three steps along the row at 100 each.
    test('given the second hero walks when the move finishes then only their movement points go down', async () => {
      const { user } = await setupApp()
      await selectHero(user, 'Valeska')

      await confirmMove(user, 8, 0)

      expect(readHeroList()).toEqual(['Sir Christian 1500', 'Valeska 1200'])
    })

    // Fifteen steps of 100 use up the 1500 movement points.
    test('given the first hero has no movement points left when the player selects the second then the second can still move', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(30)
          .withEntities(aFirstHero().at(0, 0), aSecondHero().at(20, 0))
          .withDefinitions(gameDefinitions)
      )
      await confirmMove(user, 15, 0)
      await selectHero(user, 'Valeska')

      await confirmMove(user, 22, 0)

      expectHeroAt(22, 0, 'hero-2')
      expect(readHeroList()).toEqual(['Sir Christian 0', 'Valeska 1300'])
    })

    test('given the first hero has a planned route when the player selects the second then their route is not shown', async () => {
      const { user } = await setupApp()
      dispatchTileClick(3, 2)

      await selectHero(user, 'Valeska')

      expectNoPreview()
    })

    test('given the first hero has a planned route when the player selects them again then their route shows again', async () => {
      const { user } = await setupApp()
      dispatchTileClick(3, 2)
      await selectHero(user, 'Valeska')

      await selectHero(user, 'Sir Christian')

      expectPreviewTargetAt(3, 2)
    })

    test("given the first hero's route shows again when the player clicks its end then the first hero walks it", async () => {
      const { user } = await setupApp()
      dispatchTileClick(3, 2)
      await selectHero(user, 'Valeska')
      await selectHero(user, 'Sir Christian')

      dispatchTileClick(3, 2)
      await flushMicrotasks()

      expectHeroAt(3, 2, 'hero-1')
      expectHeroAt(5, 0, 'hero-2')
    })

    test('given the other hero stands in the way when the player plans a route past them then it goes around them', async () => {
      await setupApp()

      dispatchTileClick(8, 0)

      expect(readPreviewPathTiles()).not.toContainEqual({ x: 5, y: 0 })
      expectPreviewTargetAt(8, 0)
    })

    test('given both heroes walked when the day ends then both have full movement points again', async () => {
      const { user } = await setupApp()
      await confirmMove(user, 2, 0)
      await selectHero(user, 'Valeska')
      await confirmMove(user, 8, 0)

      await clickEndTurn(user)

      expect(readHeroList()).toEqual(['Sir Christian 1500', 'Valeska 1500'])
    })

    test('given the second hero is selected when the day ends then the first is selected and the camera centres on them', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(60, 40)
          .withEntities(aFirstHero().at(20, 15), aSecondHero().at(45, 30))
          .withDefinitions(gameDefinitions),
        { viewportSize: LARGE_VIEWPORT_SIZE }
      )
      await selectHero(user, 'Valeska')

      await clickEndTurn(user)

      expect(readSelectedHeroInHeroList()).toEqual(['Sir Christian'])
      expect(getMapViewCentreTile()).toEqual({ x: 20, y: 15 })
    })
  })

  describe('fog of war', () => {
    const aFoggyTwoHeroScenario = () =>
      aScenario()
        .withFogOfWar(true)
        .withSize(40)
        .withEntities(aFirstHero().at(0, 0), aSecondHero().at(30, 0))
        .withDefinitions(gameDefinitions)

    // Each hero sees five tiles around them.
    test('given two heroes far apart when the game starts then the map is explored around each of them', async () => {
      await setupApp(aFoggyTwoHeroScenario())

      expect([isTileExplored(5, 0), isTileExplored(15, 0), isTileExplored(25, 0)]).toEqual([
        true,
        false,
        true
      ])
    })

    test('given the second hero is selected when they walk then the map is explored around where they went', async () => {
      const { user } = await setupApp(aFoggyTwoHeroScenario())
      await selectHero(user, 'Valeska')

      await confirmMove(user, 25, 0)

      expect(isTileExplored(20, 0)).toBe(true)
    })
  })

  describe('interactions', () => {
    test('given the second hero is selected when they walk into the town then the town screen shows them as the visiting hero with their army', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(10, 6)
          .withEntities(
            aFirstHero().at(0, 0),
            aSecondHero().at(4, 5),
            aTown().named('Whitemoon').ownedByPlayer().at(4, 3)
          )
          .withDefinitions(gameDefinitions)
      )
      await selectHero(user, 'Valeska')

      await enterTownAt(4, 3)

      expect(getVisitingHero('Valeska')).toBeTruthy()
      expect(readVisitingHeroArmy()).toEqual(['Archers 4', '', '', '', '', '', ''])
    })

    test('given the second hero is selected when they attack a monster then the battle is fought with their army', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(10, 3)
          .withEntities(
            aFirstHero().at(0, 0),
            aSecondHero().withArmy(ARMY_THAT_WINS).at(5, 0),
            aMonster().at(7, 0)
          )
          .withDefinitions(gameDefinitions),
        { appConfig: { random: LOWEST_ROLLS, fadeOutMsByKind: { MONSTER: 0 } } }
      )
      await selectHero(user, 'Valeska')

      await attackMonsterAt(7, 0)

      expect(readBattleStacks()).toContainEqual({ stack: 'Angels 10', row: 6, column: 1 })
    })

    // Ten Skeletons at 6 health each are 60 experience.
    test('given the second hero won a battle when the player opens their hero screen then the experience went to them', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(10, 3)
          .withEntities(
            aFirstHero().at(0, 0),
            aSecondHero().withArmy(ARMY_THAT_WINS).at(5, 0),
            aMonster().at(7, 0)
          )
          .withDefinitions(gameDefinitions),
        { appConfig: { random: LOWEST_ROLLS, fadeOutMsByKind: { MONSTER: 0 } } }
      )
      await selectHero(user, 'Valeska')
      await attackMonsterAt(7, 0)
      await winBattle(user)

      await clickHeroInHeroList(user, 'Valeska')
      const secondHeroExperience = readHeroScreenBox('Experience')
      await closeHeroScreen(user)
      await selectHero(user, 'Sir Christian')
      await clickHeroInHeroList(user, 'Sir Christian')

      expect([secondHeroExperience, readHeroScreenBox('Experience')]).toEqual([
        'Experience 60',
        'Experience 0'
      ])
    })

    test('given the second hero is selected when the player opens the hero screen then it shows their name and army', async () => {
      const { user } = await setupApp()
      await selectHero(user, 'Valeska')

      await clickHeroInHeroList(user, 'Valeska')

      expect(readHeroScreenTitle()).toEqual(['Valeska', 'Level 1 Knight'])
      expect(readHeroScreenArmy()).toEqual(['Archers 4', '', '', '', '', '', ''])
    })
  })

  describe('after a reload', () => {
    test('given the second hero was selected when the game reloads then they are still selected', async () => {
      const session = { eventLog: createMemoryEventLog() }
      const { user } = await setupApp(aTwoHeroScenario(), session)
      await selectHero(user, 'Valeska')

      await setupApp(aTwoHeroScenario(), session)

      expect(readSelectedHeroInHeroList()).toEqual(['Valeska'])
    })

    test('given both heroes walked when the game reloads then each is where they went with the movement points they had left', async () => {
      const session = { eventLog: createMemoryEventLog() }
      const { user } = await setupApp(aTwoHeroScenario(), session)
      await confirmMove(user, 2, 0)
      await selectHero(user, 'Valeska')
      await confirmMove(user, 8, 0)

      await setupApp(aTwoHeroScenario(), session)

      expectHeroAt(2, 0, 'hero-1')
      expectHeroAt(8, 0, 'hero-2')
      expect(readHeroList()).toEqual(['Sir Christian 1300', 'Valeska 1200'])
    })
  })
})
