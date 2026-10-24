// @vitest-environment jsdom
import { within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'
import {
  attackMonsterAt,
  clickTile,
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectMinePresent,
  expectMonsterAt,
  expectMonsterDefeating,
  expectMonsterNotPresent,
  expectMonsterPresent,
  expectNoPreview,
  expectPreviewTargetAt,
  expectResourcePresent
} from './adventure-map.utils.js'
import {
  closeInteractionModal,
  expectMovementPoints,
  expectResourceTotal,
  getTreasureChestDialog,
  queryLevelUpPopup,
  readTownList
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { getBattleScreen, queryBattleScreen, winBattle } from './battle.utils.js'
import {
  ARMY_THAT_WINS,
  aHero,
  aMine,
  aMonster,
  aResource,
  aScenario,
  aTown,
  aTreasureChest
} from './builders.js'
import { SWAMP } from './terrain-codes.js'

const monsters = readGameData('monsters.json')

const aWinningHero = () => aHero().withArmy(ARMY_THAT_WINS)

async function moveHeroTo(x, y) {
  confirmTileClickByDispatch(x, y)
  await waitMs()
}

describe('monster interaction behavior', () => {
  test('given scenario contains a monster when app boots then monster is rendered', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(3).withEntities(aHero(), aMonster()).build()
    })

    expectMonsterAt(1, 0, 'monster-1')
  })

  test('given monster blocks the direct path when player clicks tile behind it then no path preview is shown', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(3).withEntities(aHero(), aMonster()).build()
    })

    dispatchTileClick(2, 0)

    expectNoPreview()
    expectHeroAt(0, 0)
  })

  test('given player confirms monster attack when movement finishes then the battle opens and the monster fades out once it is won', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(4)
        .withEntities(aWinningHero(), aMonster())
        .withDefinitions({ monsters })
        .build(),
      appConfig: { fadeOutMsByKind: { MONSTER: 20 } }
    })

    confirmTileClickByDispatch(1, 0)
    await waitMs()

    expectHeroAt(0, 0)
    expectMovementPoints(1400)
    expectMonsterPresent('monster-1')
    expect(getBattleScreen()).toBeTruthy()

    await winBattle(user)

    expect(queryBattleScreen()).toBeNull()
    expectMonsterDefeating('monster-1')

    await waitMs(25)

    expectMonsterNotPresent('monster-1')

    await clickTile(user, 2, 0)

    expectPreviewTargetAt(2, 0)
  })

  test('given monster is not adjacent when player confirms attack then hero stops on tile before monster and pays only the steps up to it', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(4)
        .withEntities(aWinningHero(), aMonster().at(2, 0))
        .withDefinitions({ monsters })
        .build(),
      appConfig: { fadeOutMsByKind: { MONSTER: 20 } }
    })

    confirmTileClickByDispatch(2, 0)
    await flushMicrotasks()

    expectHeroAt(1, 0)
    expectMovementPoints(1400)
    expectMonsterPresent('monster-1')

    await winBattle(user)
    await waitMs(50)

    expectMonsterNotPresent('monster-1')
  })

  test('given final step before monster resolves when movement is still animating then the battle waits until hero fully reaches the last tile', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(4).withEntities(aHero(), aMonster().at(2, 0)).build(),
      movementStepDelayMs: 20,
      appConfig: {
        interactionModalTransitionMs: 0,
        fadeOutMsByKind: { MONSTER: 0 }
      }
    })

    confirmTileClickByDispatch(2, 0)
    await waitMs(25)

    expectHeroAt(1, 0)
    expect(queryBattleScreen()).toBeNull()
    expectMonsterPresent('monster-1')

    await waitMs(25)

    expect(getBattleScreen()).toBeTruthy()
  })

  test('given default-speed movement when hero is still visually arriving before a monster then the battle does not open yet', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(4).withEntities(aHero(), aMonster().at(2, 0)).build(),
      movementStepDelayMs: 220,
      appConfig: {
        interactionModalTransitionMs: 0,
        fadeOutMsByKind: { MONSTER: 0 }
      }
    })

    confirmTileClickByDispatch(2, 0)
    await waitMs(250)

    expect(queryBattleScreen()).toBeNull()
    expectMonsterPresent('monster-1')

    await waitMs(220)

    expect(getBattleScreen()).toBeTruthy()
  })

  test('given remaining points fall short of the step onto a monster when player confirms then the battle starts once the hero enters the tile next to it', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(10)
        .withTiles(new Array(10).fill(SWAMP))
        .withEntities(aHero(), aMonster().at(9, 0))
        .build()
    })

    // 8 swamp steps cost 1400 of 1500; the step onto the monster would cost 175 more.
    await attackMonsterAt(9, 0)

    expectHeroAt(8, 0)
    expect(getBattleScreen()).toBeTruthy()
  })
})

