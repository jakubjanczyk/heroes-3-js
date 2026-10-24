// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  confirmTileClickByDispatch,
  getTreasureChestEntity,
  holdRightButtonOn,
  hoverTile
} from './adventure-map.utils.js'
import {
  expectResourceTotal,
  expectStatusBarText,
  getTreasureChestDialog,
  readTreasureChestChoices,
  takeFromTreasureChest
} from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aTreasureChest } from './builders.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  resources: readGameData('resources.json')
}

async function setupApp(scenario, { eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.withDefinitions(gameDefinitions).build(),
    eventLog
  })
}

// The hero starts next to the chest, with no gold.
function aChestScenario(chest = aTreasureChest()) {
  return aScenario().withSize(3).withEntities(aHero(), chest.at(1, 0))
}

async function reachChest() {
  confirmTileClickByDispatch(1, 0)
}

function getChestOkButton() {
  return within(getTreasureChestDialog()).getByRole('button', { name: 'OK' })
}

describe('treasure chest behavior', () => {
  describe('map', () => {
    test('given a treasure chest in the scenario when the game loads then the chest is shown on its tile', async () => {
      await setupApp(aScenario().withSize(4).withEntities(aHero(), aTreasureChest().at(2, 0)))

      const chest = getTreasureChestEntity()
      expect({ x: chest?.dataset.tileX, y: chest?.dataset.tileY }).toEqual({ x: '2', y: '0' })
    })

    test('given a treasure chest when the mouse is over it then the status bar shows "Treasure Chest"', async () => {
      const { user } = await setupApp(aChestScenario())

      await hoverTile(user, 1, 0)

      expectStatusBarText('Treasure Chest')
    })

    test('given a treasure chest when the player holds the right button on it then the popup shows "Treasure Chest"', async () => {
      const { user } = await setupApp(aChestScenario())

      await holdRightButtonOn(user, 1, 0)

      expect(screen.getByRole('tooltip').textContent).toBe('Treasure Chest')
    })
  })

  describe('picking up', () => {
    test.each([
      { tier: 1, choices: ['1000 gold', '500 experience'] },
      { tier: 2, choices: ['1500 gold', '1000 experience'] },
      { tier: 3, choices: ['2000 gold', '1500 experience'] }
    ])('given a tier $tier chest when the hero reaches it then the dialog offers $choices', async ({
      tier,
      choices
    }) => {
      await setupApp(aChestScenario(aTreasureChest().withTier(tier)))

      await reachChest()

      expect(readTreasureChestChoices()).toEqual(choices)
    })

    test('given the chest dialog is open when nothing is chosen yet then OK is disabled until gold or experience is picked', async () => {
      const { user } = await setupApp(aChestScenario())
      await reachChest()
      expect(getChestOkButton().disabled).toBe(true)

      await user.click(within(getTreasureChestDialog()).getByRole('button', { name: '1500 gold' }))

      expect(getChestOkButton().disabled).toBe(false)
    })

    test('given a tier 2 chest when the player takes the gold then the resource bar shows 1500 more gold', async () => {
      const { user } = await setupApp(aChestScenario())

      await takeFromTreasureChest(user, { x: 1, y: 0 }, 'gold')

      expectResourceTotal('Gold', 1500)
    })

    test('given the chest dialog is open when the player confirms a choice then the chest is gone from the map', async () => {
      const { user } = await setupApp(aChestScenario())

      await takeFromTreasureChest(user, { x: 1, y: 0 }, 'gold')

      expect(getTreasureChestEntity()).toBeNull()
    })

    test('given a tier 2 chest when the player takes the experience then the gold stays the same', async () => {
      const { user } = await setupApp(aChestScenario())

      await takeFromTreasureChest(user, { x: 1, y: 0 }, 'experience')

      expectResourceTotal('Gold', 0)
    })
  })

  describe('reload', () => {
    test('given the player took the gold from a chest when the page reloads then the chest is gone and the gold is kept', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(aChestScenario(), { eventLog })
      await takeFromTreasureChest(user, { x: 1, y: 0 }, 'gold')

      await setupApp(aChestScenario(), { eventLog })

      expect(getTreasureChestEntity()).toBeNull()
      expectResourceTotal('Gold', 1500)
    })
  })
})
