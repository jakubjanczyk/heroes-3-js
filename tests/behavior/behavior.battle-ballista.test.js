// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { createMemoryEventLog, readGameData, waitMs } from './app.utils.js'
import {
  attackBattleHexFrom,
  castSpellAt,
  clickBattleButton,
  getBattleStatusBarText,
  hoverBattleHex,
  moveActiveStackTo,
  readActiveStack,
  readBattleStacks,
  readCombatMessages,
  reloadBattle,
  shootAt,
  startBattle
} from './battle.utils.js'
import {
  aCreatureDefinition,
  aHero,
  aMonster,
  aScenario,
  aWarMachineDefinition
} from './builders.js'

const aSturdyCreature = (name, plural = `${name}s`) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(plural)
    .withAttack(0)
    .withDefense(4)
    .withDamage({ min: 1, max: 1 })
    .withHealth(1000)

const aShooter = (name, plural) =>
  aSturdyCreature(name, plural).withShots(99).withAbilities(['ranged'])

const PAWN = aSturdyCreature('Pawn').withSpeed(5).build()
const FLYER = aSturdyCreature('Flyer').withSpeed(20).withAbilities(['flying']).build()
const KILLER = aSturdyCreature('Killer')
  .withSpeed(20)
  .withAttack(50)
  .withDamage({ min: 100, max: 100 })
  .build()
const CHARGER = aSturdyCreature('Charger').withSpeed(20).build()
const TARGET = aShooter('Target').withSpeed(2).withHealth(1).withAiValue(10).build()
const PEBBLE = aShooter('Pebble').withSpeed(2).withHealth(1).withAiValue(1).build()
const GEM = aShooter('Gem').withSpeed(2).withHealth(1).withAiValue(1000).build()

const HERO_ATTACK = 4

const TEST_BALLISTA = aCreatureDefinition()
  .withName('Ballista')
  .withNamePlural('Ballistas')
  .withAttack(0)
  .withDefense(10)
  .withDamage({ min: 2, max: 3 })
  .withHealth(250)
  .withSpeed(0)
  .withAbilities(['warMachine', 'doubleWide', 'ranged', 'unlimitedShots', 'damageTimesHeroAttack'])
  .withControlledBy({
    skill: 'ARTILLERY',
    shotsPerTurn: [1, 1, 2, 2],
    doubleDamageChance: [0, 50, 75, 100]
  })
  .build()

const TEST_AMMO_CART = aCreatureDefinition()
  .withName('Ammo Cart')
  .withNamePlural('Ammo Carts')
  .withAttack(0)
  .withDefense(4)
  .withDamage({ min: 0, max: 0 })
  .withHealth(1000)
  .withSpeed(0)
  .withAbilities(['warMachine'])
  .build()

const BALLISTA = 'BALLISTA'
const AMMO_CART = 'AMMO_CART'

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  spells: readGameData('spells.json'),
  heroes: readGameData('heroes.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json'),
  monsters: {
    ...readGameData('monsters.json'),
    PAWN,
    FLYER,
    KILLER,
    CHARGER,
    TARGET,
    PEBBLE,
    GEM,
    TEST_BALLISTA,
    TEST_AMMO_CART
  },
  artifacts: {
    [BALLISTA]: aWarMachineDefinition()
      .withName('Ballista')
      .withSlot('BALLISTA')
      .withCreature('TEST_BALLISTA')
      .build(),
    [AMMO_CART]: aWarMachineDefinition()
      .withName('Ammo Cart')
      .withSlot('AMMO_CART')
      .withCreature('TEST_AMMO_CART')
      .build()
  }
}

const stack = (creature, count = 1) => ({ creature, count })

const SKILLS = { attack: HERO_ATTACK, defense: 0, power: 1, knowledge: 10 }
const ARTILLERY = (level) => [{ skill: 'ARTILLERY', level }]

const OWN_BALLISTA = { row: 4, column: 1 }
const ENEMY_STACK = { row: 6, column: 15 }
const NEXT_TO_THE_ENEMY_BALLISTA = { row: 4, column: 14 }

const aRedHero = ({ army = [stack('PAWN')], warMachines = [BALLISTA], skills = [] } = {}) =>
  aHero()
    .withName('Lord Haart')
    .withPrimarySkills(SKILLS)
    .withSecondarySkills(skills)
    .withSpellBook(true)
    .withSpells(['MAGIC_ARROW'])
    .withArmy(army)
    .withArtifacts(warMachines)

