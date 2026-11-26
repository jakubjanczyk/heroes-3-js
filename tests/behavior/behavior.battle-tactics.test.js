// @vitest-environment jsdom
import { within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'
import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import { clickEndTurn } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  clickBattleButton,
  closeTacticsPhaseMessage,
  getBattleButton,
  getBattleScreen,
  LOWEST_ROLLS,
  moveActiveStackTo,
  queryTacticsPhaseMessage,
  readActiveStack,
  readBattleQuestion,
  readBattleResultsSide,
  readBattleStacks,
  readReachableHexes,
  reloadBattle,
  retreat,
  startBattle,
  waitForBattleResults
} from './battle.utils.js'
import {
  aCreatureDefinition,
  aHero,
  aMonster,
  aScenario,
  aTown,
  aWarMachineDefinition
} from './builders.js'

const aSturdyCreature = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(50)
    .withDamage({ min: 1, max: 1 })
    .withHealth(1000)
    .withAiValue(1)

const RUNNER = aSturdyCreature('Runner').withSpeed(20).build()
const SLUG = aSturdyCreature('Slug').withSpeed(1).build()
const HULK = aSturdyCreature('Hulk').withSpeed(6).withAbilities(['doubleWide']).build()
const DUMMY = aSturdyCreature('Dummy').withSpeed(5).build()
const STRIKER = aSturdyCreature('Striker')
  .withSpeed(20)
  .withAttack(10)
  .withDamage({ min: 10, max: 10 })
  .build()
const WEAKLING = aCreatureDefinition()
  .withName('Weakling')
  .withNamePlural('Weaklings')
  .withAttack(0)
  .withDefense(0)
  .withDamage({ min: 1, max: 1 })
  .withHealth(1)
  .withSpeed(1)
  .withAiValue(60)
  .build()
const TEST_BALLISTA = aCreatureDefinition()
  .withName('Ballista')
  .withNamePlural('Ballistas')
  .withAttack(0)
  .withDefense(10)
  .withDamage({ min: 0, max: 0 })
  .withHealth(1000)
  .withSpeed(0)
  .withAbilities(['warMachine'])
  .build()

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: {
    ...readGameData('monsters.json'),
    RUNNER,
    SLUG,
    HULK,
    DUMMY,
    STRIKER,
    WEAKLING,
    TEST_BALLISTA
  },
  spells: readGameData('spells.json'),
  heroes: readGameData('heroes.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json'),
  artifacts: {
    BALLISTA: aWarMachineDefinition()
      .withName('Ballista')
      .withSlot('BALLISTA')
      .withCreature('TEST_BALLISTA')
      .build()
  }
}

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 10 }

const stack = (creature, count = 1) => ({ creature, count })

const TACTICS = (level) => [{ skill: 'TACTICS', level }]

const BAND_OF = {
  BASIC: [1, 2, 3],
  ADVANCED: [1, 2, 3, 4, 5],
  EXPERT: [1, 2, 3, 4, 5, 6, 7]
}

// Two stacks start in rows 3 and 9 of the first column, three in rows 3, 6 and 9.
const FIRST_OF_TWO = { row: 3, column: 1 }
const SECOND_OF_TWO = { row: 9, column: 1 }
const ALONE = { row: 6, column: 1 }

const aRedHero = ({ army = [stack('RUNNER'), stack('SLUG')], tactics = 'BASIC' } = {}) =>
  aHero()
    .withName('Lord Haart')
    .withPrimarySkills(NO_SKILLS)
    .withSecondarySkills(tactics ? TACTICS(tactics) : [])
    .withSpellBook(true)
    .withSpells(['MAGIC_ARROW'])
    .withArmy(army)

const aBlueHero = ({ army = [stack('DUMMY')], tactics = null } = {}) =>
  aHero()
    .withId('hero-2')
    .withName('Valeska')
    .ownedBy('blue')
    .withPrimarySkills(NO_SKILLS)
    .withSecondarySkills(tactics ? TACTICS(tactics) : [])
    .withArmy(army)

const aFightWithMonsters = ({ hero = aRedHero(), monster = 'DUMMY' } = {}) =>
  aScenario()
    .withSize(3)
    .withEntities(hero.at(0, 0), aMonster().withType(monster).withCount(1).withStacks(1).at(1, 0))
    .withDefinitions(definitions)

const aFightWithAHero = ({ hero = aRedHero(), enemy = aBlueHero() } = {}) =>
  aScenario()
    .withSize(3, 3)
    .withEntities(hero.at(0, 0), enemy.at(1, 0))
    .withDefinitions(definitions)

async function fight(scenario, options) {
  const app = await startBattle(scenario, { battleStepDelayMs: 0, ...options })
  await closeTacticsPhaseMessage(app.user)
  return app
}

const columnsOf = (hexes) => [...new Set(hexes.map(({ column }) => column))].sort((a, b) => a - b)

const stackNamed = (name) => readBattleStacks().find(({ stack }) => stack.startsWith(name))

const hexOf = (found) => ({ row: found.row, column: found.column })

