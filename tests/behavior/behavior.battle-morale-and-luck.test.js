// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { createMemoryEventLog, readGameData, waitMs } from './app.utils.js'
import {
  attackBattleHexFrom,
  clickBattleButton,
  moveActiveStackTo,
  queryBattleResults,
  readActiveStack,
  readBattleEffects,
  readCombatMessages,
  reloadBattle,
  shootAt,
  startBattle
} from './battle.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

const definitions = {
  monsters: readGameData('monsters.json'),
  secondarySkills: readGameData('secondary-skills.json')
}

const stack = (creature, count = 10) => ({ creature, count })
const basic = (skill) => ({ skill, level: 'BASIC' })
const advanced = (skill) => ({ skill, level: 'ADVANCED' })
const expert = (skill) => ({ skill, level: 'EXPERT' })

const stackAt = (name, row, column) => ({ stack: name, row, column })

// Rolls for morale or luck, under the chance to take effect.
const ALWAYS = () => 0

// Hands out the rolls in turn, starting over at the end.
function rollsInTurn(...values) {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index += 1
    return value
  }
}

// The monster is one stack on row 6, column 15. Skeletons are undead, so their morale is 0, and
// monsters have no luck. With two hero stacks the first starts on row 3 and the second on row 9,
// both in column 1; with one, on row 6.
const aFight = ({ army, skills = [], monsterType = 'SKELETON', monsterCount = 100 }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aHero().withArmy(army).withSecondarySkills(skills),
      aMonster().withType(monsterType).withCount(monsterCount).withStacks(1).at(1, 0)
    )
    .withDefinitions(definitions)

// All troops of one alignment: morale +1. The Pikemen are as fast as the Skeletons and go first.
const twoPikemen = ({ skills } = {}) =>
  aFight({ army: [stack('PIKEMAN'), stack('PIKEMAN')], skills })

const FIRST_PIKEMEN = { row: 3, column: 1 }
const SECOND_PIKEMEN = stackAt('Pikemen 10', 9, 1)

// One alignment and Angels in the army: morale +2. The Archangel (speed 18) reaches the
// Skeletons from where it starts.
const anArchangel = ({ skills, monsterCount } = {}) =>
  aFight({ army: [stack('ARCHANGEL', 1)], skills, monsterCount })

async function attackSkeletonsFromTheLeft(user) {
  await attackBattleHexFrom(user, 6, 15, 'left')
}

// Pikemen, Centaurs and Imps are of three towns: morale -1. A Peasant brings a fourth (-2), and a
// Skeleton a fifth with undead in the army (-3). The Centaurs (speed 6) act first, then the Imps
// (speed 5).
const threeTowns = [stack('PIKEMAN'), stack('CENTAUR'), stack('IMP')]
const fourTowns = [...threeTowns, stack('PEASANT')]
const fiveTowns = [...fourTowns, stack('SKELETON')]

const HIGH_MORALE = (name) => `High morale enables the ${name} to attack again.`
const LOW_MORALE = (name) => `Low morale causes the ${name} to freeze in panic.`
const GOOD_LUCK = (name) => `Good luck shines on the ${name}.`

