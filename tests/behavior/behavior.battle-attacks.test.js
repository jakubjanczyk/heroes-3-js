// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  attackBattleHexFrom,
  attackMonsterAt,
  createMemoryEventLog,
  expectMonsterNotPresent,
  flushMicrotasks,
  getBattleStatusBarText,
  hoverBattleHex,
  moveActiveStackTo,
  pointAtBattleHexSide,
  queryBattleScreen,
  readActiveStack,
  readBattleStacks,
  readCombatMessages,
  readGameData,
  setupMovementBehaviorApp,
  tapBattleHexSide,
  waitForBattleToEnd,
  winBattle
} from './behavior.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

const monsters = readGameData('monsters.json')

const stack = (creature, count) => ({ creature, count })

// Every damage roll lands on the lowest damage, unless a test says otherwise.
const LOWEST_ROLLS = () => 0

function rollsInTurn(...values) {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index += 1
    return value
  }
}

// The hero has no primary skills unless a test gives them some, and the monster stays one stack.
const aFight = ({ army, monsterType = 'PIKEMAN', monsterCount = 50, hero = aHero() }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      hero.withArmy(army),
      aMonster().withType(monsterType).withCount(monsterCount).withStacks(1).at(1, 0)
    )
    .withDefinitions({ monsters })

async function startBattle(scenario, { random = LOWEST_ROLLS, eventLog } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    eventLog,
    appConfig: { random, fadeOutMsByKind: { MONSTER: 0 } }
  })
  await attackMonsterAt(1, 0)
  return app
}

const stackAt = (name, row, column) => ({ stack: name, row, column })

// With one stack each, the hero's stack starts on row 6, column 1 and the monster on row 6,
// column 15. Pikemen walk 4 hexes a turn toward the hero's stacks: once the Angels fly to
// column 5, the Pikemen stand on row 6, column 11.
const PIKEMEN = { row: 6, column: 11 }

async function flyAngelsCloser(user) {
  await moveActiveStackTo(user, 6, 5)
}

async function attackPikemenFrom(user, side) {
  await attackBattleHexFrom(user, PIKEMEN.row, PIKEMEN.column, side)
}

// Two Angels hit Pikemen for 175: 2 x 50 damage, +75% for 20 Attack against 5 Defense.
const aFightOfTwoAngelsAndPikemen = (overrides = {}) =>
  aFight({ army: [stack('ANGEL', 2)], ...overrides })

// One Crusader attacks 100 Pikemen and dies to their retaliation: 80 damage, 35 health. The Angel
// keeps away along the bottom row; the Pikemen walk after it, to row 6, column 7.
async function startBattleWithACrusaderCorpse(options) {
  const app = await startBattle(
    aFight({ army: [stack('CRUSADER', 1), stack('ANGEL', 1)], monsterCount: 100 }),
    options
  )
  const { user } = app
  await moveActiveStackTo(user, 11, 2)
  await moveActiveStackTo(user, 3, 7)
  await moveActiveStackTo(user, 11, 3)
  await attackPikemenFrom(user, 'top-left')
  return app
}

const CRUSADER_CORPSE = { row: 5, column: 10 }

