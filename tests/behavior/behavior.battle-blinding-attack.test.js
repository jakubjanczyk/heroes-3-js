// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, waitMs } from './app.utils.js'
import {
  attackBattleHexFrom,
  clickBattleButton,
  moveActiveStackTo,
  playOnToNextRound,
  readBattleStacks,
  readCombatMessages,
  reloadBattle,
  startBattle
} from './battle.utils.js'
import {
  aCaster,
  aFight,
  ENEMY_HEX,
  PIKEMEN_CLOSE_BY,
  stack
} from './battle-lasting-spells.fixtures.js'
import { aCreatureDefinition } from './builders.js'

const BASIC_BLIND_FOR_THREE_ROUNDS = { spell: 'BLIND', chance: 20, rounds: 3, skill: 1 }

const aBlinder = ({ name = 'Blinder', speed = 20 } = {}) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withSpeed(speed)
    .withHealth(100)
    .withSpellAfterAttack(BASIC_BLIND_FOR_THREE_ROUNDS)
    .build()

const CREATURES = {
  BLINDER: aBlinder(),
  SLOW_BLINDER: aBlinder({ name: 'Slow Blinder', speed: 4 }),
  RESISTER: aCreatureDefinition()
    .withName('Resister')
    .withNamePlural('Resisters')
    .withMagicResistance(20)
    .build(),
  GOLEM: aCreatureDefinition()
    .withName('Golem')
    .withNamePlural('Golems')
    .withSpellLevelImmunity(3)
    .build()
}

const aBlindingFight = ({ monster = 'PIKEMAN', count = 50, stacks = 1, blinders = 5 } = {}) =>
  aFight({
    hero: aCaster({ army: [stack('BLINDER', blinders)] }),
    monster,
    count,
    stacks,
    creatures: CREATURES
  })

const aFightAgainstBlinders = () =>
  aFight({ monster: 'SLOW_BLINDER', count: 5, creatures: CREATURES })

const BLINDS = () => 0.199
const MISSES = () => 0.2
const NEVER = () => 0.99

const startBlinding = (scenario, abilityRandom, { resistanceRandom = NEVER, eventLog } = {}) =>
  startBattle(scenario, { eventLog, appConfig: { abilityRandom, resistanceRandom } })

async function attackThePikemen(user) {
  await attackBattleHexFrom(user, ENEMY_HEX.row, ENEMY_HEX.column, 'left')
  await waitMs(1000)
}

const PIKEMEN_CANNOT_SEE = 'The Pikemen cannot see!'
const HALF_OF_THE_46_A_STRIKE_BACK_DOES = 23

const pikemenHits = () =>
  readCombatMessages().filter((message) => message.startsWith('The Pikemen do'))

const stackNamed = (name) => readBattleStacks().find(({ stack }) => stack.startsWith(`${name} `))

describe('battle blinding attack behavior', () => {
  test("given the player's Blinders hit the Pikemen when the roll is under 20% then the combat log says the Pikemen cannot see", async () => {
    const { user } = await startBlinding(aBlindingFight(), BLINDS)

    await attackThePikemen(user)

    expect(readCombatMessages()).toContain(PIKEMEN_CANNOT_SEE)
  })

  test("given the player's Blinders hit the Pikemen when the roll is 20% then the log has no blinding line and the Pikemen take their turn", async () => {
    const { user } = await startBlinding(aBlindingFight(), MISSES)

    await attackThePikemen(user)

    expect(readCombatMessages()).not.toContain(PIKEMEN_CANNOT_SEE)
    expect(pikemenHits()).toHaveLength(2)
  })

  test('given the Swordsmen attack the Blinders and are struck back when the roll is under 20% then the Swordsmen cannot see', async () => {
    const { user } = await startBlinding(aFightAgainstBlinders(), BLINDS)
    await moveActiveStackTo(user, 6, 5)
    await waitMs(1000)

    await attackBattleHexFrom(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column, 'left')

    expect(readCombatMessages()).toContain('The Swordsmen cannot see!')
  })

  test("given the Blinders' hit kills the whole stack then the log has no blinding line", async () => {
    const { user } = await startBlinding(
      aBlindingFight({ count: 2, stacks: 2, blinders: 20 }),
      BLINDS
    )

    await attackBattleHexFrom(user, 3, 15, 'left')
    await waitMs(1000)

    expect(readCombatMessages()).not.toContain(PIKEMEN_CANNOT_SEE)
  })

  test('given the Blinders blinded the Pikemen then the Pikemen lose their turns for three rounds and take their turn in the fourth', async () => {
    const { user } = await startBlinding(aBlindingFight(), BLINDS)
    await attackThePikemen(user)

    await playOnToNextRound(user)
    await playOnToNextRound(user)
    const hitsInTheThreeRounds = pikemenHits().length
    await playOnToNextRound(user)

    expect(hitsInTheThreeRounds).toBe(1)
    expect(pikemenHits()).toHaveLength(2)
  })

  test("given the Blinders' hit blinds the Pikemen then the Pikemen strike back at the Blinders for half damage", async () => {
    const { user } = await startBlinding(aBlindingFight(), BLINDS)

    await attackThePikemen(user)

    expect(pikemenHits()[0]).toBe(`The Pikemen do ${HALF_OF_THE_46_A_STRIKE_BACK_DOES} damage.`)
  })

  test.each([
    { monster: 'SKELETON', immunity: 'immune to mind spells', name: 'Skeletons' },
    { monster: 'GOLEM', immunity: 'immune to spells of levels 1-3', name: 'Golems' }
  ])('given the Blinders hit a stack $immunity then it does not go blind', async ({
    monster,
    name
  }) => {
    const { user } = await startBlinding(aBlindingFight({ monster, count: 20 }), BLINDS)

    await attackThePikemen(user)

    expect(readCombatMessages()).not.toContain(`The ${name} cannot see!`)
  })

  test('given the Blinders hit Resisters when the resistance roll succeeds then the Resisters do not go blind', async () => {
    const { user } = await startBlinding(
      aBlindingFight({ monster: 'RESISTER', count: 20 }),
      BLINDS,
      {
        resistanceRandom: () => 0
      }
    )

    await attackThePikemen(user)

    expect(readCombatMessages()).not.toContain('The Resisters cannot see!')
  })

  test('given the Blinders blinded the Pikemen when the page reloads then the Pikemen still lose their turn', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aBlindingFight()
    const { user } = await startBlinding(scenario, BLINDS, { eventLog })
    await attackThePikemen(user)
    const blinders = stackNamed('Blinders')

    await reloadBattle(scenario, { eventLog })
    await clickBattleButton(user, 'Defend')
    await waitMs(1000)

    expect(stackNamed('Blinders')).toEqual(blinders)
  })
})
