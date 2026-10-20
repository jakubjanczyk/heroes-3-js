// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import {
  clickTile,
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectMonsterAt,
  expectMonsterDefeating,
  expectMonsterNotPresent,
  expectMonsterPresent,
  expectNoPreview,
  expectPreviewTargetAt
} from './adventure-map.utils.js'
import { expectMovementPoints } from './adventure-panels.utils.js'
import { flushMicrotasks, readGameData, setupMovementBehaviorApp, waitMs } from './app.utils.js'
import { getBattleScreen, queryBattleScreen, winBattle } from './battle.utils.js'
import { ARMY_THAT_WINS, aHero, aMonster, aScenario } from './builders.js'
import { SWAMP } from './terrain-codes.js'

const monsters = readGameData('monsters.json')

const aWinningHero = () => aHero().withArmy(ARMY_THAT_WINS)

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
    await flushMicrotasks()

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
    await flushMicrotasks()
    await waitMs()

    expectHeroAt(0, 0)
    expectMovementPoints(1400)
    expectMonsterPresent('monster-1')
    expect(getBattleScreen()).toBeTruthy()

    await winBattle(user)

    expect(queryBattleScreen()).toBeNull()
    expectMonsterDefeating('monster-1')

    await waitMs(25)
    await flushMicrotasks()

    expectMonsterNotPresent('monster-1')

    await clickTile(user, 2, 0)
    await flushMicrotasks()

    expectPreviewTargetAt(2, 0)
  })

  test('given monster is not adjacent when player confirms attack then hero stops on tile before monster and fight still costs one step', async () => {
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
    expectMovementPoints(1300)
    expectMonsterPresent('monster-1')

    await winBattle(user)
    await waitMs(50)
    await flushMicrotasks()

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
    await flushMicrotasks()

    expectHeroAt(1, 0)
    expect(queryBattleScreen()).toBeNull()
    expectMonsterPresent('monster-1')

    await waitMs(25)
    await flushMicrotasks()

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
    await flushMicrotasks()

    expect(queryBattleScreen()).toBeNull()
    expectMonsterPresent('monster-1')

    await waitMs(220)
    await flushMicrotasks()

    expect(getBattleScreen()).toBeTruthy()
  })

  test('given remaining points do not cover the step onto a monster when player confirms then hero stops next to it and the fight does not start', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(10)
        .withTiles(new Array(10).fill(SWAMP))
        .withEntities(aHero(), aMonster().at(9, 0))
        .build()
    })

    // 8 swamp steps cost 1400; the attack step from the 8th tile would cost 175 more.
    confirmTileClickByDispatch(9, 0)
    await flushMicrotasks()
    await waitMs()

    expectHeroAt(8, 0)
    expect(queryBattleScreen()).toBeNull()
    expectMonsterPresent('monster-1')
  })
})
