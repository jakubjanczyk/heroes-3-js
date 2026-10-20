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

// The hero has no primary skills unless a test gives them some.
const aFight = ({ army, monsterType = 'PIKEMAN', monsterCount = 50, hero = aHero() }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      hero.withArmy(army),
      aMonster().withType(monsterType).withCount(monsterCount).at(1, 0)
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

// With one stack each, the hero's stack starts on row 6, column 1 and the monster on row 6, column 15.
const MONSTER = { row: 6, column: 15 }

async function attackMonsterFrom(user, side) {
  await attackBattleHexFrom(user, MONSTER.row, MONSTER.column, side)
}

const stackAt = (name, row, column) => ({ stack: name, row, column })

async function flyAngelsCloser(user) {
  await moveActiveStackTo(user, 6, 5)
}

// Two Angels hit Pikemen for 175: 2 x 50 damage, +75% for 20 Attack against 5 Defense.
const aFightOfTwoAngelsAndPikemen = (overrides = {}) =>
  aFight({ army: [stack('ANGEL', 2)], ...overrides })

// One Crusader walks up to 100 Pikemen and dies to their retaliation: 80 damage, 35 health.
async function startBattleWithACrusaderCorpse(options) {
  const app = await startBattle(
    aFight({ army: [stack('CRUSADER', 1), stack('ANGEL', 1)], monsterCount: 100 }),
    options
  )
  const { user } = app
  await moveActiveStackTo(user, 9, 2)
  await moveActiveStackTo(user, 3, 7)
  await moveActiveStackTo(user, 9, 3)
  await moveActiveStackTo(user, 3, 13)
  await moveActiveStackTo(user, 9, 4)
  await attackMonsterFrom(user, 'top-left')
  return app
}

describe('battle attack behavior', () => {
  describe('attacking', () => {
    test('when the player clicks a monster next to the active stack on its side then the stack attacks without moving', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen())
      await flyAngelsCloser(user)
      await moveActiveStackTo(user, 6, 14)

      await attackMonsterFrom(user, 'left')

      expect(readBattleStacks()).toContainEqual(stackAt('Angels 2', 6, 14))
      expect(readCombatMessages()[0]).toBe('The Angels do 175 damage. 17 Pikemen perish.')
    })

    test('when the player clicks a side of a monster within reach then the stack moves next to it on that side and attacks', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen())
      await flyAngelsCloser(user)

      await attackMonsterFrom(user, 'top-left')

      expect(readBattleStacks()).toContainEqual(stackAt('Angels 2', 5, 14))
      expect(readCombatMessages()[0]).toBe('The Angels do 175 damage. 17 Pikemen perish.')
    })

    test('given the side pointed at is off the battlefield then the stack attacks from the nearest side it can', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen())
      await flyAngelsCloser(user)

      await attackMonsterFrom(user, 'right')

      expect(readBattleStacks()).toEqual(
        expect.arrayContaining([stackAt('Angels 2', 5, 15), stackAt('Pikemen 33', 6, 15)])
      )
    })

    test('given another stack stands on the side pointed at then the stack attacks from the nearest side it can', async () => {
      // Both Angel stacks are as fast; the one in the first slot acts first.
      const { user } = await startBattle(aFight({ army: [stack('ANGEL', 2), stack('ANGEL', 1)] }))
      await moveActiveStackTo(user, 6, 5)
      await moveActiveStackTo(user, 6, 4)
      await moveActiveStackTo(user, 6, 14)

      await attackMonsterFrom(user, 'left')

      expect(readBattleStacks()).toEqual(
        expect.arrayContaining([stackAt('Angel 1', 5, 14), stackAt('Pikemen 42', 6, 15)])
      )
    })

    test('given the stack stands next to the monster when the player taps any side of it on a touch screen then the stack attacks from where it stands', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen())
      await flyAngelsCloser(user)
      await moveActiveStackTo(user, 6, 14)

      await tapBattleHexSide(user, MONSTER.row, MONSTER.column, 'top-right')

      expect(readBattleStacks()).toEqual(
        expect.arrayContaining([stackAt('Angels 2', 6, 14), stackAt('Pikemen 33', 6, 15)])
      )
    })

    test('given a monster the stack cannot reach then clicking it does nothing', async () => {
      // Skeletons walk 4 hexes; the monster is 14 away.
      const { user } = await startBattle(aFight({ army: [stack('SKELETON', 10)] }))

      await attackMonsterFrom(user, 'left')

      expect(readActiveStack()).toEqual(stackAt('Skeletons 10', 6, 1))
      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 50', 6, 15))
    })

    test('when the player hovers a monster the stack can attack then the status bar says Attack Pikemen (damage 18-36)', async () => {
      // 5 Royal Griffins deal 3-6 each, +20% for 9 Attack against 5 Defense.
      const { user } = await startBattle(aFight({ army: [stack('ROYAL_GRIFFIN', 5)] }))
      await moveActiveStackTo(user, 6, 10)

      await pointAtBattleHexSide(user, MONSTER.row, MONSTER.column, 'left')

      expect(getBattleStatusBarText()).toBe('Attack Pikemen (damage 18-36)')
    })

    test('given a stack attacks then the next stack becomes active', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ANGEL', 2), stack('SKELETON', 10)] })
      )
      await moveActiveStackTo(user, 6, 5)
      await moveActiveStackTo(user, 9, 2)

      await attackMonsterFrom(user, 'left')

      expect(readActiveStack()).toEqual(stackAt('Skeletons 10', 9, 2))
    })
  })

  describe('damage', () => {
    // Royal Griffins have 9 Attack and 9 Defense and deal 3-6 damage each.
    const aFightOfRoyalGriffins = ({ attackers, hero }) =>
      aFight({
        army: [stack('ROYAL_GRIFFIN', attackers)],
        monsterType: 'ROYAL_GRIFFIN',
        monsterCount: 20,
        hero
      })

    async function royalGriffinsAttack(user) {
      await moveActiveStackTo(user, 6, 10)
      await attackMonsterFrom(user, 'left')
    }

    test('given equal attack and defense then the damage is one roll per creature added up', async () => {
      const { user } = await startBattle(aFightOfRoyalGriffins({ attackers: 3 }), {
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

      await attackMonsterFrom(user, 'left')

      expect(readCombatMessages()[0]).toBe('The Angels do 175 damage. 17 Pikemen perish.')
    })

    test('given defense is higher than attack then damage falls 2.5% per point', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ROYAL_GRIFFIN', 10)], monsterType: 'ANGEL', monsterCount: 5 })
      )

      await royalGriffinsAttack(user)

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

      await attackMonsterFrom(user, 'left')

      // 33 Pikemen deal 33, -50% for 4 Attack against 20 + 4 Defense: 16.5, rounded down.
      expect(readCombatMessages()[1]).toBe('The Pikemen do 16 damage.')
    })
  })

  describe('casualties', () => {
    test('given the damage kills some creatures then the stack shows the count left', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen())
      await flyAngelsCloser(user)

      await attackMonsterFrom(user, 'left')

      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 33', 6, 15))
    })

    test('given leftover damage then the next hit kills the wounded creature sooner', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen())
      await flyAngelsCloser(user)
      await attackMonsterFrom(user, 'left')

      await attackMonsterFrom(user, 'left')

      // The first hit leaves the top Pikeman with 5 health, so the second 175 kills 18, not 17.
      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 15', 6, 15))
    })

    test('given an attack then the message log says The Angels do 175 damage. 17 Pikemen perish.', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen())
      await flyAngelsCloser(user)

      await attackMonsterFrom(user, 'left')

      expect(readCombatMessages()).toEqual([
        'The Angels do 175 damage. 17 Pikemen perish.',
        'The Pikemen do 19 damage.'
      ])
    })

    test('given one creature dies then the message log says One Champion perishes.', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ANGEL', 2)], monsterType: 'CHAMPION', monsterCount: 5 })
      )
      await flyAngelsCloser(user)

      await attackMonsterFrom(user, 'left')

      // 100 damage, +20% for 20 Attack against 16 Defense, against 100 health each.
      expect(readCombatMessages()[0]).toBe('The Angels do 120 damage. One Champion perishes.')
    })
  })

  describe('retaliation', () => {
    test('given the defender survives then it strikes back and the attacker loses creatures', async () => {
      const { user } = await startBattle(aFight({ army: [stack('ROYAL_GRIFFIN', 10)] }))
      await moveActiveStackTo(user, 6, 10)

      await attackMonsterFrom(user, 'left')

      // 47 Pikemen deal 41 (-12.5%): one Royal Griffin of 25 health dies.
      expect(readBattleStacks()).toContainEqual(stackAt('Royal Griffins 9', 6, 14))
    })

    async function bothStacksAttackInOneRound(user) {
      await moveActiveStackTo(user, 6, 5)
      await moveActiveStackTo(user, 7, 9)
      await attackMonsterFrom(user, 'left')
      await attackMonsterFrom(user, 'bottom-left')
    }

    test('given the defender already struck back this round then the next attacker gets no retaliation', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ANGEL', 2), stack('ROYAL_GRIFFIN', 10)] })
      )

      await bothStacksAttackInOneRound(user)

      expect(readBattleStacks()).toContainEqual(stackAt('Royal Griffins 10', 7, 14))
    })

    test('given a new round starts then the defender strikes back again', async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen())
      await flyAngelsCloser(user)
      await attackMonsterFrom(user, 'left')

      await attackMonsterFrom(user, 'left')

      // 15 Pikemen deal 15, -40% for 4 Attack against 20 Defense.
      expect(readCombatMessages().at(-1)).toBe('The Pikemen do 9 damage.')
    })

    test('given Griffins defend then they strike back twice in a round', async () => {
      const { user } = await startBattle(
        aFight({
          army: [stack('ANGEL', 2), stack('ROYAL_GRIFFIN', 10)],
          monsterType: 'GRIFFIN'
        })
      )

      await bothStacksAttackInOneRound(user)

      // 43 Griffins deal 125 (-2.5%) on the second retaliation: 5 Royal Griffins die.
      expect(readBattleStacks()).toContainEqual(stackAt('Royal Griffins 5', 7, 14))
    })

    test('given Royal Griffins defend then they strike back after every attack', async () => {
      const { user } = await startBattle(
        aFight({
          army: [stack('ANGEL', 1), stack('ANGEL', 1), stack('ROYAL_GRIFFIN', 10)],
          monsterType: 'ROYAL_GRIFFIN'
        })
      )
      await moveActiveStackTo(user, 5, 8)
      await moveActiveStackTo(user, 6, 8)
      await moveActiveStackTo(user, 7, 9)
      await attackMonsterFrom(user, 'top-left')
      await attackMonsterFrom(user, 'left')

      await attackMonsterFrom(user, 'bottom-left')

      // 43 Royal Griffins deal 129 on the third retaliation: 5 of 10 die.
      expect(readBattleStacks()).toContainEqual(stackAt('Royal Griffins 5', 7, 14))
    })

    test('given Crusaders attack then they strike, take the retaliation and strike again', async () => {
      const { user } = await startBattle(aFight({ army: [stack('CRUSADER', 5)] }))
      await moveActiveStackTo(user, 6, 7)
      await moveActiveStackTo(user, 6, 13)

      await attackMonsterFrom(user, 'left')

      expect(readCombatMessages()).toEqual([
        'The Crusaders do 47 damage. 4 Pikemen perish.',
        'The Pikemen do 36 damage. One Crusader perishes.',
        'The Crusaders do 37 damage. 4 Pikemen perish.'
      ])
    })

    test('given the retaliation kills the Crusaders then they do not strike again', async () => {
      await startBattleWithACrusaderCorpse()

      expect(readCombatMessages()).toEqual([
        'The Crusader does 9 damage.',
        'The Pikemen do 80 damage. One Crusader perishes.'
      ])
    })
  })

  describe('corpses and the end of the battle', () => {
    test('given a stack loses all its creatures then it stays on its hex as a corpse with no count', async () => {
      await startBattleWithACrusaderCorpse()

      expect(readBattleStacks()).toContainEqual(stackAt('Dead Crusader', 5, 14))
    })

    test('given a corpse then it gets no turn', async () => {
      const { user } = await startBattleWithACrusaderCorpse()

      await moveActiveStackTo(user, 9, 5)

      expect(readActiveStack()).toEqual(stackAt('Angel 1', 9, 5))
    })

    test('given a corpse then other stacks can move onto its hex', async () => {
      const { user } = await startBattleWithACrusaderCorpse()

      await moveActiveStackTo(user, 5, 14)

      expect(readBattleStacks()).toEqual(
        expect.arrayContaining([stackAt('Dead Crusader', 5, 14), stackAt('Angel 1', 5, 14)])
      )
    })

    test('when the player hovers a corpse then no attack is offered', async () => {
      const { user } = await startBattleWithACrusaderCorpse()

      await hoverBattleHex(user, 5, 14)

      expect(getBattleStatusBarText()).toBe('Fly Angel here')
    })

    test("given the monster's last creature dies then the battle ends, the adventure map is back and the monster is gone", async () => {
      const { user } = await startBattle(aFightOfTwoAngelsAndPikemen({ monsterCount: 10 }))
      await flyAngelsCloser(user)

      await attackMonsterFrom(user, 'left')

      expect(queryBattleScreen()).toBeNull()
      expectMonsterNotPresent('monster-1')
    })

    test('given a battle with wounded stacks and spent retaliations when the page reloads then they are as before', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ army: [stack('ANGEL', 2), stack('ROYAL_GRIFFIN', 10)] })
      const { user } = await startBattle(scenario, { eventLog })
      await moveActiveStackTo(user, 6, 5)
      await moveActiveStackTo(user, 7, 9)
      await attackMonsterFrom(user, 'left')

      const reloaded = await setupMovementBehaviorApp({
        loadGameOptions: scenario.build(),
        eventLog,
        appConfig: { random: LOWEST_ROLLS }
      })
      await flushMicrotasks()
      await attackMonsterFrom(reloaded.user, 'bottom-left')

      // 36 damage on a top Pikeman with 5 health left kills 4, with no retaliation.
      expect(readBattleStacks()).toEqual(
        expect.arrayContaining([stackAt('Pikemen 29', 6, 15), stackAt('Royal Griffins 10', 7, 14)])
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

      expect(readBattleStacks()).toContainEqual(stackAt('Dead Crusader', 5, 14))
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

      await attackMonsterFrom(user, 'left')

      expect(within(queryLevelUpDialog()).getByText('Hero is now a level 2 Knight.')).toBeTruthy()
    })

    test('given Auto combat wins then the hero gains experience equal to the health of the monster', async () => {
      const { user } = await startBattle(aFightForALevel())

      await winBattle(user)

      expect(within(queryLevelUpDialog()).getByText('Hero is now a level 2 Knight.')).toBeTruthy()
    })
  })
})
