// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  attackBattleHexFrom,
  attackMonsterAt,
  clickBattleButton,
  clickResetSession,
  createMemoryEventLog,
  expectMonsterNotPresent,
  flushMicrotasks,
  moveActiveStackTo,
  queryBattleScreen,
  readBattleStacks,
  readCombatMessages,
  readGameData,
  setupMovementBehaviorApp,
  waitForBattleToEnd
} from './behavior.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

const monsters = readGameData('monsters.json')

const stack = (creature, count) => ({ creature, count })

// Every damage roll lands on the lowest damage.
const LOWEST_ROLLS = () => 0

// Heroes 3 shifts the number of stacks by one on some tiles: on (1, 0) it keeps it, on (5, 0)
// it makes one fewer and on (0, 1) one more. The hero stands next to the monster.
const TILE_KEEPING_THE_COUNT = { monster: [1, 0], hero: [0, 0] }
const TILE_MAKING_ONE_FEWER = { monster: [5, 0], hero: [4, 0] }
const TILE_MAKING_ONE_MORE = { monster: [0, 1], hero: [0, 0] }

// Strength is the creatures' AI value times their count: a Skeleton is worth 60, a Pikeman 80.
const aFight = ({
  army,
  monsterType = 'PIKEMAN',
  monsterCount = 10,
  stacks,
  hero = aHero(),
  tiles = TILE_KEEPING_THE_COUNT
}) => {
  const monster = aMonster()
    .withType(monsterType)
    .withCount(monsterCount)
    .at(...tiles.monster)
  return aScenario()
    .withSize(6, 2)
    .withEntities(
      hero.withArmy(army).at(...tiles.hero),
      stacks ? monster.withStacks(stacks) : monster
    )
    .withDefinitions({ monsters, hero: readGameData('hero.json') })
}

async function startBattle(scenario, { eventLog, envWindow } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    eventLog,
    envWindow,
    appConfig: { random: LOWEST_ROLLS, fadeOutMsByKind: { MONSTER: 0 } }
  })
  const { tile } = scenario.build().entities.find(({ kind }) => kind === 'MONSTER')
  await attackMonsterAt(tile.x, tile.y)
  return app
}

const readMonsterStacks = () => readBattleStacks().filter(({ column }) => column === 15)

const stackAt = (name, row, column) => ({ stack: name, row, column })