const aBlueHero = ({ army = [stack('TARGET', 100)], warMachines = [] } = {}) =>
  aHero()
    .withId('hero-2')
    .withName('Valeska')
    .ownedBy('blue')
    .withPrimarySkills(SKILLS)
    .withArmy(army)
    .withArtifacts(warMachines)

const aFightWithTargets = ({ hero = aRedHero(), monster = 'TARGET', count = 100 } = {}) =>
  aScenario()
    .withSize(3)
    .withEntities(
      hero.at(0, 0),
      aMonster().withType(monster).withCount(count).withStacks(1).at(1, 0)
    )
    .withDefinitions(definitions)

const aFightWithAHero = ({ hero = aRedHero({ warMachines: [] }), enemy }) =>
  aScenario()
    .withSize(3, 3)
    .withEntities(hero.at(0, 0), enemy.at(1, 0))
    .withDefinitions(definitions)

const NEVER_DOUBLED = 0.99

const fight = (scenario, options) =>
  startBattle(scenario, {
    battleStepDelayMs: 0,
    appConfig: { abilityRandom: () => NEVER_DOUBLED },
    ...options
  })

const withAbilityRoll = (roll) => ({ appConfig: { abilityRandom: () => roll } })

const stackOf = (name) => readBattleStacks().find(({ stack }) => stack.startsWith(name))

const ballistaLines = () =>
  readCombatMessages().filter((message) => message.startsWith('The Ballista does'))

async function defend(user) {
  await clickBattleButton(user, 'Defend')
  await waitMs(1000)
}

async function waitTurn(user) {
  await clickBattleButton(user, 'Wait')
  await waitMs(1000)
}

async function shootStackOf(user, name) {
  const { row, column } = stackOf(name)
  await shootAt(user, row, column)
  await waitMs(1000)
}

