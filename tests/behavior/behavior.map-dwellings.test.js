// @vitest-environment jsdom
import { within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'
import {
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectDwellingAt,
  expectHeroAt,
  expectNoPreview,
  getDwellingEntity,
  readPreviewPathTiles
} from './adventure-map.utils.js'
import {
  answerQuestion,
  closeInteractionModal,
  endTurns,
  expectResourceTotal,
  getHeroInfoBox,
  getInteractionModalMessage,
  queryQuestion,
  readArmySlots
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import { aDwelling, aHero, aScenario } from './builders.js'
import {
  cancelRecruiting,
  clickRecruitMax,
  dragRecruitSlider,
  getRecruitButton,
  queryRecruitWindow,
  readAvailable,
  readCostPerTroop,
  readRecruitCreatures,
  recruit
} from './recruit-window.utils.js'

const PLAYER_RED = 'rgb(255, 0, 0)'

const gameDefinitions = {
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  dwellings: readGameData('dwellings.json')
}

// The hero stands right below the dwelling's entrance, so entering it takes one step.
function aDwellingScenario(dwelling = aDwelling().at(2, 1), hero = aHero().at(2, 2)) {
  return aScenario()
    .withSize(5, 3)
    .withEntities(hero, dwelling)
    .withDefinitions(gameDefinitions)
    .withStartingResources({ GOLD_PILE: 10000 })
    .build()
}

async function enterDwellingAt(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

function getDwellingFlag(entityId = 'dwelling-1') {
  return within(getDwellingEntity(entityId)).queryByRole('img', { name: 'Red player flag' })
}

describe('creature dwellings on the map', () => {
  test('shows each of the seven Castle dwellings on the map', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(22, 3)
        .withEntities(
          aHero().at(0, 2),
          aDwelling().withId('dwelling-1').withType('GUARDHOUSE').at(2, 1),
          aDwelling().withId('dwelling-2').withType('ARCHERS_TOWER').at(5, 1),
          aDwelling().withId('dwelling-3').withType('GRIFFIN_TOWER').at(8, 1),
          aDwelling().withId('dwelling-4').withType('BARRACKS').at(11, 1),
          aDwelling().withId('dwelling-5').withType('MONASTERY').at(14, 1),
          aDwelling().withId('dwelling-6').withType('TRAINING_GROUNDS').at(17, 1),
          aDwelling().withId('dwelling-7').withType('PORTAL_OF_GLORY').at(20, 1)
        )
        .withDefinitions(gameDefinitions)
        .build()
    })

    expectDwellingAt(2, 1, 'dwelling-1')
    expectDwellingAt(5, 1, 'dwelling-2')
    expectDwellingAt(8, 1, 'dwelling-3')
    expectDwellingAt(11, 1, 'dwelling-4')
    expectDwellingAt(14, 1, 'dwelling-5')
    expectDwellingAt(17, 1, 'dwelling-6')
    expectDwellingAt(20, 1, 'dwelling-7')
  })

  test("shows the dwelling's name on the map", async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aDwellingScenario(aDwelling().withType('GRIFFIN_TOWER').at(2, 1))
    })

    expect(getDwellingEntity().textContent).toBe('Griffin Tower')
  })

  test("the hero walks onto the dwelling's entrance", async () => {
    await setupMovementBehaviorApp({ loadGameOptions: aDwellingScenario() })

    await enterDwellingAt(2, 1)

    expectHeroAt(2, 1)
  })

  // A dwelling blocks the tile left of its entrance, and the Guardhouse the one above that too;
  // the rest of its picture can be walked on.
  test.each([
    { type: 'GRIFFIN_TOWER', x: 1, y: 1 },
    { type: 'GUARDHOUSE', x: 1, y: 1 },
    { type: 'GUARDHOUSE', x: 1, y: 0 }
  ])('shows no route to the tile the $type blocks at ($x, $y)', async ({ type, x, y }) => {
    await setupMovementBehaviorApp({
      loadGameOptions: aDwellingScenario(aDwelling().withType(type).at(2, 1))
    })

    dispatchTileClick(x, y)

    expectNoPreview()
  })

  test.each([
    { type: 'GRIFFIN_TOWER', x: 1, y: 0 },
    { type: 'GRIFFIN_TOWER', x: 3, y: 1 },
    { type: 'GUARDHOUSE', x: 2, y: 0 }
  ])('the hero walks across the rest of the $type picture to ($x, $y)', async ({ type, x, y }) => {
    await setupMovementBehaviorApp({
      loadGameOptions: aDwellingScenario(aDwelling().withType(type).at(2, 1))
    })

    await enterDwellingAt(x, y)

    expectHeroAt(x, y)
  })

  test('the hero leaves the entrance by the side, not by the row above it', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aDwellingScenario(aDwelling().withType('GRIFFIN_TOWER').at(2, 1))
    })
    await enterDwellingAt(2, 1)
    await cancelRecruiting(user)

    dispatchTileClick(2, 0)

    expect(readPreviewPathTiles()).toContainEqual({ x: 3, y: 1 })
  })

  test('the hero enters the entrance from the side, not from the row above it', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(5, 3)
        .withEntities(aHero().at(2, 0), aDwelling().withType('GRIFFIN_TOWER').at(2, 1))
        .withDefinitions(gameDefinitions)
        .build()
    })

    dispatchTileClick(2, 1)

    expect(readPreviewPathTiles()).toContainEqual({ x: 3, y: 1 })
  })

  describe('flag', () => {
    test('shows a dwelling nobody owns without a flag', async () => {
      await setupMovementBehaviorApp({ loadGameOptions: aDwellingScenario() })

      expect(getDwellingFlag()).toBeNull()
    })

    test("shows the player's flag on a dwelling the scenario gives to the player", async () => {
      await setupMovementBehaviorApp({
        loadGameOptions: aDwellingScenario(aDwelling().ownedByPlayer().at(2, 1))
      })

      expect(getDwellingFlag()).not.toBeNull()
    })

    test("shows the player's flag on a dwelling after the hero enters it", async () => {
      await loadAppStyles()
      await setupMovementBehaviorApp({ loadGameOptions: aDwellingScenario() })

      await enterDwellingAt(2, 1)

      const flag = getDwellingFlag()
      expect(flag).not.toBeNull()
      expect(window.getComputedStyle(flag).backgroundColor).toBe(PLAYER_RED)
    })

    test('keeps one flag when the hero enters a dwelling the player already owns', async () => {
      const { user } = await setupMovementBehaviorApp({ loadGameOptions: aDwellingScenario() })
      await enterDwellingAt(2, 1)
      await answerQuestion(user, 'Guardhouse', 'No')
      await enterDwellingAt(2, 2)

      await enterDwellingAt(2, 1)

      expect(
        within(getDwellingEntity()).getAllByRole('img', { name: 'Red player flag' })
      ).toHaveLength(1)
    })

    test('keeps the dwelling flagged after a reload', async () => {
      const session = { eventLog: createMemoryEventLog(), loadGameOptions: aDwellingScenario() }
      await setupMovementBehaviorApp(session)
      await enterDwellingAt(2, 1)

      await setupMovementBehaviorApp(session)

      expect(getDwellingFlag()).not.toBeNull()
    })
  })

  describe('recruiting at a paid dwelling', () => {
    const anArchersTower = () => aDwelling().withType('ARCHERS_TOWER').at(2, 1)
    const FULL_ARMY = [
      'SKELETON',
      'GRIFFIN',
      'SWORDSMAN',
      'MONK',
      'CAVALIER',
      'ANGEL',
      'PIKEMAN'
    ].map((creature) => ({ creature, count: 1 }))

    async function enterArchersTower(hero) {
      await setupMovementBehaviorApp({ loadGameOptions: aDwellingScenario(anArchersTower(), hero) })
      await enterDwellingAt(2, 1)
    }

    async function recruitAllArchers(user) {
      await clickRecruitMax(user)
      await recruit(user)
    }

    async function reenterDwelling() {
      await enterDwellingAt(2, 2)
      await enterDwellingAt(2, 1)
    }

    test("entering the Archers' Tower opens the window to recruit Archers, without a question", async () => {
      await enterArchersTower()

      expect(queryRecruitWindow('Recruit Archers')).toBeTruthy()
      expect(queryQuestion("Archers' Tower")).toBeNull()
    })

    test('offers the week of 9 Archers at 100 gold each', async () => {
      await enterArchersTower()

      expect(readRecruitCreatures()).toEqual(['Archers'])
      expect(readAvailable()).toBe(9)
      expect(readCostPerTroop()).toEqual(['100 Gold'])
    })

    test("recruiting adds the Archers to the hero's army and spends the gold", async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aDwellingScenario(anArchersTower())
      })
      await enterDwellingAt(2, 1)

      dragRecruitSlider(3)
      await recruit(user)

      expect(queryRecruitWindow()).toBeNull()
      expect(readArmySlots(getHeroInfoBox())).toEqual([
        'Skeletons 10',
        'Archers 3',
        '',
        '',
        '',
        '',
        ''
      ])
      expectResourceTotal('Gold', 9700)
    })

    test('recruits join a stack of Archers the hero already has', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aDwellingScenario(
          anArchersTower(),
          aHero()
            .at(2, 2)
            .withArmy([null, { creature: 'ARCHER', count: 2 }])
        )
      })
      await enterDwellingAt(2, 1)

      await recruitAllArchers(user)

      expect(readArmySlots(getHeroInfoBox())).toEqual(['', 'Archers 11', '', '', '', '', ''])
    })

    test('Cancel closes the window without buying anything', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aDwellingScenario(anArchersTower())
      })
      await enterDwellingAt(2, 1)

      await cancelRecruiting(user)

      expect(queryRecruitWindow()).toBeNull()
      expect(readArmySlots(getHeroInfoBox())).toEqual(['Skeletons 10', '', '', '', '', '', ''])
      expectResourceTotal('Gold', 10000)
    })

    test('entering again in the same week offers what is left', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aDwellingScenario(anArchersTower())
      })
      await enterDwellingAt(2, 1)
      dragRecruitSlider(3)
      await recruit(user)

      await reenterDwelling()

      expect(readAvailable()).toBe(6)
    })

    test('entering after buying them all opens the window with none to recruit', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aDwellingScenario(anArchersTower())
      })
      await enterDwellingAt(2, 1)
      await recruitAllArchers(user)

      await reenterDwelling()

      expect(readAvailable()).toBe(0)
      expect(getRecruitButton().disabled).toBe(true)
    })

    // Unbought creatures don't pile up: a new week brings the count back to the week's growth.
    test('a new week brings back 9 Archers, not the ones left plus 9', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aDwellingScenario(anArchersTower())
      })
      await enterDwellingAt(2, 1)
      dragRecruitSlider(3)
      await recruit(user)

      await enterDwellingAt(2, 2)
      await endTurns(user, 7)
      await enterDwellingAt(2, 1)

      expect(readAvailable()).toBe(9)
    })

    test('with a full army of other creatures, Recruit says there is no room', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aDwellingScenario(anArchersTower(), aHero().at(2, 2).withArmy(FULL_ARMY))
      })
      await enterDwellingAt(2, 1)

      await recruitAllArchers(user)

      expect(getInteractionModalMessage().textContent).toBe(
        "The Archers would join your hero, but there aren't enough provisions to support them."
      )
    })

    test('with a full army of other creatures, Recruit buys nothing', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aDwellingScenario(anArchersTower(), aHero().at(2, 2).withArmy(FULL_ARMY))
      })
      await enterDwellingAt(2, 1)

      await recruitAllArchers(user)
      await closeInteractionModal(user)

      expect(queryRecruitWindow('Recruit Archers')).toBeTruthy()
      expect(readAvailable()).toBe(9)
      expectResourceTotal('Gold', 10000)
    })

    test('the Archers bought stay bought after a reload', async () => {
      const session = {
        eventLog: createMemoryEventLog(),
        loadGameOptions: aDwellingScenario(anArchersTower())
      }
      const { user } = await setupMovementBehaviorApp(session)
      await enterDwellingAt(2, 1)
      dragRecruitSlider(3)
      await recruit(user)

      await setupMovementBehaviorApp(session)
      await reenterDwelling()

      expect(readArmySlots(getHeroInfoBox())).toEqual([
        'Skeletons 10',
        'Archers 3',
        '',
        '',
        '',
        '',
        ''
      ])
      expect(readAvailable()).toBe(6)
    })
  })

  describe('recruiting at the free Guardhouse', () => {
    const FULL_ARMY = [
      'SKELETON',
      'GRIFFIN',
      'SWORDSMAN',
      'MONK',
      'CAVALIER',
      'ANGEL',
      'ARCHER'
    ].map((creature) => ({ creature, count: 1 }))

    async function setupGuardhouse(hero, session = {}) {
      return setupMovementBehaviorApp({
        loadGameOptions: aDwellingScenario(aDwelling().withType('GUARDHOUSE').at(2, 1), hero),
        ...session
      })
    }

    async function takePikemen(user) {
      await enterDwellingAt(2, 1)
      await answerQuestion(user, 'Guardhouse', 'Yes')
    }

    function readMessage() {
      return getInteractionModalMessage()?.textContent
    }

    test('entering the Guardhouse asks whether to recruit the Pikemen', async () => {
      await setupGuardhouse()

      await enterDwellingAt(2, 1)

      expect(queryQuestion('Guardhouse')).toBeTruthy()
      expect(readMessage()).toBe('Would you like to recruit Pikemen?')
      expect(queryRecruitWindow()).toBeNull()
    })

    test("Yes adds the week's 14 Pikemen to the army for free", async () => {
      const { user } = await setupGuardhouse()

      await takePikemen(user)

      expect(readArmySlots(getHeroInfoBox())).toEqual([
        'Skeletons 10',
        'Pikemen 14',
        '',
        '',
        '',
        '',
        ''
      ])
      expectResourceTotal('Gold', 10000)
    })

    test('Yes then says the Pikemen join the army', async () => {
      const { user } = await setupGuardhouse()

      await takePikemen(user)

      expect(readMessage()).toBe('14 Pikemen join your army.')
    })

    test('No closes the question without any Pikemen joining', async () => {
      const { user } = await setupGuardhouse()
      await enterDwellingAt(2, 1)

      await answerQuestion(user, 'Guardhouse', 'No')

      expect(queryQuestion('Guardhouse')).toBeNull()
      expect(readArmySlots(getHeroInfoBox())).toEqual(['Skeletons 10', '', '', '', '', '', ''])
    })

    test('after No, entering again still gives all 14 Pikemen', async () => {
      const { user } = await setupGuardhouse()
      await enterDwellingAt(2, 1)
      await answerQuestion(user, 'Guardhouse', 'No')
      await enterDwellingAt(2, 2)

      await takePikemen(user)

      expect(readMessage()).toBe('14 Pikemen join your army.')
    })

    test('entering again in the same week says there are no Pikemen to recruit', async () => {
      const { user } = await setupGuardhouse()
      await takePikemen(user)
      await closeInteractionModal(user)
      await enterDwellingAt(2, 2)

      await takePikemen(user)

      expect(readMessage()).toBe('There are no Pikemen here to recruit.')
    })

    test('with a full army of other creatures, the Pikemen cannot join', async () => {
      const { user } = await setupGuardhouse(aHero().at(2, 2).withArmy(FULL_ARMY))

      await takePikemen(user)

      expect(readMessage()).toBe(
        "The Pikemen would join your hero, but there aren't enough provisions to support them."
      )
      expect(readArmySlots(getHeroInfoBox())).not.toContain('Pikemen 14')
    })

    test('with a full army that has Pikemen, they join that stack', async () => {
      const { user } = await setupGuardhouse(
        aHero()
          .at(2, 2)
          .withArmy(
            FULL_ARMY.map((stack, index) =>
              index === 6 ? { creature: 'PIKEMAN', count: 2 } : stack
            )
          )
      )

      await takePikemen(user)

      expect(readArmySlots(getHeroInfoBox())[6]).toBe('Pikemen 16')
    })

    test('Pikemen taken stay taken after a reload', async () => {
      const session = { eventLog: createMemoryEventLog() }
      const { user } = await setupGuardhouse(undefined, session)
      await takePikemen(user)
      await closeInteractionModal(user)

      const reloaded = await setupGuardhouse(undefined, session)
      await enterDwellingAt(2, 2)
      await takePikemen(reloaded.user)

      expect(readArmySlots(getHeroInfoBox())).toEqual([
        'Skeletons 10',
        'Pikemen 14',
        '',
        '',
        '',
        '',
        ''
      ])
      expect(readMessage()).toBe('There are no Pikemen here to recruit.')
    })
  })
})
