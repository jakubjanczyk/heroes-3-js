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
  closeInteractionModal,
  expectResourceTotal,
  expectStatusBarText,
  getTreasureChestDialog,
  readMessage,
  readSelectedHeroInHeroList,
  readTreasureChestChoices,
  takeFromTreasureChest
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, anArtifactDefinition, aScenario, aTreasureChest } from './builders.js'
import {
  clickHeroInHeroList,
  closeHeroScreen,
  readHeroScreenArtifacts,
  readHeroScreenBackpack
} from './hero-screen.utils.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  resources: readGameData('resources.json'),
  artifacts: {
    AXE: anArtifactDefinition().withName("Centaur's Axe").withSlot('WEAPON').build(),
    GLADIUS: anArtifactDefinition()
      .withName("Titan's Gladius")
      .withSlot('WEAPON')
      .withClass('RELIC')
      .build()
  }
}

// Each roll the game makes, such as what a chest holds, comes out as `roll`.
async function setupApp(scenario, { eventLog, roll = 0 } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.withDefinitions(gameDefinitions).build(),
    appConfig: { random: () => roll },
    eventLog
  })
}

// The hero starts next to the chest, with no gold.
function aChestScenario(chest = aTreasureChest(), hero = aHero()) {
  return aScenario().withSize(3).withEntities(hero, chest.at(1, 0))
}

async function reachChest() {
  confirmTileClickByDispatch(1, 0)
  await flushMicrotasks()
}

async function readHeroArtifacts(user) {
  if (!readSelectedHeroInHeroList().includes('Hero')) {
    await clickHeroInHeroList(user, 'Hero')
  }
  await clickHeroInHeroList(user, 'Hero')
  const seen = { worn: readHeroScreenArtifacts(), backpack: readHeroScreenBackpack() }
  await closeHeroScreen(user)
  return seen
}

const anArtifactChest = () => aTreasureChest().withTier('artifact')

// One axe worn and 64 in the backpack.
const aHeroWithAFullBackpack = () => aHero().withArtifacts(new Array(65).fill('AXE'))

const ARTIFACT_CHEST_MESSAGE =
  "After scouring the area, you fall upon a hidden chest, containing the ancient artifact 'Centaur's Axe'."

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

  describe('artifact chest', () => {
    test('given an artifact chest when the hero reaches it then the Chest message names the artifact, with no gold or experience to choose', async () => {
      await setupApp(aChestScenario(anArtifactChest()))

      await reachChest()

      expect(getTreasureChestDialog()).toBeTruthy()
      expect(readMessage()).toBe(ARTIFACT_CHEST_MESSAGE)
      expect(
        within(getTreasureChestDialog()).queryAllByRole('button', { name: /gold$|experience$/ })
      ).toEqual([])
    })

    test('given an artifact chest when the hero has opened it then they wear the artifact and the chest is gone', async () => {
      const { user } = await setupApp(aChestScenario(anArtifactChest()))
      await reachChest()

      await closeInteractionModal(user)

      expect(getTreasureChestEntity()).toBeNull()
      expect(await readHeroArtifacts(user)).toEqual({
        worn: { Weapon: "Centaur's Axe" },
        backpack: []
      })
    })

    test('given an artifact chest when the hero already wears a weapon then the artifact goes to the backpack', async () => {
      const { user } = await setupApp(
        aChestScenario(anArtifactChest(), aHero().withArtifacts(['GLADIUS']))
      )
      await reachChest()

      await closeInteractionModal(user)

      expect((await readHeroArtifacts(user)).backpack).toEqual(["Centaur's Axe"])
    })

    // The rolls pick the last artifact they can; Titan's Gladius comes after the axe but is a Relic.
    test('given an artifact chest then its artifact is one of the Treasure class', async () => {
      await setupApp(aChestScenario(anArtifactChest()), { roll: 0.99 })

      await reachChest()

      expect(readMessage()).toBe(ARTIFACT_CHEST_MESSAGE)
    })

    test('given the hero opened an artifact chest when the page reloads then they still wear the artifact and the chest is gone', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(aChestScenario(anArtifactChest()), { eventLog })
      await reachChest()
      await closeInteractionModal(user)

      const reloaded = await setupApp(aChestScenario(anArtifactChest()), { eventLog })

      expect(getTreasureChestEntity()).toBeNull()
      expect((await readHeroArtifacts(reloaded.user)).worn).toEqual({ Weapon: "Centaur's Axe" })
    })

    // A roll of 0.99 picks the third of the three gold or experience choices.
    test('given an artifact chest and a hero with a full backpack when they reach it then the dialog offers gold or experience', async () => {
      await setupApp(aChestScenario(anArtifactChest(), aHeroWithAFullBackpack()), { roll: 0.99 })

      await reachChest()

      expect(readTreasureChestChoices()).toEqual(['2000 gold', '1500 experience'])
    })
  })

  describe('random chests', () => {
    // A roll under 0.32 is the first tier, under 0.64 the second and under 0.95 the third.
    test.each([
      { roll: 0.1, choices: ['1000 gold', '500 experience'] },
      { roll: 0.5, choices: ['1500 gold', '1000 experience'] },
      { roll: 0.9, choices: ['2000 gold', '1500 experience'] }
    ])('given a chest with no tier when the roll is $roll then the dialog offers $choices', async ({
      roll,
      choices
    }) => {
      await setupApp(aChestScenario(aTreasureChest().withRandomContents()), { roll })

      await reachChest()

      expect(readTreasureChestChoices()).toEqual(choices)
    })

    test('given a chest with no tier when the roll is 0.95 or more then it holds an artifact', async () => {
      await setupApp(aChestScenario(aTreasureChest().withRandomContents()), { roll: 0.97 })

      await reachChest()

      expect(readMessage()).toBe(ARTIFACT_CHEST_MESSAGE)
    })

    test('given a chest with no tier when the page reloads before it is opened then it offers the same', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = () => aChestScenario(aTreasureChest().withRandomContents())
      await setupApp(scenario(), { eventLog, roll: 0.5 })

      await setupApp(scenario(), { eventLog, roll: 0 })
      await reachChest()

      expect(readTreasureChestChoices()).toEqual(['1500 gold', '1000 experience'])
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
