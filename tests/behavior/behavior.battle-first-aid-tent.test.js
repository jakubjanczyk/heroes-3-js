// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { createMemoryEventLog, getCursorOver, readGameData, waitMs } from './app.utils.js'
import {
  attackBattleHexFrom,
  castSpellAt,
  clickBattleButton,
  clickBattleHex,
  getBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
  readActiveStack,
  readBattleEffects,
  readBattleStacks,
  readCombatMessages,
  reloadBattle,
  shootAt,
  startBattle,
  startBattleWithStyles
} from './battle.utils.js'
import {
  aCreatureDefinition,
  aHero,
  aMonster,
  aScenario,
  aWarMachineDefinition
} from './builders.js'

const aSteadyCreature = (name, plural = `${name}s`) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(plural)
    .withAttack(0)
    .withDefense(0)
    .withDamage({ min: 1, max: 1 })
    .withSpeed(5)

const PATIENT = aSteadyCreature('Patient').withHealth(200).build()
const SQUIRE = aSteadyCreature('Squire').withHealth(200).build()
const PAGE = aSteadyCreature('Page').withHealth(200).build()
const SMALL_PATIENT = aSteadyCreature('Small Patient').withHealth(100).withSpeed(15).build()
const SNIPER = aSteadyCreature('Sniper')
  .withHealth(1000)
  .withSpeed(10)
  .withShots(99)
  .withAbilities(['ranged'])
  .build()
const KILLER = aSteadyCreature('Killer')
  .withHealth(1000)
  .withSpeed(20)
  .withAttack(50)
  .withDamage({ min: 1000, max: 1000 })
  .build()

const TEST_TENT = aCreatureDefinition()
  .withName('First Aid Tent')
  .withNamePlural('First Aid Tents')
  .withAttack(0)
  .withDefense(0)
  .withDamage({ min: 0, max: 0 })
  .withHealth(75)
  .withSpeed(0)
  .withAbilities(['warMachine', 'doubleWide', 'heals'])
  .withControlledBy({ skill: 'FIRST_AID', healing: [25, 50, 75, 100] })
  .build()

const TENT = 'FIRST_AID_TENT'
const BALLISTA = 'BALLISTA'

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
    PATIENT,
    SQUIRE,
    PAGE,
    SMALL_PATIENT,
    SNIPER,
    KILLER,
    TEST_TENT
  },
  artifacts: {
    [TENT]: aWarMachineDefinition()
      .withName('First Aid Tent')
      .withSlot('FIRST_AID_TENT')
      .withCreature('TEST_TENT')
      .build(),
    [BALLISTA]: aWarMachineDefinition()
      .withName('Ballista')
      .withSlot('BALLISTA')
      .withCreature('BALLISTA')
      .build()
  }
}

const stack = (creature, count = 1) => ({ creature, count })

const SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 10 }
const FIRST_AID = (level) => [{ skill: 'FIRST_AID', level }]

const OWN_STACK = { row: 6, column: 1 }
const OWN_TENT = { row: 10, column: 1 }
const ENEMY_STACK = { row: 6, column: 15 }

const aRedHero = ({ army = [stack('PATIENT')], warMachines = [TENT], skills = [] } = {}) =>
  aHero()
    .withName('Lord Haart')
    .withPrimarySkills(SKILLS)
    .withSecondarySkills(skills)
    .withSpellBook(true)
    .withSpells(['MAGIC_ARROW'])
    .withArmy(army)
    .withArtifacts(warMachines)

const aBlueHero = ({ army, warMachines = [] }) =>
  aHero()
    .withId('hero-2')
    .withName('Valeska')
    .ownedBy('blue')
    .withPrimarySkills(SKILLS)
    .withArmy(army)
    .withArtifacts(warMachines)

const aFightWithSnipers = ({ hero = aRedHero(), count = 60, monster = 'SNIPER' } = {}) =>
  aScenario()
    .withSize(3)
    .withEntities(
      hero.at(0, 0),
      aMonster().withType(monster).withCount(count).withStacks(1).at(1, 0)
    )
    .withDefinitions(definitions)

const aFightWithAHero = ({ hero = aRedHero(), enemy }) =>
  aScenario()
    .withSize(3, 3)
    .withEntities(hero.at(0, 0), enemy.at(1, 0))
    .withDefinitions(definitions)

const HIGHEST_ROLLS = () => 0.99

const fight = (scenario, options) =>
  startBattle(scenario, { battleStepDelayMs: 0, random: HIGHEST_ROLLS, ...options })

