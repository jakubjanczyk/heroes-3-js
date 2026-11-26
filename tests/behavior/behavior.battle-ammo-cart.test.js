// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { createMemoryEventLog, waitMs } from './app.utils.js'
import {
  castSpellAt,
  clickBattleButton,
  getBattleStatusBarText,
  hoverBattleHex,
  playOnToNextRound,
  readBattleStacks,
  readCombatMessages,
  reloadBattle,
  shootAt,
  startBattle
} from './battle.utils.js'
import {
  aCaster,
  aFightWithAHero,
  CONTROL_SPELLS,
  stack
} from './battle-lasting-spells.fixtures.js'
import { aCreatureDefinition, aHero, aWarMachineDefinition } from './builders.js'

const aSturdyCreature = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(0)
    .withDamage({ min: 1, max: 1 })
    .withHealth(1000)

const aShooter = (name, shots) =>
  aSturdyCreature(name).withSpeed(5).withShots(shots).withAbilities(['ranged'])

const aTwinShooter = (name, shots) =>
  aSturdyCreature(name).withSpeed(5).withShots(shots).withAbilities(['ranged', 'shootsTwice'])

const aSniper = (shots) =>
  aCreatureDefinition()
    .withName('Sniper')
    .withNamePlural('Snipers')
    .withAttack(0)
    .withDefense(0)
    .withDamage({ min: 20, max: 20 })
    .withHealth(10)
    .withSpeed(3)
    .withShots(shots)
    .withAbilities(['ranged'])

const creatures = {
  ARCHER: aShooter('Archer', 12).build(),
  LONE_SHOT: aShooter('Lone Shot', 1).build(),
  TWIN: aTwinShooter('Twin', 24).build(),
  LONE_TWIN: aTwinShooter('Lone Twin', 1).build(),
  BRUTE: aSturdyCreature('Brute').withSpeed(1).build(),
  SNIPER: aSniper(12).build(),
  LONE_SNIPER: aSniper(1).build(),
  TEST_AMMO_CART: aCreatureDefinition()
    .withName('Ammo Cart')
    .withNamePlural('Ammo Carts')
    .withAttack(0)
    .withDefense(0)
    .withDamage({ min: 0, max: 0 })
    .withHealth(9)
    .withSpeed(0)
    .withAbilities(['warMachine', 'suppliesShots'])
    .build()
}

const AMMO_CART = 'AMMO_CART'

const artifacts = {
  [AMMO_CART]: aWarMachineDefinition()
    .withName('Ammo Cart')
    .withSlot('AMMO_CART')
    .withCreature('TEST_AMMO_CART')
    .build()
}

const ENEMY_BOTTOM_STACK = { row: 9, column: 15 }

const aRedHero = ({ army, warMachines = [] }) =>
  aCaster({ army, spells: CONTROL_SPELLS, artifacts: warMachines })

const aBlueHero = ({ army = [stack('BRUTE', 10)], warMachines = [] } = {}) =>
  aHero()
    .withId('hero-2')
    .withName('Valeska')
    .ownedBy('blue')
    .withPrimarySkills({ attack: 0, defense: 0, power: 1, knowledge: 1 })
    .withArmy(army)
    .withArtifacts(warMachines)

const aFight = ({ hero, enemy = aBlueHero() }) =>
  aFightWithAHero({ hero, enemy, creatures, artifacts })

const fight = (scenario, options) => startBattle(scenario, { battleStepDelayMs: 0, ...options })

const aSniperAgainstTheCart = () =>
  aFight({
    hero: aRedHero({ army: [stack('ARCHER', 10)], warMachines: [AMMO_CART] }),
    enemy: aBlueHero({ army: [stack('SNIPER', 1), stack('BRUTE', 10)] })
  })

async function shootTwiceWithTheCartDestroyedBetween(user) {
  await shootTheBrutes(user)
  await shootTheBrutes(user)
}

const theBrutes = () => readBattleStacks().find(({ stack }) => stack.startsWith('Brutes'))

async function hoverTheBrutes(user) {
  const { row, column } = theBrutes()
  await hoverBattleHex(user, row, column)
}

async function shootTheBrutes(user) {
  const { row, column } = theBrutes()
  await shootAt(user, row, column)
  await waitMs(1000)
}

const shotsBy = (name) =>
  readCombatMessages().filter((message) => message.startsWith(`The ${name} do`))