describe('the Ballista in battle behavior', () => {
  describe('its turn', () => {
    test("without Artillery, the hero's Ballista shoots by itself after every creature has acted, and the log says the damage", async () => {
      const { user } = await fight(aFightWithTargets())

      await defend(user)

      expect(readCombatMessages().at(-1)).toBe('The Ballista does 5 damage. 5 Targets perish.')
    })

    test("the Ballista's turn comes after the stacks that didn't wait and before the ones that waited", async () => {
      const { user } = await fight(aFightWithTargets())

      await waitTurn(user)

      expect(ballistaLines()).toEqual(['The Ballista does 5 damage. 5 Targets perish.'])
      expect(readActiveStack()).toEqual({ stack: 'Pawn 1', row: 6, column: 1 })
    })

    test('an enemy stack next to the Ballista does not stop it shooting', async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero({ army: [stack('FLYER')], warMachines: [] }),
          enemy: aBlueHero({ warMachines: [BALLISTA] })
        })
      )

      await moveActiveStackTo(
        user,
        NEXT_TO_THE_ENEMY_BALLISTA.row,
        NEXT_TO_THE_ENEMY_BALLISTA.column
      )
      await waitMs(1000)

      expect(ballistaLines()).toEqual(['The Ballista does 10 damage.'])
    })

    test("aiming itself, it shoots the enemy's creature rather than their war machine", async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero(),
          enemy: aBlueHero({ warMachines: [AMMO_CART] })
        })
      )

      await defend(user)

      expect(ballistaLines()).toEqual(['The Ballista does 5 damage. 5 Targets perish.'])
    })

    test('aiming itself, it shoots the stack it takes the most worth from', async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero(),
          enemy: aBlueHero({ army: [stack('PEBBLE', 100), stack('GEM', 100)] })
        })
      )

      await defend(user)

      expect(ballistaLines()).toEqual(['The Ballista does 5 damage. 5 Gems perish.'])
    })

    test("the enemy hero's Ballista shoots at the player's stacks", async () => {
      const { user } = await fight(
        aFightWithAHero({ enemy: aBlueHero({ warMachines: [BALLISTA] }) })
      )

      await moveActiveStackTo(user, 6, 2)
      await waitMs(1000)

      expect(ballistaLines()).toEqual(['The Ballista does 5 damage.'])
    })

    test('a destroyed Ballista no longer shoots', async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero({ army: [stack('KILLER', 10)], warMachines: [] }),
          enemy: aBlueHero({ warMachines: [BALLISTA] })
        })
      )
      const { row, column } = stackOf('Ballista')

      await attackBattleHexFrom(user, row, column, 'left')
      await waitMs(1000)

      expect(readCombatMessages()).toContain('The Ballista is destroyed.')
      expect(ballistaLines()).toEqual([])
    })

    test("after a reload, the Ballista's shot keeps its losses and the round goes on from the next turn", async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFightWithTargets()
      const { user } = await fight(scenario, { eventLog })
      await defend(user)

      await reloadBattle(scenario, { eventLog })

      expect(stackOf('Target')).toEqual({ stack: 'Targets 95', ...ENEMY_STACK })
      expect(readActiveStack()).toEqual({ stack: 'Pawn 1', row: 6, column: 1 })
    })
  })

  describe('with Artillery', () => {
    const anArtilleryFight = (level = 'BASIC', options = {}) =>
      aFightWithTargets({ hero: aRedHero({ skills: ARTILLERY(level) }), ...options })

    test("the Ballista's turn waits for the player, the Ballista the active stack", async () => {
      const { user } = await fight(anArtilleryFight())

      await defend(user)

      expect(readActiveStack()).toEqual({ stack: 'Ballista 1', ...OWN_BALLISTA })
    })

    test("clicking an enemy stack on the Ballista's turn shoots it", async () => {
      const { user } = await fight(anArtilleryFight())
      await defend(user)

      await shootStackOf(user, 'Target')

      expect(ballistaLines()).toEqual(['The Ballista does 5 damage. 5 Targets perish.'])
    })

    test("hovering a near enemy shows the shot's damage: 2 to 3 times the hero's Attack plus one", async () => {
      const { user } = await fight(anArtilleryFight('BASIC', { monster: 'CHARGER', count: 1 }))
      await defend(user)
      const { row, column } = stackOf('Charger')

      await hoverBattleHex(user, row, column)

      expect(getBattleStatusBarText()).toBe('Shoot Charger (damage 10-15)')
    })

    test('a shot at a stack more than 10 hexes away does half damage, and the status bar shows the halved range', async () => {
      const { user } = await fight(anArtilleryFight())
      await defend(user)
      await hoverBattleHex(user, ENEMY_STACK.row, ENEMY_STACK.column)
      const statusBar = getBattleStatusBarText()

      await shootStackOf(user, 'Target')

      expect(statusBar).toBe('Shoot Targets (damage 5-7)')
      expect(ballistaLines()).toEqual(['The Ballista does 5 damage. 5 Targets perish.'])
    })

    test("the hero casts a spell on the Ballista's turn, then the Ballista shoots", async () => {
      const { user } = await fight(anArtilleryFight())
      await defend(user)
      await castSpellAt(user, 'Magic Arrow', ENEMY_STACK)
      await waitMs(1000)

      await shootStackOf(user, 'Target')

      expect(readCombatMessages()).toContain("Lord Haart casts 'Magic Arrow' on the Targets.")
      expect(ballistaLines()).toHaveLength(1)
    })

    test("Wait on the Ballista's turn brings it back first among the stacks that waited", async () => {
      const { user } = await fight(anArtilleryFight())
      await waitTurn(user)

      await waitTurn(user)

      expect(readActiveStack()).toEqual({ stack: 'Ballista 1', ...OWN_BALLISTA })
    })

    test("Defend passes the Ballista's turn", async () => {
      const { user } = await fight(anArtilleryFight())
      await defend(user)

      await defend(user)

      expect(ballistaLines()).toEqual([])
      expect(readActiveStack()).toEqual({ stack: 'Pawn 1', row: 6, column: 1 })
    })

    test.each([
      ['BASIC', 0.49, 'The Ballista does 10 damage. 10 Targets perish.'],
      ['BASIC', 0.5, 'The Ballista does 5 damage. 5 Targets perish.'],
      ['ADVANCED', 0.74, 'The Ballista does 10 damage. 10 Targets perish.'],
      ['EXPERT', 0.99, 'The Ballista does 10 damage. 10 Targets perish.']
    ])('with %s Artillery, a roll of %s gives the shot: %s', async (level, roll, line) => {
      const { user } = await fight(anArtilleryFight(level), withAbilityRoll(roll))
      await defend(user)

      await shootStackOf(user, 'Target')

      expect(ballistaLines()[0]).toBe(line)
    })

    test('from Advanced Artillery, the Ballista shoots twice at its target', async () => {
      const { user } = await fight(anArtilleryFight('ADVANCED'))
      await defend(user)

      await shootStackOf(user, 'Target')

      expect(ballistaLines()).toEqual([
        'The Ballista does 5 damage. 5 Targets perish.',
        'The Ballista does 5 damage. 5 Targets perish.'
      ])
    })

    test('in Auto combat the Ballista aims itself', async () => {
      const { user } = await fight(anArtilleryFight())

      await clickBattleButton(user, 'Auto combat')
      await waitMs(1000)

      expect(ballistaLines()[0]).toBe('The Ballista does 5 damage. 5 Targets perish.')
    })
  })
})