describe('battle monster stacks behavior', () => {
  describe('splitting', () => {
    test.each([
      [0.45, 7, 6],
      [0.6, 6, 8],
      [0.75, 5, 10],
      [1.125, 4, 15],
      [1.5, 3, 20],
      [2.25, 2, 30]
    ])('given the hero army is %f times as strong as the monster then it splits into %i stacks', async (_, stackCount, skeletons) => {
      // 10 Pikemen are worth 800.
      await startBattle(aFight({ army: [stack('SKELETON', skeletons)] }))

      expect(readMonsterStacks()).toHaveLength(stackCount)
    })

    test('given the monster stands on a tile where Heroes 3 makes one stack fewer then it splits into one stack fewer', async () => {
      await startBattle(aFight({ army: [stack('SKELETON', 10)], tiles: TILE_MAKING_ONE_FEWER }))

      expect(readMonsterStacks()).toHaveLength(4)
    })

    test('given the monster stands on a tile where Heroes 3 makes one stack more then it splits into one stack more', async () => {
      await startBattle(aFight({ army: [stack('SKELETON', 10)], tiles: TILE_MAKING_ONE_MORE }))

      expect(readMonsterStacks()).toHaveLength(6)
    })

    test('given the creatures do not share out evenly then the first stacks get one more', async () => {
      // 15 Skeletons are worth 900: four stacks.
      await startBattle(aFight({ army: [stack('SKELETON', 15)] }))

      expect(readMonsterStacks()).toEqual([
        stackAt('Pikemen 3', 1, 15),
        stackAt('Pikemen 3', 5, 15),
        stackAt('Pikemen 2', 7, 15),
        stackAt('Pikemen 2', 11, 15)
      ])
    })

    test('given the monster has fewer creatures than stacks it would split into then each creature is its own stack', async () => {
      // 1 Skeleton is worth 60 against 240: seven stacks, but there are only three Pikemen.
      await startBattle(aFight({ army: [stack('SKELETON', 1)], monsterCount: 3 }))

      expect(readMonsterStacks()).toEqual([
        stackAt('Pikeman 1', 3, 15),
        stackAt('Pikeman 1', 6, 15),
        stackAt('Pikeman 1', 9, 15)
      ])
    })

    test('given the scenario sets the number of stacks then the monster splits into that many', async () => {
      await startBattle(aFight({ army: [stack('SKELETON', 1)], stacks: 2 }))

      expect(readMonsterStacks()).toEqual([
        stackAt('Pikemen 5', 3, 15),
        stackAt('Pikemen 5', 9, 15)
      ])
    })

    test('given the session is reset when the hero attacks the same monster again then it splits the same way', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ army: [stack('SKELETON', 15)] })
      const { envWindow } = windowThatReloadsNowhere()
      const first = await startBattle(scenario, { eventLog, envWindow })
      const firstStacks = readMonsterStacks()
      await clickBattleButton(first.user, 'Auto combat')
      await waitForBattleToEnd()
      await clickResetSession(first.user)
      await flushMicrotasks()

      await startBattle(scenario, { eventLog })

      expect(readMonsterStacks()).toEqual(firstStacks)
    })
  })

  describe('fighting several stacks', () => {
    // Two Angels kill 5 Pikemen with one blow and fly anywhere.
    const aFightOfTwoAngelsAndTwoStacks = (overrides = {}) =>
      aFight({ army: [stack('ANGEL', 2)], stacks: 2, ...overrides })

    // The Angels stay out of reach; both stacks of Pikemen walk 4 hexes along their rows, to
    // column 11.
    async function waitForThePikemen(user) {
      await moveActiveStackTo(user, 6, 2)
    }

    // The Pikemen on row 9 then walk 4 hexes toward the Angels, to row 5, column 10.
    async function attackThePikemenOnRow3(user) {
      await attackBattleHexFrom(user, 3, 11, 'left')
    }

    test('given the monster splits then each stack strikes back on its own', async () => {
      const { user } = await startBattle(
        aFight({
          army: [stack('ANGEL', 1), stack('ANGEL', 1)],
          monsterCount: 100,
          stacks: 2
        })
      )
      await moveActiveStackTo(user, 3, 2)
      await moveActiveStackTo(user, 9, 2)
      await attackBattleHexFrom(user, 3, 11, 'left')

      await attackBattleHexFrom(user, 9, 11, 'left')

      // 50 Pikemen deal 50, -40% for 4 Attack against 20 Defense.
      expect(readCombatMessages().slice(0, 4)).toEqual([
        'The Angel does 87 damage. 8 Pikemen perish.',
        'The Pikemen do 25 damage.',
        'The Angel does 87 damage. 8 Pikemen perish.',
        'The Pikemen do 25 damage.'
      ])
    })

    test('given one monster stack dies while another still has creatures then the battle goes on', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndTwoStacks())
      await waitForThePikemen(user)

      await attackThePikemenOnRow3(user)

      expect(readBattleStacks()).toEqual(
        expect.arrayContaining([stackAt('Dead Pikemen', 3, 11), stackAt('Pikemen 5', 5, 10)])
      )
    })

    test('given the last monster stack dies then the battle ends and the monster is gone', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndTwoStacks())
      await waitForThePikemen(user)
      await attackThePikemenOnRow3(user)

      await attackBattleHexFrom(user, 5, 10, 'left')

      expect(queryBattleScreen()).toBeNull()
      expectMonsterNotPresent('monster-1')
    })

    test('given every monster stack is killed then the hero gains experience for the creatures of all of them', async () => {
      // 10 Pikemen have 100 health in all.
      const { user } = await startBattle(
        aFightOfTwoAngelsAndTwoStacks({ hero: aHero().withExperience(900) }).withDefinitions({
          monsters,
          hero: readGameData('hero.json'),
          heroClasses: readGameData('hero-classes.json')
        })
      )
      await waitForThePikemen(user)
      await attackThePikemenOnRow3(user)

      await attackBattleHexFrom(user, 5, 10, 'left')

      const levelUp = screen.getByRole('dialog', { name: 'Hero has gained a level.' })
      expect(within(levelUp).getByText('Hero is now a level 2 Knight.')).toBeTruthy()
    })

    test('given a battle against several stacks when the page reloads then the stacks and their counts are as before', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ army: [stack('ANGEL', 2)], monsterCount: 100, stacks: 2 })
      const { user } = await startBattle(scenario, { eventLog })
      await waitForThePikemen(user)
      await attackThePikemenOnRow3(user)

      await setupMovementBehaviorApp({
        loadGameOptions: scenario.build(),
        eventLog,
        appConfig: { random: LOWEST_ROLLS }
      })
      await flushMicrotasks()

      // The Angels kill 17 of 50; the 33 left attack them and lose 18 to the retaliation.
      expect(readBattleStacks()).toEqual(
        expect.arrayContaining([stackAt('Pikemen 15', 3, 11), stackAt('Pikemen 50', 5, 10)])
      )
    })
  })
})

function windowThatReloadsNowhere() {
  const envWindow = Object.create(window)
  Object.defineProperty(envWindow, 'location', { value: { reload() {} } })
  return { envWindow }
}
