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
  getHeroEntity,
  readPreviewPathTiles
} from './adventure-map.utils.js'
import {
  answerQuestion,
  closeInteractionModal,
  endTurns,
  expectResourceTotal,
  getHeroInfoBox,
  getInteractionModalMessage,
  getTownInTownList,
  queryQuestion,
  readArmySlots
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import {
  clickBattleHex,
  closeBattleResults,
  LOWEST_ROLLS,
  queryBattleScreen,
  readBattleStacks,
  retreat,
  winBattle
} from './battle.utils.js'
import { ARMY_THAT_WINS, aDwelling, aHero, aScenario, aTown } from './builders.js'
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
import {
  enterTownAt,
  openFortWindow,
  openRecruitWindow,
  readCreatureGrowth,
  readFortCard
} from './town-screen.utils.js'

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

  // A dwelling blocks the tile left of its entrance, the Archers' Tower the one right of it, and the
  // Guardhouse the one above the left tile too; the rest of its picture can be walked on.
  test.each([
    { type: 'GRIFFIN_TOWER', x: 1, y: 1 },
    { type: 'ARCHERS_TOWER', x: 3, y: 1 },
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
    { type: 'ARCHERS_TOWER', x: 1, y: 1 },
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

  describe('guards', () => {
    const MONASTERY_GUARDED =
      'Much to your dismay, the Monastery is guarded by several Monks. Do you wish to fight the guards?'
    const battleConfig = { random: LOWEST_ROLLS, fadeOutMsByKind: { MONSTER: 0 } }

    async function setupMonastery({
      hero = aHero().at(2, 2),
      dwelling = aDwelling().withType('MONASTERY').at(2, 1),
      otherHeroes = [],
      eventLog
    } = {}) {
      return setupMovementBehaviorApp({
        loadGameOptions: aScenario()
          .withSize(5, 3)
          .withEntities(hero, ...otherHeroes, dwelling)
          .withDefinitions(gameDefinitions)
          .withStartingResources({ GOLD_PILE: 10000 })
          .build(),
        appConfig: battleConfig,
        eventLog
      })
    }

    async function fightGuards(user) {
      await enterDwellingAt(2, 1)
      await answerQuestion(user, MONASTERY_GUARDED, 'Yes')
      await flushMicrotasks()
    }

    async function beatGuards(user) {
      await fightGuards(user)
      await winBattle(user)
      await flushMicrotasks()
    }

    // The Marksmen, faster than the Monks, shoot first: 20 of them at their lowest damage of 2 do
    // 40, 39 against the Monks' better Defense, and half of it from across the battlefield, 19.
    // They shoot twice, 38 in all: one Monk (30 health) dies. The hero retreats on their next turn.
    const SURVIVING_MONKS = 'Monks 8'

    async function killSomeGuardsAndRetreat(user) {
      await fightGuards(user)
      await clickBattleHex(user, 6, 15)
      await waitMs()
      await retreat(user)
      await closeBattleResults(user)
      await flushMicrotasks()
    }

    const aHeroWithMarksmen = () =>
      aHero()
        .at(2, 2)
        .withArmy([{ creature: 'MARKSMAN', count: 20 }])

    function readGuardStack() {
      return readBattleStacks().find(({ column }) => column === 15)?.stack
    }

    test.each([
      { type: 'MONASTERY', guards: 'the Monastery is guarded by several Monks' },
      { type: 'TRAINING_GROUNDS', guards: 'the Training Grounds is guarded by several Cavaliers' },
      { type: 'PORTAL_OF_GLORY', guards: 'the Portal of Glory is guarded by a few Angels' }
    ])('entering the $type asks whether to fight its guards', async ({ type, guards }) => {
      await setupMonastery({ dwelling: aDwelling().withType(type).at(2, 1) })

      await enterDwellingAt(2, 1)

      const question = `Much to your dismay, ${guards}. Do you wish to fight the guards?`
      expect(queryQuestion(question)).toBeTruthy()
    })

    test('No closes the question without a battle, a flag or the recruit window', async () => {
      const { user } = await setupMonastery()
      await enterDwellingAt(2, 1)

      await answerQuestion(user, MONASTERY_GUARDED, 'No')
      await flushMicrotasks()

      expect(queryQuestion(MONASTERY_GUARDED)).toBeNull()
      expect(queryBattleScreen()).toBeNull()
      expect(getDwellingFlag()).toBeNull()
      expect(queryRecruitWindow()).toBeNull()
    })

    test('Yes starts a battle against the 9 Monks', async () => {
      const { user } = await setupMonastery({ hero: aHeroWithMarksmen() })

      await fightGuards(user)

      expect(readBattleStacks().map(({ stack }) => stack)).toEqual(['Marksmen 20', 'Monks 9'])
    })

    test('closing the results of a win flags the dwelling', async () => {
      const { user } = await setupMonastery({ hero: aHero().at(2, 2).withArmy(ARMY_THAT_WINS) })

      await beatGuards(user)

      expect(getDwellingFlag()).not.toBeNull()
    })

    test('closing the results of a win opens the window to recruit the 3 Monks', async () => {
      const { user } = await setupMonastery({ hero: aHero().at(2, 2).withArmy(ARMY_THAT_WINS) })

      await beatGuards(user)

      expect(queryRecruitWindow('Recruit Monks')).toBeTruthy()
      expect(readAvailable()).toBe(3)
    })

    test('after winning, entering again the same week opens the recruit window without a question', async () => {
      const { user } = await setupMonastery({ hero: aHero().at(2, 2).withArmy(ARMY_THAT_WINS) })
      await beatGuards(user)
      await cancelRecruiting(user)

      await enterDwellingAt(2, 2)
      await enterDwellingAt(2, 1)

      expect(queryQuestion(MONASTERY_GUARDED)).toBeNull()
      expect(queryRecruitWindow('Recruit Monks')).toBeTruthy()
    })

    test('after winning, the guards do not come back for the owner the next week', async () => {
      const { user } = await setupMonastery({ hero: aHero().at(2, 2).withArmy(ARMY_THAT_WINS) })
      await beatGuards(user)
      await cancelRecruiting(user)
      await enterDwellingAt(2, 2)

      await endTurns(user, 7)
      await enterDwellingAt(2, 1)

      expect(queryQuestion(MONASTERY_GUARDED)).toBeNull()
      expect(queryRecruitWindow('Recruit Monks')).toBeTruthy()
    })

    test('retreating takes the hero off the map and leaves the dwelling unflagged', async () => {
      const { user } = await setupMonastery({ hero: aHeroWithMarksmen() })

      await killSomeGuardsAndRetreat(user)

      expect(getHeroEntity()).toBeNull()
      expect(getDwellingFlag()).toBeNull()
    })

    test('another hero entering later that week fights the Monks that survived', async () => {
      const { user } = await setupMonastery({
        hero: aHeroWithMarksmen(),
        otherHeroes: [aHero().withId('hero-2').at(3, 2)]
      })
      await killSomeGuardsAndRetreat(user)

      await fightGuards(user)

      expect(readGuardStack()).toBe(SURVIVING_MONKS)
    })

    test('a new week brings back all 9 Monks after a retreat left fewer', async () => {
      const { user } = await setupMonastery({
        hero: aHeroWithMarksmen(),
        otherHeroes: [aHero().withId('hero-2').at(3, 2)]
      })
      await killSomeGuardsAndRetreat(user)

      await endTurns(user, 7)
      await fightGuards(user)

      expect(readGuardStack()).toBe('Monks 9')
    })

    test('the Monks that survived are still there after a reload', async () => {
      const session = {
        hero: aHeroWithMarksmen(),
        otherHeroes: [aHero().withId('hero-2').at(3, 2)],
        eventLog: createMemoryEventLog()
      }
      const { user } = await setupMonastery(session)
      await killSomeGuardsAndRetreat(user)

      const reloaded = await setupMonastery(session)
      await fightGuards(reloaded.user)

      expect(readGuardStack()).toBe(SURVIVING_MONKS)
    })

    test('a Monastery the scenario gives to the player has no guards for them', async () => {
      await setupMonastery({ dwelling: aDwelling().withType('MONASTERY').ownedByPlayer().at(2, 1) })

      await enterDwellingAt(2, 1)

      expect(queryQuestion(MONASTERY_GUARDED)).toBeNull()
      expect(queryRecruitWindow('Recruit Monks')).toBeTruthy()
    })
  })

  describe('town growth', () => {
    const TOWN_GROWTH_DEFINITIONS = {
      ...gameDefinitions,
      towns: readGameData('towns.json'),
      buildings: readGameData('buildings.json')
    }
    const aWhitemoon = (buildings = ['FORT', 'GUARDHOUSE']) =>
      aTown().named('Whitemoon').ownedByPlayer().withBuildings(buildings)
    const aGuardhouseOfThePlayer = () => aDwelling().ownedByPlayer().at(8, 5)

    // Whitemoon's entrance is at (4, 3) and the hero stands two tiles below it; the dwelling's
    // entrance is at (8, 5), four steps to the right of the hero.
    const aTownGrowthScenario = ({
      town = aWhitemoon(),
      dwellings = [aDwelling().at(8, 5)]
    } = {}) =>
      aScenario()
        .withSize(10, 7)
        .withEntities(aHero().at(4, 5), town.at(4, 3), ...dwellings)
        .withDefinitions(TOWN_GROWTH_DEFINITIONS)
        .withStartingResources({ GOLD_PILE: 10000 })
        .build()

    async function setupTownGrowthApp(scenario = aTownGrowthScenario(), options = {}) {
      return setupMovementBehaviorApp({
        loadGameOptions: scenario,
        appConfig: { interactionModalTransitionMs: 0 },
        ...options
      })
    }

    async function flagGuardhouse(user) {
      await enterDwellingAt(8, 5)
      await answerQuestion(user, 'Guardhouse', 'No')
    }

    async function openWhitemoon(user) {
      await user.dblClick(getTownInTownList('Whitemoon'))
    }

    test("flagging a Guardhouse adds one to the Pikemen's growth in the player's town", async () => {
      const { user } = await setupTownGrowthApp()

      await flagGuardhouse(user)

      await openWhitemoon(user)
      expect(readCreatureGrowth()[0]).toBe('Pikemen +15')
    })

    test("a dwelling the player owns at the start adds to the town's growth from day one", async () => {
      const { user } = await setupTownGrowthApp(
        aTownGrowthScenario({ dwellings: [aGuardhouseOfThePlayer()] })
      )

      await openWhitemoon(user)

      expect(readCreatureGrowth()[0]).toBe('Pikemen +15')
    })

    test("a town's Guardhouse standing at the start has the flag's Pikeman too", async () => {
      const { user } = await setupTownGrowthApp(
        aTownGrowthScenario({ dwellings: [aGuardhouseOfThePlayer()] })
      )

      await openWhitemoon(user)

      await openRecruitWindow(user, 'Pikemen')
      expect(readAvailable()).toBe(15)
    })

    test('two flagged Guardhouses add two', async () => {
      const { user } = await setupTownGrowthApp(
        aTownGrowthScenario({
          dwellings: [
            aGuardhouseOfThePlayer(),
            aDwelling().withId('dwelling-2').ownedByPlayer().at(8, 2)
          ]
        })
      )

      await openWhitemoon(user)

      expect(readCreatureGrowth()[0]).toBe('Pikemen +16')
    })

    test("the flag adds to the upgraded dwelling's creature", async () => {
      const { user } = await setupTownGrowthApp(
        aTownGrowthScenario({
          town: aWhitemoon(['FORT', 'GUARDHOUSE', 'UPG_GUARDHOUSE']),
          dwellings: [aGuardhouseOfThePlayer()]
        })
      )

      await openWhitemoon(user)

      expect(readCreatureGrowth()[0]).toBe('Halberdiers +15')
    })

    // 14 doubled by the Castle, then the flag's one.
    test("the Castle's bonus doubles only the dwelling's own growth, not the flag's", async () => {
      const { user } = await setupTownGrowthApp(
        aTownGrowthScenario({
          town: aWhitemoon(['FORT', 'CITADEL', 'CASTLE', 'GUARDHOUSE']),
          dwellings: [aGuardhouseOfThePlayer()]
        })
      )

      await openWhitemoon(user)

      expect(readCreatureGrowth()[0]).toBe('Pikemen +29')
    })

    test("a flagged Archers' Tower adds to the Archers, not the Pikemen", async () => {
      const { user } = await setupTownGrowthApp(
        aTownGrowthScenario({
          town: aWhitemoon(['FORT', 'GUARDHOUSE', 'ARCHERS_TOWER']),
          dwellings: [aDwelling().withType('ARCHERS_TOWER').ownedByPlayer().at(8, 5)]
        })
      )

      await openWhitemoon(user)

      expect(readCreatureGrowth().slice(0, 2)).toEqual(['Pikemen +14', 'Archers +10'])
    })

    test("the Fort window's card shows the growth with the flag", async () => {
      const { user } = await setupTownGrowthApp(
        aTownGrowthScenario({ dwellings: [aGuardhouseOfThePlayer()] })
      )
      await openWhitemoon(user)

      await openFortWindow(user, 'Fort')

      expect(readFortCard('Pikemen').stats.Growth).toBe('15')
    })

    test("the Fort window's card for an unbuilt dwelling includes the flag", async () => {
      const { user } = await setupTownGrowthApp(
        aTownGrowthScenario({
          dwellings: [aDwelling().withType('ARCHERS_TOWER').ownedByPlayer().at(8, 5)]
        })
      )
      await openWhitemoon(user)

      await openFortWindow(user, 'Fort')

      expect(readFortCard('Archers').stats.Growth).toBe('10')
    })

    // The 14 the town started with, then a week with the flag.
    test('a new week adds the growth with the flag to the creatures available', async () => {
      const { user } = await setupTownGrowthApp()
      await flagGuardhouse(user)

      await endTurns(user, 7)

      await openWhitemoon(user)
      await openRecruitWindow(user, 'Pikemen')
      expect(readAvailable()).toBe(29)
    })

    test('flagging a dwelling mid-week adds no creatures until the next week', async () => {
      const { user } = await setupTownGrowthApp()

      await flagGuardhouse(user)

      await openWhitemoon(user)
      await openRecruitWindow(user, 'Pikemen')
      expect(readAvailable()).toBe(14)
    })

    // Two weeks of 14, the player's flag counting for neither.
    test("a neutral town's creatures grow without the player's flags until it is captured", async () => {
      const { user } = await setupTownGrowthApp(
        aTownGrowthScenario({
          town: aTown().named('Whitemoon').withBuildings(['FORT', 'GUARDHOUSE']),
          dwellings: [aGuardhouseOfThePlayer()]
        })
      )
      await endTurns(user, 7)

      await enterTownAt(4, 3)

      await openRecruitWindow(user, 'Pikemen')
      expect(readAvailable()).toBe(28)
    })

    test("after a reload, the town's growth still includes the flag", async () => {
      const session = { eventLog: createMemoryEventLog() }
      const { user } = await setupTownGrowthApp(aTownGrowthScenario(), session)
      await flagGuardhouse(user)

      const reloaded = await setupTownGrowthApp(aTownGrowthScenario(), session)

      await openWhitemoon(reloaded.user)
      expect(readCreatureGrowth()[0]).toBe('Pikemen +15')
    })
  })
})