describe('tiles a monster guards', () => {
  test('given a monster when the hero steps onto a tile next to it then the battle starts with the hero on that tile', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(5).withEntities(aHero(), aMonster().at(3, 0)).build()
    })

    await moveHeroTo(2, 0)

    expectHeroAt(2, 0)
    expect(getBattleScreen()).toBeTruthy()
  })

  test('given the hero won a battle started next to a monster then it stays on that tile', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(5)
        .withEntities(aWinningHero(), aMonster().at(3, 0))
        .withDefinitions({ monsters })
        .build()
    })
    await moveHeroTo(2, 0)

    await winBattle(user)

    expect(queryBattleScreen()).toBeNull()
    expectHeroAt(2, 0)
  })

  test("given the hero stands next to a monster when it steps onto a tile out of the monster's reach then no battle starts", async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(4)
        .withEntities(aHero().at(1, 0), aMonster().at(2, 0))
        .build()
    })

    await moveHeroTo(0, 0)

    expectHeroAt(0, 0)
    expect(queryBattleScreen()).toBeNull()
  })

  test("given the shortest route passes next to a monster when the player picks a tile beyond it then the hero goes around the monster's tiles", async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(5, 3)
        .withEntities(aHero().at(0, 1), aMonster().at(2, 2))
        .build()
    })

    // The monster guards x 1-3 on rows 1 and 2, so the hero takes row 0.
    await moveHeroTo(4, 1)

    expectHeroAt(4, 1)
    expect(queryBattleScreen()).toBeNull()
  })

  test('given the only way to a tile passes next to a monster when the player clicks it then no route is shown', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(6, 2).withEntities(aHero(), aMonster().at(3, 1)).build()
    })

    // Both rows pass through the monster's tiles at x 2-4.
    dispatchTileClick(5, 0)

    expectNoPreview()
  })

  describe('a tile two monsters guard', () => {
    const aTileTwoMonstersGuard = (hero = aWinningHero()) =>
      aScenario()
        .withSize(4, 2)
        .withEntities(hero, aMonster().at(3, 0), aMonster().withId('monster-2').at(3, 1))
        .withDefinitions({
          monsters,
          hero: readGameData('hero.json'),
          heroClasses: readGameData('hero-classes.json')
        })

    test('given a tile two monsters guard when the hero won the first battle there then the second battle starts', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aTileTwoMonstersGuard().build()
      })
      await moveHeroTo(2, 0)

      await winBattle(user)

      expect(getBattleScreen()).toBeTruthy()
      expectMonsterDefeating('monster-1')
      expectMonsterPresent('monster-2')
    })

    test('given the hero goes up a level in the first of two battles when its results close then the level-up popup shows before the second battle', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aTileTwoMonstersGuard(aWinningHero().withExperience(950)).build()
      })
      await moveHeroTo(2, 0)

      await winBattle(user)

      expect(queryLevelUpPopup()).toBeTruthy()
      expect(queryBattleScreen()).toBeNull()
    })

    test('given the level-up popup between two battles when the player closes it then the second battle starts', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aTileTwoMonstersGuard(aWinningHero().withExperience(950)).build()
      })
      await moveHeroTo(2, 0)
      await winBattle(user)

      await closeInteractionModal(user)

      expect(getBattleScreen()).toBeTruthy()
    })

    test('given the page reloads during the first of two battles when the hero wins it then the second battle starts', async () => {
      const eventLog = createMemoryEventLog()
      await setupMovementBehaviorApp({ loadGameOptions: aTileTwoMonstersGuard().build(), eventLog })
      await moveHeroTo(2, 0)
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aTileTwoMonstersGuard().build(),
        eventLog
      })

      await winBattle(user)

      expect(getBattleScreen()).toBeTruthy()
      expectMonsterPresent('monster-2')
    })
  })

  describe("a monster next to a building's entrance", () => {
    test("given a monster guards a mine's entrance when the hero won the battle there then the mine is the player's", async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aScenario()
          .withSize(8, 3)
          .withEntities(aWinningHero().at(2, 2), aMine().at(2, 1), aMonster().at(3, 2))
          .withDefinitions({ monsters, mines: readGameData('mines.json') })
          .build()
      })
      await moveHeroTo(2, 1)

      await winBattle(user)

      expect(
        within(expectMinePresent()).queryByRole('img', { name: 'Red player flag' })
      ).not.toBeNull()
    })

    test("given a monster guards a town's entrance when the hero won the battle there then the town is the player's", async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aScenario()
          .withSize(8, 5)
          .withEntities(
            aWinningHero().at(2, 3),
            aTown().named('Whitemoon').at(3, 2),
            aMonster().at(4, 3)
          )
          .withDefinitions({ monsters })
          .build()
      })
      await moveHeroTo(3, 2)

      await winBattle(user)

      expect(readTownList()).toEqual(['Whitemoon'])
    })
  })

  describe('an object next to a monster', () => {
    const goldDefinitions = { resources: { GOLD_PILE: { name: 'Gold pile', amount: 100 } } }

    // The object at 2 is in the zone of the monster at 3; the hero reaches it from 1, outside it.
    const anObjectNextToAMonster = (object) =>
      aScenario()
        .withSize(5)
        .withEntities(aWinningHero(), object.at(2, 0), aMonster().at(3, 0))
        .withDefinitions({ monsters, ...goldDefinitions })

    test('given a resource next to a monster when the hero goes for it then the battle starts before the resource is taken', async () => {
      await setupMovementBehaviorApp({
        loadGameOptions: anObjectNextToAMonster(aResource()).build()
      })

      await moveHeroTo(2, 0)

      expectHeroAt(1, 0)
      expect(getBattleScreen()).toBeTruthy()
      expectResourcePresent('resource-1')
    })

    test('given the hero won the battle for a resource next to a monster then the resource is collected', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: anObjectNextToAMonster(aResource()).build()
      })
      await moveHeroTo(2, 0)

      await winBattle(user)

      expectResourceTotal('Gold pile', 100)
    })

    test('given the hero won the battle for a chest next to a monster then the chest dialog opens', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: anObjectNextToAMonster(aTreasureChest()).build()
      })
      await moveHeroTo(2, 0)

      await winBattle(user)

      expect(getTreasureChestDialog()).toBeTruthy()
    })
  })
})
