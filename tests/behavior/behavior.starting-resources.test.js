// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  confirmTileClickByDispatch,
  createMemoryEventLog,
  endTurns,
  flushMicrotasks,
  getResourceBarItems,
  readGameData,
  setupMovementBehaviorApp
} from './behavior.utils.js'
import { aHero, aMine, aResource, aScenario } from './builders.js'

const gameDefinitions = {
  mines: readGameData('mines.json'),
  resources: readGameData('resources.json')
}

// The hero stands right below the tiles it enters, so each visit takes one step.
function aStartingResourcesScenario() {
  return aScenario()
    .withSize(8, 3)
    .withEntities(aHero().at(2, 2), aMine().at(2, 1), aResource().at(1, 2))
    .withDefinitions(gameDefinitions)
}

async function enterTileAt(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

const noFadeOut = { fadeOutMsByKind: { RESOURCE: 0 } }

describe('starting resources', () => {
  test("shows the scenario's starting resources in the resource bar when the game starts", async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aStartingResourcesScenario()
        .withStartingResources({
          WOOD_PILE: 5,
          MERCURY_PILE: 1,
          ORE_PILE: 6,
          SULFUR_PILE: 2,
          CRYSTAL_PILE: 3,
          GEMS_PILE: 4,
          GOLD_PILE: 7500
        })
        .build()
    })

    expect(getResourceBarItems()).toEqual([
      'Wood 5',
      'Mercury 1',
      'Ore 6',
      'Sulfur 2',
      'Crystal 3',
      'Gems 4',
      'Gold 7500'
    ])
  })

  test("starts a resource at 0 when the scenario's starting resources leave it out", async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aStartingResourcesScenario()
        .withStartingResources({ GOLD_PILE: 7500 })
        .build()
    })

    expect(getResourceBarItems()).toEqual([
      'Wood 0',
      'Mercury 0',
      'Ore 0',
      'Sulfur 0',
      'Crystal 0',
      'Gems 0',
      'Gold 7500'
    ])
  })

  test('shows Heroes 3 Normal starting resources when the scenario sets none', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aStartingResourcesScenario().withoutStartingResources().build()
    })

    expect(getResourceBarItems()).toEqual([
      'Wood 20',
      'Mercury 10',
      'Ore 20',
      'Sulfur 10',
      'Crystal 10',
      'Gems 10',
      'Gold 20000'
    ])
  })

  test('adds a picked-up resource on top of the starting amount', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aStartingResourcesScenario()
        .withStartingResources({ GOLD_PILE: 7500 })
        .build(),
      appConfig: noFadeOut
    })

    await enterTileAt(1, 2)

    expect(getResourceBarItems()).toContain('Gold 7600')
  })

  test('adds mine income on top of the starting amount', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aStartingResourcesScenario()
        .withStartingResources({ GOLD_PILE: 7500 })
        .build()
    })
    await enterTileAt(2, 1)

    await endTurns(user, 1)

    expect(getResourceBarItems()).toContain('Gold 8500')
  })

  test('keeps the starting resources plus what was collected after a reload', async () => {
    const session = {
      eventLog: createMemoryEventLog(),
      loadGameOptions: aStartingResourcesScenario()
        .withStartingResources({ GOLD_PILE: 7500 })
        .build(),
      appConfig: noFadeOut
    }
    const { user } = await setupMovementBehaviorApp(session)
    await enterTileAt(1, 2)
    await enterTileAt(2, 1)
    await endTurns(user, 1)

    await setupMovementBehaviorApp(session)
    await flushMicrotasks()

    expect(getResourceBarItems()).toContain('Gold 8600')
  })
})
