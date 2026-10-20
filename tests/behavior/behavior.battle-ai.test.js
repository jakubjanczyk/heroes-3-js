// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  attackBattleHexFrom,
  attackMonsterAt,
  clickBattleHex,
  createMemoryEventLog,
  expectMonsterPresent,
  expectStatusBarText,
  flushMicrotasks,
  getHeroEntity,
  hoverTile,
  moveActiveStackTo,
  queryBattleScreen,
  readActiveStack,
  readBattleStacks,
  readCombatMessages,
  readGameData,
  recordStackHexes,
  setupMovementBehaviorApp,
  waitForBattleToEnd,
  waitMs
} from './behavior.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

const monsters = readGameData('monsters.json')

const stack = (creature, count) => ({ creature, count })

const stackAt = (name, row, column) => ({ stack: name, row, column })

// Every damage roll lands on the lowest damage.
const LOWEST_ROLLS = () => 0

// The monster stays one stack unless a test says otherwise. It stands on map tile (1, 0).
const aFight = ({ army, monsterType = 'SWORDSMAN', monsterCount = 10, monsterStacks = 1 }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aHero().withArmy(army),
      aMonster().withType(monsterType).withCount(monsterCount).withStacks(monsterStacks).at(1, 0)
    )
    .withDefinitions({ monsters })

async function startBattle(scenario, { eventLog, appConfig = {} } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    eventLog,
    appConfig: { random: LOWEST_ROLLS, fadeOutMsByKind: { MONSTER: 0 }, ...appConfig }
  })
  await attackMonsterAt(1, 0)
  return app
}

async function reload(scenario, eventLog) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    eventLog,
    appConfig: { random: LOWEST_ROLLS }
  })
  await flushMicrotasks()
  return app
}

// Swordsmen (speed 5) start on row 6, column 15; the Angel (speed 12) goes first and stops 5
// hexes from them.
const anAngelAgainstSwordsmen = () => aFight({ army: [stack('ANGEL', 1)] })

async function flyAngelWithinSwordsmenReach(user) {
  await moveActiveStackTo(user, 6, 9)
}

// One Angel hits 51 Swordsmen for 70 (2 die), and the 49 left strike back for 220: it dies.
const anAngelLosingToSwordsmen = () => aFight({ army: [stack('ANGEL', 1)], monsterCount: 51 })

async function loseTheAngelToSwordsmen(user) {
  await moveActiveStackTo(user, 6, 5)
  // The Swordsmen walked to row 6, column 10.
  await attackBattleHexFrom(user, 6, 10, 'left')
  await waitForBattleToEnd()
}

