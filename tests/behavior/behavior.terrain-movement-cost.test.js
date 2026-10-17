// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  clickEndTurn,
  confirmMove,
  dispatchTileClick,
  expectHeroAt,
  expectMovementPoints,
  expectPreviewOverLimitDashAt,
  expectPreviewOverLimitTargetAt,
  expectPreviewTargetAt,
  flushMicrotasks,
  getMoveButton,
  getPreviewOverLimitDashAt,
  setupMovementBehaviorApp
} from './behavior.utils.js'
import { aHero, aScenario } from './builders.js'
import { DIRT, GRASS, LAVA, ROCK, ROUGH, SAND, SNOW, SUBTERRANEAN, SWAMP } from './terrain-codes.js'

const swampRow = (length) => new Array(length).fill(SWAMP)

describe('terrain movement cost behavior', () => {
  test('given a fresh game then hero has 1500 of 1500 movement points', async () => {
    await setupMovementBehaviorApp({ loadGameOptions: aScenario().build() })

    expectMovementPoints(1500, 1500)
  })

  test.each([
    ['grass', GRASS, 1400],
    ['dirt', DIRT, 1400],
    ['lava', LAVA, 1400],
    ['subterranean', SUBTERRANEAN, 1400],
    ['rough', ROUGH, 1375],
    ['sand', SAND, 1350],
    ['snow', SNOW, 1350],
    ['swamp', SWAMP, 1325]
  ])('given hero stands on %s when player moves one straight step then movement points drop by its cost', async (_, terrain, expectedMovementPoints) => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(2).withTiles([terrain, GRASS]).build()
    })

    await confirmMove(user, 1, 0)
    await flushMicrotasks()

    expectHeroAt(1, 0)
    expectMovementPoints(expectedMovementPoints)
  })

  test.each([
    ['grass', GRASS, 1359],
    ['rough', ROUGH, 1324],
    ['sand', SAND, 1288],
    ['swamp', SWAMP, 1253]
  ])('given hero stands on %s when player moves one diagonal step then movement points drop by its diagonal cost', async (_, terrain, expectedMovementPoints) => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(2, 2).withTiles([terrain, GRASS, GRASS, GRASS]).build()
    })

    await confirmMove(user, 1, 1)
    await flushMicrotasks()

    expectHeroAt(1, 1)
    expectMovementPoints(expectedMovementPoints)
  })

  test('given hero stands on grass when player steps onto swamp then the step costs 100', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(2).withTiles([GRASS, SWAMP]).build()
    })

    await confirmMove(user, 1, 0)
    await flushMicrotasks()

    expectHeroAt(1, 0)
    expectMovementPoints(1400)
  })

  test('given a swamp patch between hero and destination when going around is cheaper then the route goes around it', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(5, 3)
        .withTiles(
          [
            [GRASS, GRASS, GRASS, GRASS, GRASS],
            [GRASS, SWAMP, SWAMP, SWAMP, GRASS],
            [GRASS, GRASS, GRASS, GRASS, GRASS]
          ].flat()
        )
        .withEntities(aHero().at(0, 1))
        .build()
    })

    await confirmMove(user, 4, 1)
    await flushMicrotasks()

    expectHeroAt(4, 1)
    // Around: two diagonal and two straight grass steps (141 + 100 + 100 + 141).
    // Through the swamp it would cost 100 + 175 + 175 + 175.
    expectMovementPoints(1018)
  })

  test('given a detour around a swamp patch would cost more than crossing it then the route crosses the swamp', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(3, 3)
        .withTiles(
          [
            [GRASS, GRASS, GRASS],
            [GRASS, SWAMP, GRASS],
            [GRASS, GRASS, GRASS]
          ].flat()
        )
        .withEntities(aHero().at(0, 1))
        .build()
    })

    await confirmMove(user, 2, 1)
    await flushMicrotasks()

    expectHeroAt(2, 1)
    // Across: onto the swamp from grass (100), then off the swamp (175).
    // Around it would cost two diagonal grass steps (141 + 141).
    expectMovementPoints(1225)
  })

  test('given two blocked tiles on either side of a diagonal step when player confirms it then hero steps diagonally between them', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(2, 2).withTiles([GRASS, ROCK, ROCK, GRASS]).build()
    })

    await confirmMove(user, 1, 1)
    await flushMicrotasks()

    expectHeroAt(1, 1)
    expectMovementPoints(1359)
  })

  test("given a swamp route longer than today's points when preview is shown then only the steps beyond today's points are red", async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(11).withTiles(swampRow(11)).build()
    })

    dispatchTileClick(10, 0)
    await flushMicrotasks()

    // 8 swamp steps cost 1400; the 9th no longer fits.
    expectPreviewTargetAt(10, 0)
    expect(getPreviewOverLimitDashAt(8, 0)).toBeFalsy()
    expectPreviewOverLimitDashAt(9, 0)
    expectPreviewOverLimitTargetAt(10, 0)
  })

  test('given hero walks across swamp until the next step no longer fits then hero stops there and the rest of the route stays selected', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(11).withTiles(swampRow(11)).build()
    })

    await confirmMove(user, 10, 0)
    await flushMicrotasks()

    expectHeroAt(8, 0)
    expectPreviewTargetAt(10, 0)
  })

  test("given what is left after a step is less than a straight step from the hero's tile then movement points drop to 0", async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(11).withTiles(swampRow(11)).build()
    })

    await confirmMove(user, 8, 0)
    await flushMicrotasks()

    // 8 swamp steps cost 1400; the 100 left can't pay for a 175 swamp step.
    expectHeroAt(8, 0)
    expectMovementPoints(0)
    expect(getMoveButton().disabled).toBe(true)
  })

  test("given what is left covers a straight step from the hero's tile then those points are kept", async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(16).build()
    })

    await confirmMove(user, 14, 0)
    await flushMicrotasks()

    expectHeroAt(14, 0)
    expectMovementPoints(100)
  })

  test('given hero has 100 left on grass when player confirms a diagonal step then hero takes it and movement points drop to 0', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(16, 2).build()
    })
    await confirmMove(user, 14, 0)
    await flushMicrotasks()
    expectMovementPoints(100)

    await confirmMove(user, 15, 1)
    await flushMicrotasks()

    expectHeroAt(15, 1)
    expectMovementPoints(0)
  })

  test('given hero ran out of points mid-route when player ends the turn then hero has 1500 again and continues the route at terrain costs', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(11).withTiles(swampRow(11)).build()
    })
    await confirmMove(user, 10, 0)
    await flushMicrotasks()
    expectHeroAt(8, 0)

    await clickEndTurn(user)
    await user.click(getMoveButton())
    await flushMicrotasks()

    expectHeroAt(10, 0)
    expectMovementPoints(1150)
  })
})