const stackOf = (name) => readBattleStacks().find(({ stack }) => stack.startsWith(name))

const tentLines = () =>
  readCombatMessages().filter((message) => message.startsWith('The First Aid Tent heals'))

async function defend(user) {
  await clickBattleButton(user, 'Defend')
  await waitMs(1000)
}

async function waitTurn(user) {
  await clickBattleButton(user, 'Wait')
  await waitMs(1000)
}

async function healStackOn(user, { row, column }) {
  await clickBattleHex(user, row, column)
  await waitMs(1000)
}

describe('the First Aid Tent in battle behavior', () => {
  describe('its turn', () => {
    test("without First Aid, the hero's tent heals the wounded stack by itself at the end of the round, and the log says how much", async () => {
      const { user } = await fight(aFightWithSnipers())

      await defend(user)

      expect(tentLines()).toEqual([
        'The First Aid Tent heals the Patient removing 25 points of damage.'
      ])
    })

    test("the tent's turn comes after the Ballista's and before the stacks that waited", async () => {
      const { user } = await fight(
        aFightWithSnipers({ hero: aRedHero({ warMachines: [BALLISTA, TENT] }) })
      )

      await waitTurn(user)

      const order = readCombatMessages()
        .filter((line) => line.startsWith('The Ballista') || line.startsWith('The First Aid Tent'))
        .map((line) => (line.startsWith('The Ballista') ? 'Ballista' : 'First Aid Tent'))
      expect(order).toEqual(['Ballista', 'First Aid Tent'])
      expect(readActiveStack()).toEqual({ stack: 'Patient 1', ...OWN_STACK })
    })

    test('it heals only the top creature: a killed creature stays dead', async () => {
      const { user } = await fight(
        aFightWithSnipers({
          hero: aRedHero({ army: [stack('SMALL_PATIENT', 2)] }),
          count: 220
        })
      )

      await waitTurn(user)

      expect(tentLines()).toEqual([
        'The First Aid Tent heals the Small Patient removing 10 points of damage.'
      ])
      expect(stackOf('Small Patient').stack).toBe('Small Patient 1')
    })

    test('aiming itself, it heals the stack whose top creature lost the most health', async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero({ army: [stack('SQUIRE'), stack('PAGE')] }),
          enemy: aBlueHero({ army: [stack('SNIPER', 40), stack('SNIPER', 80)] })
        })
      )

      await defend(user)
      await defend(user)

      expect(tentLines()).toEqual([
        'The First Aid Tent heals the Page removing 25 points of damage.'
      ])
    })

    test('it never heals an enemy stack or a war machine, and with no stack of its own to heal its turn passes', async () => {
      const { user } = await fight(
        aFightWithAHero({
          enemy: aBlueHero({ army: [stack('PATIENT'), stack('SNIPER', 40)] })
        })
      )

      await castSpellAt(user, 'Magic Arrow', { row: 3, column: 15 })
      await defend(user)

      expect(readCombatMessages()).toContain('The Snipers do 20 damage.')
      expect(tentLines()).toEqual([])
      expect(readActiveStack()).toEqual({ stack: 'Patient 1', ...OWN_STACK })
    })

    test("the enemy hero's tent heals the enemy's stacks", async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero({ army: [stack('SNIPER', 60)], warMachines: [] }),
          enemy: aBlueHero({ army: [stack('PATIENT')], warMachines: [TENT] })
        })
      )

      await shootAt(user, ENEMY_STACK.row, ENEMY_STACK.column)
      await waitMs(1000)

      expect(tentLines()).toEqual([
        'The First Aid Tent heals the Patient removing 25 points of damage.'
      ])
    })

    test('a destroyed tent no longer heals', async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero({ army: [stack('KILLER'), stack('SNIPER', 60)], warMachines: [] }),
          enemy: aBlueHero({ army: [stack('PATIENT')], warMachines: [TENT] })
        })
      )
      const { row, column } = stackOf('First Aid Tent')
      await attackBattleHexFrom(user, row, column, 'left')
      await waitMs(1000)

      await shootAt(user, ENEMY_STACK.row, ENEMY_STACK.column)
      await waitMs(1000)

      expect(readCombatMessages()).toContain('The First Aid Tent is destroyed.')
      expect(tentLines()).toEqual([])
    })

    test("after a reload, the tent's healing stays as it was rolled and the round goes on from the next turn", async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFightWithSnipers()
      const { user } = await fight(scenario, { eventLog })
      await defend(user)

      await reloadBattle(scenario, { eventLog })

      expect(tentLines()).toEqual([
        'The First Aid Tent heals the Patient removing 25 points of damage.'
      ])
      expect(readActiveStack()).toEqual({ stack: 'Patient 1', ...OWN_STACK })
    })
  })

  describe('with First Aid', () => {
    const aFirstAidFight = (level = 'BASIC', options = {}) =>
      aFightWithSnipers({ hero: aRedHero({ skills: FIRST_AID(level) }), ...options })

    test("the tent's turn waits for the player, the tent the active stack", async () => {
      const { user } = await fight(aFirstAidFight())

      await defend(user)

      expect(readActiveStack()).toEqual({ stack: 'First Aid Tent 1', ...OWN_TENT })
    })

    test('hovering a wounded stack of the player shows the heal cursor and the status bar says it', async () => {
      const { user } = await startBattleWithStyles(aFirstAidFight(), {
        battleStepDelayMs: 0,
        random: HIGHEST_ROLLS
      })
      await defend(user)

      await hoverBattleHex(user, OWN_STACK.row, OWN_STACK.column)

      expect(getCursorOver(getBattleHex(OWN_STACK.row, OWN_STACK.column))).toBe('battle-heal')
      expect(getBattleStatusBarText()).toBe('Apply first aid to the Patient')
    })

    test.each([
      ['an enemy stack', ENEMY_STACK],
      ['an unwounded stack of the player', { row: 3, column: 1 }],
      ['the tent itself', OWN_TENT]
    ])('hovering %s on the tent’s turn shows the blocked cursor', async (_, hex) => {
      const { user } = await startBattleWithStyles(
        aFightWithSnipers({
          hero: aRedHero({
            army: [stack('PAGE'), stack('PATIENT'), stack('SQUIRE')],
            skills: FIRST_AID('BASIC')
          })
        }),
        { battleStepDelayMs: 0, random: HIGHEST_ROLLS }
      )
      await defend(user)
      await defend(user)
      await defend(user)

      await hoverBattleHex(user, hex.row, hex.column)

      expect(readActiveStack()).toEqual({ stack: 'First Aid Tent 1', ...OWN_TENT })
      expect(getCursorOver(getBattleHex(hex.row, hex.column))).toBe('battle-blocked')
    })

    test.each([
      ['BASIC', 50],
      ['ADVANCED', 75],
      ['EXPERT', 100]
    ])('with %s First Aid, clicking the wounded stack heals it by up to %s', async (level, healed) => {
      const { user } = await fight(aFirstAidFight(level, { count: 300 }))
      await defend(user)

      await healStackOn(user, OWN_STACK)

      expect(tentLines()).toEqual([
        `The First Aid Tent heals the Patient removing ${healed} points of damage.`
      ])
    })

    test('the healed stack shows the first aid picture over it', async () => {
      const { user } = await fight(aFirstAidFight())
      await defend(user)

      await clickBattleHex(user, OWN_STACK.row, OWN_STACK.column)

      expect(readBattleEffects()).toEqual([{ effect: 'First Aid', ...OWN_STACK }])
    })

    test("the hero casts a spell on the tent's turn, then the tent heals", async () => {
      const { user } = await fight(aFirstAidFight())
      await defend(user)
      await castSpellAt(user, 'Magic Arrow', ENEMY_STACK)
      await waitMs(1000)

      await healStackOn(user, OWN_STACK)

      expect(readCombatMessages()).toContain("Lord Haart casts 'Magic Arrow' on the Snipers.")
      expect(tentLines()).toHaveLength(1)
    })

    test("Wait on the tent's turn brings it back among the stacks that waited", async () => {
      const { user } = await fight(aFirstAidFight())
      await defend(user)

      await waitTurn(user)

      expect(readActiveStack()).toEqual({ stack: 'First Aid Tent 1', ...OWN_TENT })
    })

    test("Defend passes the tent's turn", async () => {
      const { user } = await fight(aFirstAidFight())
      await defend(user)

      await defend(user)

      expect(tentLines()).toEqual([])
      expect(readActiveStack()).toEqual({ stack: 'Patient 1', ...OWN_STACK })
    })

    test('in Auto combat the tent aims itself', async () => {
      const { user } = await fight(aFirstAidFight())

      await clickBattleButton(user, 'Auto combat')
      await waitMs(1000)

      expect(tentLines()[0]).toBe(
        'The First Aid Tent heals the Patient removing 30 points of damage.'
      )
    })
  })
})