describe('battle attack behavior', () => {
  describe('attacking', () => {
    // The Pikemen attack the Angels first and lose 17 to their retaliation, which leaves the top
    // Pikeman wounded: the Angels' 175 then kill 18.
    test('when the player clicks a monster next to the active stack on its side then the stack attacks without moving', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen({ monsterCount: 100 }))
      await flyAngelsCloser(user)
      await moveActiveStackTo(user, 6, 10)

      await attackPikemenFrom(user, 'left')

      expect(readBattleStacks()).toContainEqual(stackAt('Angels 2', 6, 10))
      expect(readCombatMessages()[2]).toBe('The Angels do 175 damage. 18 Pikemen perish.')
    })

    test('when the player clicks a side of a monster within reach then the stack moves next to it on that side and attacks', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen())
      await flyAngelsCloser(user)

      await attackPikemenFrom(user, 'top-left')

      expect(readBattleStacks()).toContainEqual(stackAt('Angels 2', 5, 10))
      expect(readCombatMessages()[0]).toBe('The Angels do 175 damage. 17 Pikemen perish.')
    })

    test('given the side pointed at is off the battlefield then the stack attacks from the nearest side it can', async () => {
      // The Angels lead the Pikemen to the top row: they attack the Angels from row 1, column 14.
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen({ monsterCount: 100 }))
      await moveActiveStackTo(user, 1, 9)
      await moveActiveStackTo(user, 1, 15)

      await attackBattleHexFrom(user, 1, 14, 'top-left')

      expect(readBattleStacks()).toEqual(
        expect.arrayContaining([stackAt('Angels 2', 1, 13), stackAt('Pikemen 48', 1, 14)])
      )
    })

    test('given another stack stands on the side pointed at then the stack attacks from the nearest side it can', async () => {
      // Both Angel stacks are as fast; the one in the first slot acts first.
      const { user } = await startBattle(aFight({ army: [stack('ANGEL', 2), stack('ANGEL', 1)] }))
      await moveActiveStackTo(user, 6, 5)
      await moveActiveStackTo(user, 6, 4)
      await moveActiveStackTo(user, 6, 10)

      await attackPikemenFrom(user, 'left')

      expect(readBattleStacks()).toEqual(
        expect.arrayContaining([stackAt('Angels 2', 6, 10), stackAt('Angel 1', 5, 10)])
      )
    })

    test('given the stack stands next to the monster when the player taps any side of it on a touch screen then the stack attacks from where it stands', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen({ monsterCount: 100 }))
      await flyAngelsCloser(user)
      await moveActiveStackTo(user, 6, 10)

      await tapBattleHexSide(user, PIKEMEN.row, PIKEMEN.column, 'top-right')

      // 100 Pikemen lose 17 to the Angels' retaliation, 18 to their attack and 17 to the next
      // retaliation.
      expect(readBattleStacks()).toEqual(
        expect.arrayContaining([stackAt('Angels 2', 6, 10), stackAt('Pikemen 48', 6, 11)])
      )
    })

    test('given a monster the stack cannot reach then clicking it does nothing', async () => {
      // Skeletons walk 4 hexes and go first; the monster is 14 away.
      const { user } = await startBattle(aFight({ army: [stack('SKELETON', 10)] }))

      await attackBattleHexFrom(user, 6, 15, 'left')

      expect(readActiveStack()).toEqual(stackAt('Skeletons 10', 6, 1))
      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 50', 6, 15))
    })

    test('when the player hovers a monster the stack can attack then the status bar says Attack Pikemen (damage 18-36)', async () => {
      // 5 Royal Griffins deal 3-6 each, +20% for 9 Attack against 5 Defense.
      const { user } = await startBattle(aFight({ army: [stack('ROYAL_GRIFFIN', 5)] }))
      await moveActiveStackTo(user, 6, 6)

      await pointAtBattleHexSide(user, PIKEMEN.row, PIKEMEN.column, 'left')

      expect(getBattleStatusBarText()).toBe('Attack Pikemen (damage 18-36)')
    })

    test('given a stack attacks then the next stack becomes active', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ANGEL', 2), stack('SKELETON', 10)] })
      )
      await moveActiveStackTo(user, 6, 5)
      await moveActiveStackTo(user, 9, 2)

      await attackPikemenFrom(user, 'left')

      expect(readActiveStack()).toEqual(stackAt('Skeletons 10', 9, 2))
    })
  })

  describe('damage', () => {
    // Royal Griffins have 9 Attack and 9 Defense and deal 3-6 damage each, and fly 9 hexes.
    const aFightOfRoyalGriffins = ({ attackers, defenders = 20, hero }) =>
      aFight({
        army: [stack('ROYAL_GRIFFIN', attackers)],
        monsterType: 'ROYAL_GRIFFIN',
        monsterCount: defenders,
        hero
      })

    // The hero's Royal Griffins stay out of reach; the monster's fly up to row 6, column 6.
    async function royalGriffinsAttack(user) {
      await moveActiveStackTo(user, 6, 2)
      await attackBattleHexFrom(user, 6, 6, 'left')
    }

    test('given equal attack and defense then the damage is one roll per creature added up', async () => {
      // Few enough defenders for the 3 to live through their strike back and attack.
      const { user } = await startBattle(aFightOfRoyalGriffins({ attackers: 3, defenders: 2 }), {
        random: rollsInTurn(0, 0.5, 0.99)
      })

      await royalGriffinsAttack(user)

      // 3 + 5 + 6
      expect(readCombatMessages()[0]).toBe('The Royal Griffins do 14 damage.')
    })

    test('given more than 10 creatures then the damage is 10 rolls added up times count / 10', async () => {
      const { user } = await startBattle(aFightOfRoyalGriffins({ attackers: 15 }), {
        random: rollsInTurn(0, 0.99)
      })

      await royalGriffinsAttack(user)

      // (3 + 6) x 5 = 45, x 15 / 10 = 67.5, rounded down.
      expect(readCombatMessages()[0]).toBe(
        'The Royal Griffins do 67 damage. 2 Royal Griffins perish.'
      )
    })

    test('given attack is higher than defense then damage rises 5% per point', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen())
      await flyAngelsCloser(user)

      await attackPikemenFrom(user, 'left')

      expect(readCombatMessages()[0]).toBe('The Angels do 175 damage. 17 Pikemen perish.')
    })

    test('given defense is higher than attack then damage falls 2.5% per point', async () => {
      // The Angel is faster: it opens the battle by flying to row 6, column 3.
      const { user } = await startBattle(
        aFight({ army: [stack('ROYAL_GRIFFIN', 10)], monsterType: 'ANGEL', monsterCount: 1 })
      )

      await attackBattleHexFrom(user, 6, 3, 'left')

      // 30 damage, -27.5% for 9 Attack against 20 Defense: 21.75, rounded down.
      expect(readCombatMessages()[0]).toBe('The Royal Griffins do 21 damage.')
    })

    test('given the hero has Attack skill then their stacks hit harder', async () => {
      const { user } = await startBattle(
        aFightOfRoyalGriffins({
          attackers: 10,
          hero: aHero().withPrimarySkills({ attack: 4, defense: 0 })
        })
      )

      await royalGriffinsAttack(user)

      // 30 damage, +20% for 9 + 4 Attack against 9 Defense.
      expect(readCombatMessages()[0]).toBe(
        'The Royal Griffins do 36 damage. One Royal Griffin perishes.'
      )
    })

    test('given the hero has Defense skill then their stacks take less retaliation damage', async () => {
      const { user } = await startBattle(
        aFightOfTwoAngelsAndPikemen({ hero: aHero().withPrimarySkills({ attack: 0, defense: 4 }) })
      )
      await flyAngelsCloser(user)

      await attackPikemenFrom(user, 'left')

      // 33 Pikemen deal 33, -50% for 4 Attack against 20 + 4 Defense: 16.5, rounded down.
      expect(readCombatMessages()[1]).toBe('The Pikemen do 16 damage.')
    })
  })

  describe('casualties', () => {
    // The Angels' 175 damage kills 17 of 50 Pikemen and leaves the top one with 5 health. The
    // Pikemen then attack the Angels, and the Angels' retaliation of 175 kills that one and 17 more.
    test('given the damage kills some creatures then the stack shows the count left', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen())
      await flyAngelsCloser(user)

      await attackPikemenFrom(user, 'left')

      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 15', 6, 11))
    })

    test('given leftover damage then the next hit kills the wounded creature sooner', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen())
      await flyAngelsCloser(user)

      await attackPikemenFrom(user, 'left')

      expect(readCombatMessages()[3]).toBe('The Angels do 175 damage. 18 Pikemen perish.')
    })

    test('given an attack then the message log says The Angels do 175 damage. 17 Pikemen perish.', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen())
      await flyAngelsCloser(user)

      await attackPikemenFrom(user, 'left')

      expect(readCombatMessages().slice(0, 2)).toEqual([
        'The Angels do 175 damage. 17 Pikemen perish.',
        'The Pikemen do 19 damage.'
      ])
    })

    test('given one creature dies then the message log says One Champion perishes.', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ANGEL', 2)], monsterType: 'CHAMPION', monsterCount: 5 })
      )

      // Champions walk 9 hexes: they reach the Angels and attack, and the Angels strike back.
      await flyAngelsCloser(user)

      // 100 damage, +20% for 20 Attack against 16 Defense, against 100 health each.
      expect(readCombatMessages()[1]).toBe('The Angels do 120 damage. One Champion perishes.')
    })
  })

  describe('retaliation', () => {
    test('given the defender survives then it strikes back and the attacker loses creatures', async () => {
      const { user } = await startBattle(aFight({ army: [stack('ROYAL_GRIFFIN', 10)] }))
      await moveActiveStackTo(user, 6, 6)

      await attackPikemenFrom(user, 'left')

      // 47 Pikemen deal 41 (-12.5%): one Royal Griffin of 25 health dies.
      expect(readCombatMessages()[1]).toBe('The Pikemen do 41 damage. One Royal Griffin perishes.')
    })

    async function bothStacksAttackInOneRound(user, monster = PIKEMEN) {
      await moveActiveStackTo(user, 6, 5)
      await moveActiveStackTo(user, 7, 6)
      await attackBattleHexFrom(user, monster.row, monster.column, 'left')
      await attackBattleHexFrom(user, monster.row, monster.column, 'bottom-left')
    }

    test('given the defender already struck back this round then the next attacker gets no retaliation', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ANGEL', 2), stack('ROYAL_GRIFFIN', 10)] })
      )

      await bothStacksAttackInOneRound(user)

      expect(readBattleStacks()).toContainEqual(stackAt('Royal Griffins 10', 7, 10))
    })

    test('given a new round starts then the defender strikes back again', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen({ monsterCount: 100 }))
      await flyAngelsCloser(user)
      await attackPikemenFrom(user, 'left')

      await attackPikemenFrom(user, 'left')

      // 100 Pikemen lose 17, then 18 to the Angels' retaliation, then 17: the 48 left deal 48,
      // -40% for 4 Attack against 20 Defense.
      expect(readCombatMessages()[5]).toBe('The Pikemen do 28 damage.')
    })

    test('given Griffins defend then they strike back twice in a round', async () => {
      const { user } = await startBattle(
        aFight({
          army: [stack('ANGEL', 2), stack('ROYAL_GRIFFIN', 10)],
          monsterType: 'GRIFFIN'
        })
      )

      // Griffins fly 6 hexes: to row 6, column 9.
      await bothStacksAttackInOneRound(user, { row: 6, column: 9 })

      // 43 Griffins deal 125 (-2.5%) on the second retaliation: 5 Royal Griffins die.
      expect(readBattleStacks()).toContainEqual(stackAt('Royal Griffins 5', 7, 8))
    })

    test('given Royal Griffins defend then they strike back after every attack', async () => {
      const { user } = await startBattle(
        aFight({
          army: [stack('ANGEL', 1), stack('ANGEL', 1), stack('ROYAL_GRIFFIN', 10)],
          monsterType: 'ROYAL_GRIFFIN'
        })
      )
      // Everyone stays out of the monster's reach; it flies up to row 6, column 6.
      await moveActiveStackTo(user, 3, 2)
      await moveActiveStackTo(user, 6, 2)
      await moveActiveStackTo(user, 9, 3)
      await attackBattleHexFrom(user, 6, 6, 'top-left')
      await attackBattleHexFrom(user, 6, 6, 'left')

      await attackBattleHexFrom(user, 6, 6, 'bottom-left')

      // 43 Royal Griffins deal 129 on the third retaliation: 5 of 10 die.
      expect(readBattleStacks()).toContainEqual(stackAt('Royal Griffins 5', 7, 5))
    })

    test('given Crusaders attack then they strike, take the retaliation and strike again', async () => {
      const { user } = await startBattle(aFight({ army: [stack('CRUSADER', 5)] }))
      await moveActiveStackTo(user, 6, 7)

      await attackPikemenFrom(user, 'left')

      expect(readCombatMessages().slice(0, 3)).toEqual([
        'The Crusaders do 47 damage. 4 Pikemen perish.',
        'The Pikemen do 36 damage. One Crusader perishes.',
        'The Crusaders do 37 damage. 4 Pikemen perish.'
      ])
    })

    test('given the retaliation kills the Crusaders then they do not strike again', async () => {
      await startBattleWithACrusaderCorpse()

      expect(readCombatMessages().slice(0, 2)).toEqual([
        'The Crusader does 9 damage.',
        'The Pikemen do 80 damage. One Crusader perishes.'
      ])
    })
  })

  describe('corpses and the end of the battle', () => {
    test('given a stack loses all its creatures then it stays on its hex as a corpse with no count', async () => {
      await startBattleWithACrusaderCorpse()

      expect(readBattleStacks()).toContainEqual(
        stackAt('Dead Crusader', CRUSADER_CORPSE.row, CRUSADER_CORPSE.column)
      )
    })

    test('given a corpse then it gets no turn', async () => {
      const { user } = await startBattleWithACrusaderCorpse()

      await moveActiveStackTo(user, 11, 4)

      expect(readActiveStack()).toEqual(stackAt('Angel 1', 11, 4))
    })

    test('given a corpse then other stacks can move onto its hex', async () => {
      const { user } = await startBattleWithACrusaderCorpse()

      await moveActiveStackTo(user, CRUSADER_CORPSE.row, CRUSADER_CORPSE.column)

      expect(readBattleStacks()).toEqual(
        expect.arrayContaining([
          stackAt('Dead Crusader', CRUSADER_CORPSE.row, CRUSADER_CORPSE.column),
          stackAt('Angel 1', CRUSADER_CORPSE.row, CRUSADER_CORPSE.column)
        ])
      )
    })

    test('when the player hovers a corpse then no attack is offered', async () => {
      const { user } = await startBattleWithACrusaderCorpse()

      await hoverBattleHex(user, CRUSADER_CORPSE.row, CRUSADER_CORPSE.column)

      expect(getBattleStatusBarText()).toBe('Fly Angel here')
    })

    test("given the monster's last creature dies then the battle ends, the adventure map is back and the monster is gone", async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen({ monsterCount: 10 }))
      await flyAngelsCloser(user)

      await attackPikemenFrom(user, 'left')
      await waitForBattleToEnd()

      expect(queryBattleScreen()).toBeNull()
      expectMonsterNotPresent('monster-1')
    })

    test('given a battle with wounded stacks and spent retaliations when the page reloads then they are as before', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ army: [stack('ANGEL', 2), stack('ROYAL_GRIFFIN', 10)] })
      const { user } = await startBattle(scenario, { eventLog })
      await moveActiveStackTo(user, 6, 5)
      await moveActiveStackTo(user, 7, 6)
      await attackPikemenFrom(user, 'left')

      const reloaded = await setupMovementBehaviorApp({
        loadGameOptions: scenario.build(),
        eventLog,
        appConfig: { random: LOWEST_ROLLS }
      })
      await flushMicrotasks()
      await attackPikemenFrom(reloaded.user, 'bottom-left')

      // 36 damage on a top Pikeman with 5 health left kills 4, with no retaliation. The 29 left
      // attack the Angels, whose retaliation kills 17.
      expect(readBattleStacks()).toEqual(
        expect.arrayContaining([stackAt('Pikemen 12', 6, 11), stackAt('Royal Griffins 10', 7, 10)])
      )
    })

    test('given a battle with a corpse when the page reloads then the corpse is still there', async () => {
      const eventLog = createMemoryEventLog()
      await startBattleWithACrusaderCorpse({ eventLog })

      await setupMovementBehaviorApp({
        loadGameOptions: aFight({
          army: [stack('CRUSADER', 1), stack('ANGEL', 1)],
          monsterCount: 100
        }).build(),
        eventLog,
        appConfig: { random: LOWEST_ROLLS }
      })
      await flushMicrotasks()

      expect(readBattleStacks()).toContainEqual(
        stackAt('Dead Crusader', CRUSADER_CORPSE.row, CRUSADER_CORPSE.column)
      )
    })
  })

  describe('experience', () => {
    const heroDefinitions = {
      monsters,
      hero: readGameData('hero.json'),
      heroClasses: readGameData('hero-classes.json')
    }

    // 10 Pikemen have 100 health in all.
    const aFightForALevel = () =>
      aFightOfTwoAngelsAndPikemen({
        monsterCount: 10,
        hero: aHero().withExperience(900)
      }).withDefinitions(heroDefinitions)

    const queryLevelUpDialog = () =>
      screen.queryByRole('dialog', { name: 'Hero has gained a level.' })

    test('given the monster is killed then the hero gains experience equal to the health of the creatures killed', async () => {
      const { user } = await startBattle(aFightForALevel())
      await flyAngelsCloser(user)

      await attackPikemenFrom(user, 'left')
      await waitForBattleToEnd()

      expect(within(queryLevelUpDialog()).getByText('Hero is now a level 2 Knight.')).toBeTruthy()
    })

    test('given Auto combat wins then the hero gains experience equal to the health of the monster', async () => {
      const { user } = await startBattle(aFightForALevel())

      await winBattle(user)

      expect(within(queryLevelUpDialog()).getByText('Hero is now a level 2 Knight.')).toBeTruthy()
    })
  })
})