describe('battle Ammo Cart behavior', () => {
  describe("the hero's shooters while the hero's Ammo Cart stands", () => {
    test('given the hero has an Ammo Cart when their shooter shoots then it still has 12 shots left', async () => {
      const { user } = await fight(
        aFight({ hero: aRedHero({ army: [stack('ARCHER', 10)], warMachines: [AMMO_CART] }) })
      )
      await shootTheBrutes(user)

      await hoverTheBrutes(user)

      expect(getBattleStatusBarText()).toBe('Shoot Brutes (12 shots left, damage 5)')
    })

    test('given the hero has an Ammo Cart when shooters that shoot twice shoot then they still have 24 shots left', async () => {
      const { user } = await fight(
        aFight({ hero: aRedHero({ army: [stack('TWIN', 10)], warMachines: [AMMO_CART] }) })
      )
      await shootTheBrutes(user)

      await hoverTheBrutes(user)

      expect(getBattleStatusBarText()).toBe('Shoot Brutes (24 shots left, damage 5)')
    })

    test('given the hero has an Ammo Cart then a shooter with one shot shoots again on its next turn, not hand to hand', async () => {
      const { user } = await fight(
        aFight({ hero: aRedHero({ army: [stack('LONE_SHOT', 10)], warMachines: [AMMO_CART] }) })
      )
      await shootTheBrutes(user)

      await hoverTheBrutes(user)

      expect(getBattleStatusBarText()).toBe('Shoot Brutes (1 shot left, damage 5)')
    })

    test('given the hero has an Ammo Cart then a shooter with one shot left that shoots twice shoots both times', async () => {
      const { user } = await fight(
        aFight({ hero: aRedHero({ army: [stack('LONE_TWIN', 10)], warMachines: [AMMO_CART] }) })
      )

      await shootTheBrutes(user)

      expect(shotsBy('Lone Twins')).toEqual([
        'The Lone Twins do 5 damage.',
        'The Lone Twins do 5 damage.'
      ])
    })
  })

  describe('once the Ammo Cart is destroyed', () => {
    test('given the enemy destroys the hero’s Ammo Cart when the shooter shoots then it has one shot fewer than before', async () => {
      const { user } = await fight(aSniperAgainstTheCart())
      await shootTwiceWithTheCartDestroyedBetween(user)

      await hoverTheBrutes(user)

      expect(getBattleStatusBarText()).toBe('Shoot Brutes (11 shots left, damage 5)')
    })

    test('given the shooter shot while the cart stood and the cart was then destroyed, when the page reloads then the shots left are the same', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aSniperAgainstTheCart()
      const { user: firstUser } = await fight(scenario, { eventLog })
      await shootTwiceWithTheCartDestroyedBetween(firstUser)

      const { user } = await reloadBattle(scenario, { eventLog })
      await hoverTheBrutes(user)

      expect(getBattleStatusBarText()).toBe('Shoot Brutes (11 shots left, damage 5)')
    })
  })

  describe('whose shooters', () => {
    test('given only the enemy hero has an Ammo Cart when the hero’s shooter shoots then it has one shot fewer', async () => {
      const { user } = await fight(
        aFight({
          hero: aRedHero({ army: [stack('ARCHER', 10)] }),
          enemy: aBlueHero({ warMachines: [AMMO_CART] })
        })
      )
      await shootTheBrutes(user)

      await hoverTheBrutes(user)

      expect(getBattleStatusBarText()).toBe('Shoot Brutes (11 shots left, damage 5)')
    })

    test('given the enemy hero has an Ammo Cart then their shooter with one shot shoots again on its next turn', async () => {
      const { user } = await fight(
        aFight({
          hero: aRedHero({ army: [stack('ARCHER', 10)] }),
          enemy: aBlueHero({
            army: [stack('LONE_SNIPER', 1), stack('BRUTE', 10)],
            warMachines: [AMMO_CART]
          })
        })
      )
      await playOnToNextRound(user)

      await playOnToNextRound(user)

      expect(shotsBy('Sniper')).toHaveLength(2)
    })
  })

  describe('a hypnotized shooter', () => {
    async function hypnotizeTheSniperAndShootWithIt(user) {
      await castSpellAt(user, 'Hypnotize', ENEMY_BOTTOM_STACK)
      await clickBattleButton(user, 'Defend')
      await waitMs(1000)
      await shootTheBrutes(user)
      await clickBattleButton(user, 'Defend')
      await waitMs(1000)
    }

    test('given the enemy hero has an Ammo Cart when the Sniper the hero hypnotized shoots then it still has 12 shots left', async () => {
      const { user } = await fight(
        aFight({
          hero: aRedHero({ army: [stack('ARCHER', 10)] }),
          enemy: aBlueHero({
            army: [stack('BRUTE', 10), stack('SNIPER', 1)],
            warMachines: [AMMO_CART]
          })
        })
      )
      await hypnotizeTheSniperAndShootWithIt(user)

      await hoverTheBrutes(user)

      expect(getBattleStatusBarText()).toBe('Shoot Brutes (12 shots left, damage 20)')
    })

    test('given only the hero has an Ammo Cart when the Sniper the hero hypnotized shoots then it has one shot fewer', async () => {
      const { user } = await fight(
        aFight({
          hero: aRedHero({ army: [stack('ARCHER', 10)], warMachines: [AMMO_CART] }),
          enemy: aBlueHero({ army: [stack('BRUTE', 10), stack('SNIPER', 1)] })
        })
      )
      await hypnotizeTheSniperAndShootWithIt(user)

      await hoverTheBrutes(user)

      expect(getBattleStatusBarText()).toBe('Shoot Brutes (11 shots left, damage 20)')
    })
  })
})
