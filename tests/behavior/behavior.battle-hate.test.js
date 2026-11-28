// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { readGameData } from './app.utils.js'
import {
  attackBattleHexFrom,
  getBattleStatusBarText,
  pointAtBattleHexSide,
  readCombatMessages,
  shootAt,
  startBattle
} from './battle.utils.js'
import { aCreatureDefinition, aHero, aMonster, aScenario } from './builders.js'

// Every creature here has 10 Attack and 10 Defense, so no Attack bonus, and 10 health.
const aCreature = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withFaction('CASTLE')
    .withAttack(10)
    .withDefense(10)
    .withHealth(10)

const CREATURES = {
  ZEALOT: aCreature('Zealot')
    .withDamage({ min: 10, max: 20 })
    .withHealth(200)
    .withSpeed(20)
    .withAbilities(['flying'])
    .withHates(['HERETIC'])
    .build(),
  INQUISITOR: aCreature('Inquisitor')
    .withDamage({ min: 10, max: 10 })
    .withShots(10)
    .withSpeed(20)
    .withAbilities(['ranged'])
    .withHates(['HERETIC'])
    .build(),
  HERETIC: aCreature('Heretic')
    .withDamage({ min: 10, max: 10 })
    .withSpeed(3)
    .withHates(['ZEALOT'])
    .build(),
  BYSTANDER: aCreature('Bystander').withDamage({ min: 10, max: 10 }).withSpeed(3).build()
}

const definitions = {
  monsters: { ...readGameData('monsters.json'), ...CREATURES },
  secondarySkills: readGameData('secondary-skills.json')
}

const stack = (creature, count = 1) => ({ creature, count })

// The monster is one stack of 10 on row 6, column 15; the hero's one stack starts on row 6,
// column 1 and is the faster.
const aFight = ({ army, monster, skills = [] }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aHero().withArmy(army).withSecondarySkills(skills),
      aMonster().withType(monster).withCount(10).withStacks(1).at(1, 0)
    )
    .withDefinitions(definitions)

const THE_MONSTER = { row: 6, column: 15 }

const attackTheMonster = (user) =>
  attackBattleHexFrom(user, THE_MONSTER.row, THE_MONSTER.column, 'left')

const ALWAYS = () => 0

describe('battle hate behavior', () => {
  test('given a creature attacks a creature it hates then it does 50% more base damage', async () => {
    const { user } = await startBattle(aFight({ army: [stack('ZEALOT')], monster: 'HERETIC' }))

    await attackTheMonster(user)

    expect(readCombatMessages()[0]).toBe('The Zealot does 15 damage. One Heretic perishes.')
  })

  test('given a creature attacks a creature it does not hate then the damage is as usual', async () => {
    const { user } = await startBattle(aFight({ army: [stack('ZEALOT')], monster: 'BYSTANDER' }))

    await attackTheMonster(user)

    expect(readCombatMessages()[0]).toBe('The Zealot does 10 damage. One Bystander perishes.')
  })

  // The 9 Heretics left strike back for 9 × 10 = 90, +50%.
  test('given a creature strikes back at a creature it hates then its retaliation does 50% more base damage', async () => {
    const { user } = await startBattle(aFight({ army: [stack('ZEALOT')], monster: 'HERETIC' }))

    await attackTheMonster(user)

    expect(readCombatMessages()[1]).toBe('The Heretics do 135 damage.')
  })

  // 10, +50%, halved for the distance: 7.
  test('given a shooter shoots a creature it hates then the shot does 50% more base damage', async () => {
    const { user } = await startBattle(aFight({ army: [stack('INQUISITOR')], monster: 'HERETIC' }))

    await shootAt(user, THE_MONSTER.row, THE_MONSTER.column)

    expect(readCombatMessages()[0]).toBe('The Inquisitor does 7 damage.')
  })

  // 10, +100% for luck and +50% for hate: 25.
  test('given a lucky strike on a creature it hates then both bonuses add up', async () => {
    const { user } = await startBattle(
      aFight({
        army: [stack('ZEALOT')],
        monster: 'HERETIC',
        skills: [{ skill: 'LUCK', level: 'BASIC' }]
      }),
      { appConfig: { luckRandom: ALWAYS } }
    )

    await attackTheMonster(user)

    expect(readCombatMessages()[1]).toBe('The Zealot does 25 damage. 2 Heretics perish.')
  })

  test('when the player points at a creature the stack hates then the status bar damage includes the hate', async () => {
    const { user } = await startBattle(aFight({ army: [stack('ZEALOT')], monster: 'HERETIC' }))

    await pointAtBattleHexSide(user, THE_MONSTER.row, THE_MONSTER.column, 'left')

    expect(getBattleStatusBarText()).toBe('Attack Heretics (damage 15-30)')
  })
})