async function place(user, { row, column }) {
  await moveActiveStackTo(user, row, column)
  await waitMs(1000)
}

async function endTacticsPhase(user) {
  await clickBattleButton(user, 'End Tactics Phase')
  await waitMs(1000)
}

const queryTacticsButton = (name) => within(getBattleScreen()).queryByRole('button', { name })

describe('Tactics in battle behavior', () => {
  describe('placing the army', () => {
    test('a hero with Basic Tactics starts the battle in the tactics phase, with their first stack selected', async () => {
      await fight(aFightWithMonsters())

      expect(readActiveStack()).toEqual({ stack: 'Runner 1', ...FIRST_OF_TWO })
      expect(getBattleButton('End Tactics Phase')).toBeTruthy()
    })

    test.each(
      Object.entries(BAND_OF)
    )("with %s Tactics the selected stack can be placed on the free hexes of the side's first columns", async (level, band) => {
      await fight(aFightWithMonsters({ hero: aRedHero({ tactics: level }) }))

      expect(columnsOf(readReachableHexes())).toEqual(band)
    })

    test("a stack can't be placed past the band", async () => {
      const { user } = await fight(aFightWithMonsters())

      await place(user, { row: 3, column: 4 })

      expect(hexOf(stackNamed('Runner'))).toEqual(FIRST_OF_TWO)
    })

    test('a slow stack can be placed anywhere in the band, beyond its speed', async () => {
      const { user } = await fight(
        aFightWithMonsters({ hero: aRedHero({ army: [stack('SLUG')] }) })
      )

      await place(user, { row: 11, column: 3 })

      expect(hexOf(stackNamed('Slug'))).toEqual({ row: 11, column: 3 })
    })

    test("a double-wide creature can't put its front half past the band", async () => {
      const { user } = await fight(
        aFightWithMonsters({ hero: aRedHero({ army: [stack('HULK')] }) })
      )

      await place(user, { row: 6, column: 4 })

      expect(hexOf(stackNamed('Hulk 1'))).toEqual(ALONE)
    })

    test('a placed stack stands there when the first round starts', async () => {
      const { user } = await fight(aFightWithMonsters())

      await place(user, { row: 1, column: 3 })
      await endTacticsPhase(user)

      expect(hexOf(stackNamed('Runner'))).toEqual({ row: 1, column: 3 })
    })

    test('placing a stack selects the next one', async () => {
      const hero = aRedHero({ army: [stack('SLUG'), stack('RUNNER')] })
      const { user } = await fight(aFightWithMonsters({ hero }))

      await place(user, { row: 1, column: 3 })

      expect(readActiveStack()).toEqual({ stack: 'Runner 1', ...SECOND_OF_TWO })
    })

    test("clicking another of the hero's stacks selects it", async () => {
      const { user } = await fight(aFightWithMonsters())

      await place(user, SECOND_OF_TWO)

      expect(readActiveStack()).toEqual({ stack: 'Slug 1', ...SECOND_OF_TWO })
    })

    test('the Next button selects the next stack', async () => {
      const { user } = await fight(aFightWithMonsters())

      await clickBattleButton(user, 'Next creature')

      expect(readActiveStack()).toEqual({ stack: 'Slug 1', ...SECOND_OF_TWO })
    })

    test('the Next button selects the first stack again after the last', async () => {
      const { user } = await fight(aFightWithMonsters())

      await clickBattleButton(user, 'Next creature')
      await clickBattleButton(user, 'Next creature')

      expect(readActiveStack()).toEqual({ stack: 'Runner 1', ...FIRST_OF_TWO })
    })

    test('war machines are never selected to be placed', async () => {
      const hero = aRedHero({ army: [stack('RUNNER')] }).withArtifacts(['BALLISTA'])
      const { user } = await fight(aFightWithMonsters({ hero }))

      await clickBattleButton(user, 'Next creature')

      expect(readActiveStack().stack).toBe('Runner 1')
    })
  })

  describe('the phase', () => {
    test('the Tactics Phase message is shown as the phase starts', async () => {
      await startBattle(aFightWithMonsters(), { battleStepDelayMs: 0 })

      expect(readBattleQuestion(queryTacticsPhaseMessage())).toBe(
        'In the Tactics Phase, a hero with superior Tactics skill may arrange his armies before combat begins.'
      )
    })

    test("End Tactics Phase starts the first round with the fastest stack's turn", async () => {
      const hero = aRedHero({ army: [stack('SLUG'), stack('RUNNER')] })
      const { user } = await fight(aFightWithMonsters({ hero }))

      await endTacticsPhase(user)

      expect(readActiveStack().stack).toBe('Runner 1')
    })

    test('during the phase the bar shows the tactics buttons in place of the combat log', async () => {
      await fight(aFightWithMonsters())

      const bar = within(getBattleScreen())
      expect(bar.queryByRole('log', { name: 'Combat messages' })).toBeNull()
      expect(bar.getByRole('button', { name: 'Next creature' })).toBeTruthy()
      expect(bar.getByRole('button', { name: 'End Tactics Phase' })).toBeTruthy()
    })

    test('once the phase ends the combat log is back in the bar', async () => {
      const { user } = await fight(aFightWithMonsters())

      await endTacticsPhase(user)

      const bar = within(getBattleScreen())
      expect(bar.getByRole('log', { name: 'Combat messages' })).toBeTruthy()
      expect(queryTacticsButton('Next creature')).toBeNull()
      expect(queryTacticsButton('End Tactics Phase')).toBeNull()
    })

    test('Cast spell, Wait and Defend are off during the phase', async () => {
      await fight(aFightWithMonsters())

      expect(getBattleButton('Cast spell').disabled).toBe(true)
      expect(getBattleButton('Wait').disabled).toBe(true)
      expect(getBattleButton('Defend').disabled).toBe(true)
    })

    test('retreating during the phase ends the battle as a retreat does', async () => {
      const { user } = await fight(aFightWithMonsters())

      await retreat(user)

      expect(readBattleResultsSide('Attacker')).toEqual(['Lord Haart', 'Defeated'])
    })

    test('Auto combat during the phase hands it to the computer, which ends it and fights the battle out', async () => {
      const hero = aRedHero({ army: [stack('STRIKER')] })
      const { user } = await fight(aFightWithMonsters({ hero, monster: 'WEAKLING' }))

      await user.click(getBattleButton('Auto combat'))
      await waitForBattleResults()

      expect(readBattleResultsSide('Attacker')).toEqual(['Lord Haart', 'Victorious'])
    })
  })

  describe('who gets it', () => {
    test('Tactics at the same level on both sides gives no tactics phase', async () => {
      await startBattle(aFightWithAHero({ enemy: aBlueHero({ tactics: 'BASIC' }) }), {
        battleStepDelayMs: 0
      })

      expect(queryTacticsButton('End Tactics Phase')).toBeNull()
    })

    test('Expert Tactics against Basic places within five columns', async () => {
      await fight(
        aFightWithAHero({
          hero: aRedHero({ tactics: 'EXPERT' }),
          enemy: aBlueHero({ tactics: 'BASIC' })
        })
      )

      expect(columnsOf(readReachableHexes())).toEqual(BAND_OF.ADVANCED)
    })

    test("the enemy hero's better Tactics gives the player no tactics phase, and the first round starts at once", async () => {
      await startBattle(aFightWithAHero({ enemy: aBlueHero({ tactics: 'ADVANCED' }) }), {
        battleStepDelayMs: 0
      })
      await waitMs(1000)

      expect(queryTacticsButton('End Tactics Phase')).toBeNull()
      expect(readActiveStack()).toEqual({ stack: 'Runner 1', ...FIRST_OF_TWO })
    })

    test("the player's hero defending against a computer hero places their stacks in the right-hand columns", async () => {
      const red = aHero()
        .withName('Lord Haart')
        .withPrimarySkills(NO_SKILLS)
        .withSecondarySkills(TACTICS('BASIC'))
        .withArmy([stack('SKELETON', 10)])
        .at(19, 2)
      const blue = aBlueHero({ army: [stack('WEAKLING', 12)] }).at(15, 2)
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aScenario()
          .withSize(30, 3)
          .withEntities(red, blue)
          .withDefinitions(definitions)
          .build(),
        appConfig: { random: LOWEST_ROLLS, battleStepDelayMs: 0 }
      })
      await clickEndTurn(user)
      await waitMs(2000)
      await closeTacticsPhaseMessage(user)

      expect(columnsOf(readReachableHexes())).toEqual([13, 14, 15])
    })

    test('the attacker in a siege places their stacks before the first round', async () => {
      const town = aTown()
        .named('Kirkwall')
        .ownedBy('blue')
        .withBuildings(['FORT'])
        .withGarrison([stack('DUMMY')])
        .at(4, 3)
      const scenario = aScenario()
        .withSize(9, 7)
        .withEntities(aRedHero().at(4, 5), town)
        .withDefinitions(definitions)
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: scenario.build(),
        appConfig: { random: LOWEST_ROLLS, battleStepDelayMs: 0, interactionModalTransitionMs: 0 }
      })
      confirmTileClickByDispatch(4, 3)
      await waitMs()
      await closeTacticsPhaseMessage(user)

      expect(columnsOf(readReachableHexes())).toEqual(BAND_OF.BASIC)
    })
  })

  describe('after a reload', () => {
    test('a reload during the phase comes back to it', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFightWithMonsters()
      const { user } = await fight(scenario, { eventLog })
      await place(user, { row: 1, column: 3 })

      await reloadBattle(scenario, { eventLog })
      await waitMs(1000)

      expect(getBattleButton('End Tactics Phase')).toBeTruthy()
    })

    test('a reload during the phase keeps the placed stacks where they were placed', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFightWithMonsters({ hero: aRedHero({ army: [stack('SLUG')] }) })
      const { user } = await fight(scenario, { eventLog })
      await place(user, { row: 11, column: 3 })

      await reloadBattle(scenario, { eventLog })
      await waitMs(1000)

      expect(hexOf(stackNamed('Slug'))).toEqual({ row: 11, column: 3 })
    })
  })
})