describe('battle morale and luck behavior', () => {
  describe('good morale', () => {
    test('given a stack with good morale when it attacks then it acts again', async () => {
      const { user } = await startBattle(anArchangel(), { appConfig: { moraleRandom: ALWAYS } })

      await attackSkeletonsFromTheLeft(user)

      expect(readActiveStack()).toEqual(stackAt('Archangel 1', 6, 14))
      expect(readCombatMessages().at(-1)).toBe(HIGH_MORALE('Archangel'))
    })

    test('given a stack with good morale when it moves then it acts again', async () => {
      const { user } = await startBattle(twoPikemen(), { appConfig: { moraleRandom: ALWAYS } })

      await moveActiveStackTo(user, FIRST_PIKEMEN.row, 2)

      expect(readActiveStack()).toEqual(stackAt('Pikemen 10', FIRST_PIKEMEN.row, 2))
      expect(readCombatMessages()).toEqual([HIGH_MORALE('Pikemen')])
    })

    test('given a stack with good morale when it shoots then it acts again', async () => {
      const { user } = await startBattle(aFight({ army: [stack('ARCHER'), stack('PIKEMAN')] }), {
        appConfig: { moraleRandom: ALWAYS }
      })

      await shootAt(user, 6, 15)

      expect(readActiveStack()).toEqual(stackAt('Archers 10', 3, 1))
      expect(readCombatMessages().at(-1)).toBe(HIGH_MORALE('Archers'))
    })

    // The chance is 1, 2 or 3 in 24.
    test.each([
      { morale: 1, skills: [], roll: 1 / 24 - 0.001 },
      { morale: 2, skills: [basic('LEADERSHIP')], roll: 2 / 24 - 0.001 },
      { morale: 3, skills: [advanced('LEADERSHIP')], roll: 3 / 24 - 0.001 }
    ])('given morale +$morale when the roll is under $morale in 24 then the stack acts again', async ({
      skills,
      roll
    }) => {
      const { user } = await startBattle(twoPikemen({ skills }), {
        appConfig: { moraleRandom: () => roll }
      })

      await moveActiveStackTo(user, FIRST_PIKEMEN.row, 2)

      expect(readActiveStack()).toEqual(stackAt('Pikemen 10', FIRST_PIKEMEN.row, 2))
    })

    test.each([
      { morale: 1, skills: [], roll: 1 / 24 },
      { morale: 2, skills: [basic('LEADERSHIP')], roll: 2 / 24 },
      { morale: 3, skills: [advanced('LEADERSHIP')], roll: 3 / 24 }
    ])('given morale +$morale when the roll is $morale in 24 then the next stack acts', async ({
      skills,
      roll
    }) => {
      const { user } = await startBattle(twoPikemen({ skills }), {
        appConfig: { moraleRandom: () => roll }
      })

      await moveActiveStackTo(user, FIRST_PIKEMEN.row, 2)

      expect(readActiveStack()).toEqual(SECOND_PIKEMEN)
    })

    test('given a stack with good morale when it defends then the next stack acts', async () => {
      const { user } = await startBattle(twoPikemen(), { appConfig: { moraleRandom: ALWAYS } })

      await clickBattleButton(user, 'Defend')

      expect(readActiveStack()).toEqual(SECOND_PIKEMEN)
      expect(readCombatMessages()).toEqual([])
    })

    test('given a stack acted again on good morale when it acts then the next stack acts', async () => {
      const { user } = await startBattle(twoPikemen(), { appConfig: { moraleRandom: ALWAYS } })
      await moveActiveStackTo(user, FIRST_PIKEMEN.row, 2)

      await moveActiveStackTo(user, FIRST_PIKEMEN.row, 3)

      expect(readActiveStack()).toEqual(SECOND_PIKEMEN)
    })

    // 700 Skeletons lose 19 to the Archangel's 115 damage; the 681 left strike back for 255
    // (681 x 1, -62.5% for 5 Attack against 30 Defense), more than its 250 health.
    test('given a stack with good morale when the retaliation kills it then the next stack acts', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ARCHANGEL', 1), stack('PIKEMAN')], monsterCount: 700 }),
        { appConfig: { moraleRandom: ALWAYS } }
      )

      await attackBattleHexFrom(user, 6, 15, 'top-left')

      expect(readActiveStack()).toEqual(SECOND_PIKEMEN)
      expect(readCombatMessages()).not.toContain(HIGH_MORALE('Archangel'))
    })

    // The Archangel's 115 damage kills all 10 Skeletons (60 health).
    test('given a stack with good morale when its attack wins the battle then the battle ends', async () => {
      const { user } = await startBattle(anArchangel({ monsterCount: 10 }), {
        appConfig: { moraleRandom: ALWAYS }
      })

      await attackSkeletonsFromTheLeft(user)

      expect(queryBattleResults()).toBeTruthy()
      expect(readCombatMessages()).not.toContain(HIGH_MORALE('Archangel'))
    })

    // Expert Leadership +3, two towns 0, undead in the army -1: the Pikemen have morale +2.
    test('given an undead stack in an army with good morale when it acts then the next stack acts', async () => {
      const { user } = await startBattle(
        aFight({
          army: [stack('SKELETON'), stack('PIKEMAN')],
          skills: [expert('LEADERSHIP')]
        }),
        { appConfig: { moraleRandom: ALWAYS } }
      )

      await moveActiveStackTo(user, FIRST_PIKEMEN.row, 2)

      expect(readActiveStack()).toEqual(SECOND_PIKEMEN)
    })

    // The second Pikemen's roll misses; the first Pikemen's, at the end of the round, does not.
    test('given a stack with good morale waited when it acts at the end of the round then it acts again', async () => {
      const { user } = await startBattle(twoPikemen(), {
        appConfig: { moraleRandom: rollsInTurn(0.99, 0) }
      })
      await clickBattleButton(user, 'Wait')
      await moveActiveStackTo(user, 9, 2)

      await moveActiveStackTo(user, FIRST_PIKEMEN.row, 2)

      expect(readActiveStack()).toEqual(stackAt('Pikemen 10', FIRST_PIKEMEN.row, 2))
      expect(readCombatMessages()).toEqual([HIGH_MORALE('Pikemen')])
    })

    // The hero's Skeletons have no morale; the monster's Pikemen, all of one alignment, +1.
    test('given a monster stack with good morale when it acts then it acts again', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('SKELETON')], monsterType: 'PIKEMAN', monsterCount: 10 }),
        { appConfig: { moraleRandom: ALWAYS } }
      )

      await clickBattleButton(user, 'Defend')

      expect(readCombatMessages()).toContain(HIGH_MORALE('Pikemen'))
    })
  })

  describe('bad morale', () => {
    test('given a stack with bad morale when its turn comes and it freezes then the next stack acts', async () => {
      await startBattle(aFight({ army: threeTowns }), {
        appConfig: { moraleRandom: rollsInTurn(0, 0.99) }
      })

      expect(readActiveStack().stack).toBe('Imps 10')
      expect(readCombatMessages()).toEqual([LOW_MORALE('Centaurs')])
    })

    // The chance is 2, 4 or 6 in 24.
    test.each([
      { morale: -1, army: threeTowns, roll: 2 / 24 - 0.001 },
      { morale: -2, army: fourTowns, roll: 4 / 24 - 0.001 },
      { morale: -3, army: fiveTowns, roll: 6 / 24 - 0.001 }
    ])('given morale $morale when the roll is under the chance then the stack freezes', async ({
      army,
      roll
    }) => {
      await startBattle(aFight({ army }), {
        appConfig: { moraleRandom: rollsInTurn(roll, 0.99) }
      })

      expect(readActiveStack().stack).toBe('Imps 10')
    })

    test.each([
      { morale: -1, army: threeTowns, roll: 2 / 24 },
      { morale: -2, army: fourTowns, roll: 4 / 24 },
      { morale: -3, army: fiveTowns, roll: 6 / 24 }
    ])('given morale $morale when the roll is the chance then the stack acts', async ({
      army,
      roll
    }) => {
      await startBattle(aFight({ army }), { appConfig: { moraleRandom: () => roll } })

      expect(readActiveStack().stack).toBe('Centaurs 10')
    })

    // The Centaurs act and wait; the Imps and the Pikemen freeze, the Skeletons walk. Every roll
    // after the first is under the chance.
    test('given a stack with bad morale waited when its turn comes back then it acts', async () => {
      const { user } = await startBattle(aFight({ army: threeTowns }), {
        appConfig: { moraleRandom: rollsInTurn(0.99, 0, 0, 0) }
      })

      await clickBattleButton(user, 'Wait')

      expect(readActiveStack().stack).toBe('Centaurs 10')
      expect(readCombatMessages()).toEqual([LOW_MORALE('Imps'), LOW_MORALE('Pikemen')])
    })

    // The Centaurs and the Imps freeze; the Skeletons, as slow as the monster's, act next.
    test('given an undead stack in an army with bad morale when its turn comes then it acts', async () => {
      await startBattle(aFight({ army: [stack('SKELETON'), stack('CENTAUR'), stack('IMP')] }), {
        appConfig: { moraleRandom: ALWAYS }
      })

      expect(readActiveStack().stack).toBe('Skeletons 10')
    })
  })

  describe('luck', () => {
    // 50 damage, +130% for 30 Attack against 4 Defense and +100% for luck: 165. Without luck, 115.
    test('given a stack with good luck when it strikes lucky then it does double its base damage', async () => {
      const { user } = await startBattle(anArchangel({ skills: [basic('LUCK')] }), {
        appConfig: { luckRandom: ALWAYS }
      })

      await attackSkeletonsFromTheLeft(user)

      expect(readCombatMessages().slice(0, 2)).toEqual([
        GOOD_LUCK('Archangel'),
        'The Archangel does 165 damage. 27 Skeletons perish.'
      ])
    })

    // 20 damage, +10% for 6 Attack against 4 Defense and +100% for luck, halved for the distance:
    // 21. Without luck, 11.
    test('given a shooter with good luck when it shoots lucky then it does double its base damage', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ARCHER')], skills: [basic('LUCK')] }),
        { appConfig: { luckRandom: ALWAYS } }
      )

      await shootAt(user, 6, 15)

      expect(readCombatMessages().slice(0, 2)).toEqual([
        GOOD_LUCK('Archers'),
        'The Archers do 21 damage. 3 Skeletons perish.'
      ])
    })

    // The Angel flies 12 hexes toward the Pikemen, then attacks them for 85 (+70% for 20 Attack
    // against 6 Defense with the Pikemen defending) and kills 8. The 42 left strike back for 42,
    // +100% for luck and -40% for 4 Attack against 20 Defense: 50. Without luck, 25.
    test('given a stack with good luck when it strikes back lucky then it does double its base damage', async () => {
      const { user } = await startBattle(
        aFight({
          army: [stack('PIKEMAN', 50)],
          skills: [basic('LUCK')],
          monsterType: 'ANGEL',
          monsterCount: 1
        }),
        { appConfig: { luckRandom: ALWAYS } }
      )

      await clickBattleButton(user, 'Defend')

      expect(readCombatMessages().slice(-2)).toEqual([
        GOOD_LUCK('Pikemen'),
        'The Pikemen do 50 damage.'
      ])
    })

    // The chance is 1, 2 or 3 in 24.
    test.each([
      { luck: 1, skills: [basic('LUCK')], roll: 1 / 24 - 0.001 },
      { luck: 2, skills: [advanced('LUCK')], roll: 2 / 24 - 0.001 },
      { luck: 3, skills: [expert('LUCK')], roll: 3 / 24 - 0.001 }
    ])('given luck +$luck when the roll is under $luck in 24 then the strike is lucky', async ({
      skills,
      roll
    }) => {
      const { user } = await startBattle(anArchangel({ skills }), {
        appConfig: { luckRandom: () => roll }
      })

      await attackSkeletonsFromTheLeft(user)

      expect(readCombatMessages()[0]).toBe(GOOD_LUCK('Archangel'))
    })

    test.each([
      { luck: 1, skills: [basic('LUCK')], roll: 1 / 24 },
      { luck: 2, skills: [advanced('LUCK')], roll: 2 / 24 },
      { luck: 3, skills: [expert('LUCK')], roll: 3 / 24 }
    ])('given luck +$luck when the roll is $luck in 24 then the strike is not lucky', async ({
      skills,
      roll
    }) => {
      const { user } = await startBattle(anArchangel({ skills }), {
        appConfig: { luckRandom: () => roll }
      })

      await attackSkeletonsFromTheLeft(user)

      expect(readCombatMessages()[0]).toBe('The Archangel does 115 damage. 19 Skeletons perish.')
    })

    test('given a stack with neutral luck then its strikes are never lucky', async () => {
      const { user } = await startBattle(anArchangel(), { appConfig: { luckRandom: ALWAYS } })

      await attackSkeletonsFromTheLeft(user)

      expect(readCombatMessages()[0]).toBe('The Archangel does 115 damage. 19 Skeletons perish.')
    })
  })

  describe('indicators', () => {
    test('given a stack gets good morale then the good morale picture shows over it', async () => {
      const { user } = await startBattle(twoPikemen(), { appConfig: { moraleRandom: ALWAYS } })

      await moveActiveStackTo(user, FIRST_PIKEMEN.row, 2)

      expect(readBattleEffects()).toEqual([
        { effect: 'Good morale', row: FIRST_PIKEMEN.row, column: 2 }
      ])
    })

    // With three stacks the Centaurs, second in the army, start on row 6, column 1.
    test('given a stack freezes then the bad morale picture shows over it', async () => {
      await startBattle(aFight({ army: threeTowns }), {
        appConfig: { moraleRandom: rollsInTurn(0, 0.99) }
      })

      expect(readBattleEffects()).toEqual([{ effect: 'Bad morale', row: 6, column: 1 }])
    })

    test('given a stack strikes lucky then the good luck picture shows over it', async () => {
      const { user } = await startBattle(anArchangel({ skills: [basic('LUCK')] }), {
        appConfig: { luckRandom: ALWAYS }
      })

      await attackSkeletonsFromTheLeft(user)

      // The Skeletons then attack the Archangel, which strikes back lucky too.
      expect(readBattleEffects()).toContainEqual({ effect: 'Good luck', row: 6, column: 14 })
    })

    test('given a picture shows when a second passes then it is gone', async () => {
      const { user } = await startBattle(twoPikemen(), { appConfig: { moraleRandom: ALWAYS } })
      await moveActiveStackTo(user, FIRST_PIKEMEN.row, 2)

      await waitMs(1000)

      expect(readBattleEffects()).toEqual([])
    })

    test('given a stack got good morale when the page reloads then no picture shows', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = twoPikemen()
      const first = await startBattle(scenario, { eventLog, appConfig: { moraleRandom: ALWAYS } })
      await moveActiveStackTo(first.user, FIRST_PIKEMEN.row, 2)

      await reloadBattle(scenario, { eventLog })

      expect(readBattleEffects()).toEqual([])
    })
  })

  describe('reload', () => {
    test('given a stack is acting again on good morale when the page reloads then it is still the active stack', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = twoPikemen()
      const first = await startBattle(scenario, { eventLog, appConfig: { moraleRandom: ALWAYS } })
      await moveActiveStackTo(first.user, FIRST_PIKEMEN.row, 2)

      await reloadBattle(scenario, { eventLog })

      expect(readActiveStack()).toEqual(stackAt('Pikemen 10', FIRST_PIKEMEN.row, 2))
      expect(readCombatMessages()).toEqual([HIGH_MORALE('Pikemen')])
    })

    test('given a stack froze when the page reloads then its turn stays skipped', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ army: threeTowns })
      await startBattle(scenario, { eventLog, appConfig: { moraleRandom: rollsInTurn(0, 0.99) } })

      await reloadBattle(scenario, { eventLog })

      expect(readActiveStack().stack).toBe('Imps 10')
      expect(readCombatMessages()).toEqual([LOW_MORALE('Centaurs')])
    })
  })
})
