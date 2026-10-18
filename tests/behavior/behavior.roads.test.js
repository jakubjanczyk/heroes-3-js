// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { loadAppStyles } from './app-styles.js'
import {
  confirmMove,
  dispatchTileClick,
  expectHeroAt,
  expectMovementPoints,
  expectPreviewOverLimitDashAt,
  expectPreviewOverLimitTargetAt,
  flushMicrotasks,
  getPreviewOverLimitDashAt,
  getRoadOn,
  setupMovementBehaviorApp
} from './behavior.utils.js'
import { aHero, aScenario } from './builders.js'
import {
  ALL_ROADS,
  COBBLESTONE_ROAD,
  DIRT_ROAD,
  GRASS,
  GRAVEL_ROAD,
  NO_ROAD,
  SWAMP
} from './terrain-codes.js'

const road = (length, roadCode) => new Array(length).fill(roadCode)

describe('roads behavior', () => {
  test.each([
    ['dirt', DIRT_ROAD, 1425],
    ['gravel', GRAVEL_ROAD, 1435],
    ['cobblestone', COBBLESTONE_ROAD, 1450]
  ])('given hero stands on a %s road when player moves one straight step along it then movement points drop by the road cost', async (_, roadCode, expectedMovementPoints) => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(2).withRoads([roadCode, roadCode]).build()
    })

    await confirmMove(user, 1, 0)

    expectHeroAt(1, 0)
    expectMovementPoints(expectedMovementPoints)
  })

  test.each([
    ['dirt', DIRT_ROAD, 1394],
    ['gravel', GRAVEL_ROAD, 1409],
    ['cobblestone', COBBLESTONE_ROAD, 1430]
  ])('given hero stands on a %s road when player moves one diagonal step along it then movement points drop by the diagonal road cost', async (_, roadCode, expectedMovementPoints) => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(2, 2)
        .withRoads([roadCode, NO_ROAD, NO_ROAD, roadCode])
        .build()
    })

    await confirmMove(user, 1, 1)

    expectHeroAt(1, 1)
    expectMovementPoints(expectedMovementPoints)
  })

  test('given hero stands on a road when player steps off it onto grass then the step costs the grass', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(2).withRoads([COBBLESTONE_ROAD, NO_ROAD]).build()
    })

    await confirmMove(user, 1, 0)

    expectMovementPoints(1400)
  })

  test('given hero stands on grass without a road when player steps onto a road then the step costs the grass', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(2).withRoads([NO_ROAD, COBBLESTONE_ROAD]).build()
    })

    await confirmMove(user, 1, 0)

    expectMovementPoints(1400)
  })

  test('given a cobblestone road leading into a gravel road when player steps from one to the other then the step costs the cobblestone', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(2).withRoads([COBBLESTONE_ROAD, GRAVEL_ROAD]).build()
    })

    await confirmMove(user, 1, 0)

    expectMovementPoints(1450)
  })

  test('given a road across a swamp when player moves along it then the step costs the road, not the swamp', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(2)
        .withTiles([SWAMP, SWAMP])
        .withRoads([DIRT_ROAD, DIRT_ROAD])
        .build()
    })

    await confirmMove(user, 1, 0)

    expectMovementPoints(1425)
  })

  test('given a road that bends around the straight line to the destination when following it is cheaper then the route follows the road', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(5, 2)
        .withRoads(
          [
            [COBBLESTONE_ROAD, NO_ROAD, NO_ROAD, NO_ROAD, COBBLESTONE_ROAD],
            [NO_ROAD, COBBLESTONE_ROAD, COBBLESTONE_ROAD, COBBLESTONE_ROAD, NO_ROAD]
          ].flat()
        )
        .build()
    })

    await confirmMove(user, 4, 0)

    expectHeroAt(4, 0)
    // Along the road: two diagonal and two straight cobblestone steps (70 + 50 + 50 + 70).
    // Straight across the grass it would cost 4 × 100.
    expectMovementPoints(1260)
  })

  test('given hero ends a move on a cobblestone road with 50 points left and more road ahead then it keeps those points', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(31).withRoads(road(31, COBBLESTONE_ROAD)).build()
    })

    await confirmMove(user, 29, 0)

    // 29 cobblestone steps cost 1450; the 50 left still pay a cobblestone step.
    expectHeroAt(29, 0)
    expectMovementPoints(50)
  })

  test("given a road longer than today's points when preview is shown then only the steps beyond today's points are red", async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(33).withRoads(road(33, COBBLESTONE_ROAD)).build()
    })

    dispatchTileClick(32, 0)
    await flushMicrotasks()

    // 30 cobblestone steps cost all 1500; the 31st no longer fits.
    expect(getPreviewOverLimitDashAt(30, 0)).toBeFalsy()
    expectPreviewOverLimitDashAt(31, 0)
    expectPreviewOverLimitTargetAt(32, 0)
  })

  test('given every road type in the scenario when the map renders then each road is drawn on its tile in its own colour', async () => {
    await loadAppStyles()
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(ALL_ROADS.length)
        .withRoads(ALL_ROADS)
        .withEntities(aHero().at(0, 0))
        .build()
    })

    const colours = ALL_ROADS.map(
      (_, x) => window.getComputedStyle(getRoadOn(x, 0)).backgroundColor
    )

    expect(colours).not.toContain('rgba(0, 0, 0, 0)')
    expect(colours).not.toContain('')
    expect(new Set(colours).size).toBe(ALL_ROADS.length)
  })

  test('given a tile without a road when the map renders then no road is drawn on it', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(2)
        .withTiles([GRASS, GRASS])
        .withRoads([DIRT_ROAD, NO_ROAD])
        .build()
    })

    expect(getRoadOn(0, 0)).toBeTruthy()
    expect(getRoadOn(1, 0)).toBeNull()
  })
})