describe('battle combat AI behavior', () => {
  describe("the monster's turn", () => {
    test('given a hero stack within the monster reach when its turn comes then it moves next to the stack and attacks it', async () => {
      const { user } = await startBattle(anAngelAgainstSwordsmen())

      await flyAngelWithinSwordsmenReach(user)

      expect(readBattleStacks()).toContainEqual(stackAt('Swordsmen 8', 6, 10))
    })

    test('given the monster attacks then the hero stack takes damage and strikes back', async () => {
      const { user } = await startBattle(anAngelAgainstSwordsmen())

      await flyAngelWithinSwordsmenReach(user)

      // 10 Swordsmen deal 60, -25% for 10 Attack against 20 Defense; the Angel deals 50, +40%.
      expect(readCombatMessages()).toEqual([
        'The Swordsmen do 45 damage.',
        'The Angel does 70 damage. 2 Swordsmen perish.'
      ])
    })

    test('given no hero stack is within reach then the monster moves as far as it can toward the nearest one', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ANGEL', 1)], monsterType: 'PIKEMAN' })
      )

      await moveActiveStackTo(user, 6, 2)

      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 10', 6, 11))
    })

    test('given two hero stacks then the monster goes for the one it reaches in fewer steps', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('SKELETON', 10), stack('ANGEL', 1)] })
      )

      await moveActiveStackTo(user, 9, 10)

      expect(readBattleStacks()).toEqual(
        expect.arrayContaining([stackAt('Swordsmen 8', 9, 11), stackAt('Skeletons 10', 3, 1)])
      )
    })

    test('given two hero stacks equally near then the monster goes for the one in the earlier army slot', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ANGEL', 1), stack('ANGEL', 1)], monsterType: 'PIKEMAN' })
      )
      await moveActiveStackTo(user, 4, 12)

      await moveActiveStackTo(user, 8, 12)

      // The Angel strikes back and kills 8 of the 10.
      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 2', 4, 13))
    })

    test('given a flying monster then it flies straight to the hero stack instead of walking hex by hex', async () => {
      // The Angel is faster: it opens the battle by flying 12 hexes, to row 6, column 3.
      const { user } = await startBattle(
        aFight({ army: [stack('SKELETON', 100)], monsterType: 'ANGEL', monsterCount: 1 })
      )
      const stopRecording = recordStackHexes('Angel')

      await moveActiveStackTo(user, 2, 1)

      expect(stopRecording()).toEqual([
        { row: 6, column: 3 },
        { row: 3, column: 1 }
      ])
    })

    test('given the monster is fastest when the battle opens then it acts before the hero stacks', async () => {
      await startBattle(aFight({ army: [stack('SKELETON', 10)] }))

      expect(readBattleStacks()).toContainEqual(stackAt('Swordsmen 10', 6, 10))
      expect(readActiveStack()).toEqual(stackAt('Skeletons 10', 6, 1))
    })

    test('given the monster has several stacks then each one takes its turn', async () => {
      const { user } = await startBattle(
        aFight({
          army: [stack('ANGEL', 1)],
          monsterType: 'PIKEMAN',
          monsterCount: 20,
          monsterStacks: 2
        })
      )

      await moveActiveStackTo(user, 6, 2)

      // Both stacks start in column 15 and walk 4 hexes along their rows toward the Angel.
      expect(readBattleStacks()).toEqual(
        expect.arrayContaining([stackAt('Pikemen 10', 3, 11), stackAt('Pikemen 10', 9, 11)])
      )
    })

    // The Swordsman (speed 5) walks to column 6, 9 hexes from the Archers: 10 Archers do 20, -15%
    // for 6 Attack against 12 Defense.
    test('given the monster is a shooter with shots and no hero stack next to it then it shoots the nearest hero stack instead of moving', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('SWORDSMAN', 1)], monsterType: 'ARCHER' })
      )

      await moveActiveStackTo(user, 6, 6)

      expect(readBattleStacks()).toContainEqual(stackAt('Archers 10', 6, 15))
      expect(readCombatMessages()[0]).toBe('The Archers do 17 damage.')
    })

    // The Angel flies 12 hexes: the Archers shoot it on its way, then it lands next to them.
    // 10 Archers do 20, -35% for 6 Attack against 20 Defense: 13, halved in melee: 6.
    test('given an enemy stands next to a monster shooter then it attacks it in melee', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ANGEL', 1)], monsterType: 'ARCHER' })
      )
      await moveActiveStackTo(user, 6, 8)

      await moveActiveStackTo(user, 6, 14)

      expect(readCombatMessages()[1]).toBe('The Archers do 6 damage.')
    })

    test('given the monster is moving then clicking the battlefield does nothing', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ANGEL', 1)], monsterType: 'PIKEMAN' }),
        { appConfig: { battleStepDelayMs: 30 } }
      )
      await clickBattleHex(user, 6, 2)
      await waitMs(60)

      await clickBattleHex(user, 6, 5)
      await waitMs(200)
      await flushMicrotasks()

      expect(readActiveStack()).toEqual(stackAt('Angel 1', 6, 2))
      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 10', 6, 11))
    })
  })

  describe('defeat', () => {
    // The Swordsmen open the battle by walking to row 6, column 10; one Skeleton walks 4 hexes
    // toward them and they kill it.
    async function loseTheSkeletonToSwordsmen() {
      const app = await startBattle(aFight({ army: [stack('SKELETON', 1)] }))
      await moveActiveStackTo(app.user, 6, 5)
      await waitForBattleToEnd()
      return app
    }

    test('given the monster kills the last hero stack then the battle ends and the adventure map is back', async () => {
      await loseTheSkeletonToSwordsmen()

      expect(queryBattleScreen()).toBeNull()
      expectMonsterPresent('monster-1')
    })

    test('given the hero lost the battle then the hero is gone from the map', async () => {
      await loseTheSkeletonToSwordsmen()

      expect(getHeroEntity()).toBeNull()
    })

    test('given the hero lost the battle when the player clicks the monster then no battle starts', async () => {
      await loseTheSkeletonToSwordsmen()

      await attackMonsterAt(1, 0)

      expect(queryBattleScreen()).toBeNull()
    })

    test('given the hero lost the battle then the monster stays with the creatures it has left', async () => {
      const { user } = await startBattle(anAngelLosingToSwordsmen())
      await loseTheAngelToSwordsmen(user)

      await hoverTile(user, 1, 0)

      // 51 Swordsmen were a Horde; the 49 left are Lots.
      expectStatusBarText('Lots of Swordsmen')
    })
  })

  describe('reload', () => {
    test('given the monster has attacked when the page reloads then the stacks are as it left them', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = anAngelAgainstSwordsmen()
      const { user } = await startBattle(scenario, { eventLog })
      await flyAngelWithinSwordsmenReach(user)

      await reload(scenario, eventLog)

      expect(readBattleStacks()).toEqual([stackAt('Angel 1', 6, 9), stackAt('Swordsmen 8', 6, 10)])
    })

    test('given the monster is moving when the page reloads then it stands where it was going and the next stack is active', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ army: [stack('ANGEL', 1)], monsterType: 'PIKEMAN' })
      const { user } = await startBattle(scenario, {
        eventLog,
        appConfig: { battleStepDelayMs: 30 }
      })
      await clickBattleHex(user, 6, 2)
      await waitMs(60)

      await reload(scenario, eventLog)

      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 10', 6, 11))
      expect(readActiveStack()).toEqual(stackAt('Angel 1', 6, 2))
    })

    test('given the hero lost a battle when the page reloads then the hero is still gone and the monster keeps its losses', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = anAngelLosingToSwordsmen()
      const { user } = await startBattle(scenario, { eventLog })
      await loseTheAngelToSwordsmen(user)

      const reloaded = await reload(scenario, eventLog)
      await hoverTile(reloaded.user, 1, 0)

      expect(getHeroEntity()).toBeNull()
      expectStatusBarText('Lots of Swordsmen')
    })
  })
})
