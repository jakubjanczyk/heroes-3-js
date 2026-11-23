// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import {
  createMemoryEventLog,
  getCursorOver,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import {
  clickBattleButton,
  clickBattleHex,
  clickBattleTower,
  countCatapultStones,
  getBattleButton,
  getBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
  hoverBattleTower,
  LOWEST_ROLLS,
  moveActiveStackTo,
  pickSpell,
  readActiveStack,
  readBattleResultsSide,
  readCombatMessages,
  retreat,
  waitForBattleResults
} from './battle.utils.js'
import { aCreatureDefinition, aHero, aScenario, aTown } from './builders.js'

const aSturdyCreature = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(50)
    .withDamage({ min: 1, max: 1 })
    .withHealth(1000)

const RUNNER = aSturdyCreature('Runner').withSpeed(20).withAiValue(1).build()
const PLODDER = aSturdyCreature('Plodder').withSpeed(18).withAiValue(1).build()
const KILLER = aSturdyCreature('Killer')
  .withSpeed(19)
  .withAttack(50)
  .withDamage({ min: 100, max: 100 })
  .withAiValue(1)
  .build()
const ARCHER = aSturdyCreature('Archer')
  .withSpeed(1)
  .withAiValue(1)
  .withShots(99)
  .withAbilities(['ranged'])
  .build()

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: { ...readGameData('monsters.json'), RUNNER, PLODDER, KILLER, ARCHER },
  spells: readGameData('spells.json'),
  heroes: readGameData('heroes.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const stack = (creature, count = 1) => ({ creature, count })

const HERO = 'Lord Haart'
const CASTER_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 5 }

const UPPER_WALL = { row: 2, column: 12 }
const MID_LOWER_WALL = { row: 8, column: 11 }
const OUTER_DRAWBRIDGE = { row: 6, column: 10 }
const INNER_DRAWBRIDGE = { row: 6, column: 11 }
const INDESTRUCTIBLE_WALL = { row: 3, column: 11 }
const EMPTY_HEX = { row: 6, column: 5 }
const UNDER_THE_UPPER_TOWER = { row: 1, column: 12 }
const RUNNERS_HEX = { row: 6, column: 1 }
const SECOND_OF_TWO_STACKS_HEX = { row: 9, column: 1 }

const CATAPULT = 'Catapult 1'
const KEEP = 'Keep'
const UPPER_TOWER = 'Upper Tower'

const HITS = 0
const ONE_POINT = 0
const TWO_POINTS = 0.5
const AT_THE_FIRST = 0
const WITHIN_BASIC_DRAWBRIDGE_CHANCE = 0.25
const PAST_BASIC_DRAWBRIDGE_CHANCE = 0.35
const WITHIN_BASIC_KEEP_CHANCE = 0.05
const PAST_BASIC_KEEP_CHANCE = 0.08

function catapultRolls(...values) {
  const rolls = [...values]
  return () => rolls.shift() ?? 0
}

const catapultMessages = () =>
  readCombatMessages().filter((message) => message.startsWith('The Catapult'))

const TOWN_ENTRANCE = { x: 4, y: 3 }

const FORT = ['FORT']
const CASTLE = ['FORT', 'CITADEL', 'CASTLE']

const ballistics = (level) => (level ? [{ skill: 'BALLISTICS', level }] : [])

const anAttacker = ({ level = 'BASIC', army = [stack('RUNNER')] } = {}) =>
  aHero()
    .withName(HERO)
    .withPrimarySkills(CASTER_SKILLS)
    .withSecondarySkills(ballistics(level))
    .withSpellBook(true)
    .withSpells(['HASTE'])
    .withArmy(army)
    .at(4, 5)

const aBlueTown = (buildings = FORT, garrison = [stack('ARCHER')]) =>
  aTown()
    .named('Kirkwall')
    .ownedBy('blue')
    .withBuildings(buildings)
    .withGarrison(garrison)
    .at(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)

const anAttackScenario = ({
  hero = anAttacker(),
  buildings = FORT,
  garrison,
  defender = null
} = {}) =>
  aScenario()
    .withSize(9, 7)
    .withEntities(hero, aBlueTown(buildings, garrison), ...(defender ? [defender] : []))
    .withDefinitions(definitions)

const setupApp = (scenario, { rolls = [], stepDelayMs = 0, eventLog } = {}) =>
  setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: {
      random: LOWEST_ROLLS,
      catapultRandom: catapultRolls(...rolls),
      battleStepDelayMs: stepDelayMs,
      interactionModalTransitionMs: 0
    },
    ...(eventLog ? { eventLog } : {})
  })

async function attackTown(scenario = anAttackScenario(), options) {
  const app = await setupApp(scenario, options)
  confirmTileClickByDispatch(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
  await waitMs()
  return app
}

async function attackCastle(options) {
  const app = await attackTown(anAttackScenario({ buildings: CASTLE }), options)
  await loadAppStyles()
  return app
}

async function aimAt(user, hex) {
  await clickBattleHex(user, hex.row, hex.column)
  await waitMs()
}

async function waitWith(user) {
  await clickBattleButton(user, 'Wait')
  await waitMs(1000)
}

async function passTheRound(user) {
  await clickBattleButton(user, 'Defend')
  await waitMs(1000)
}

const FLIGHT_MS = 400

describe('aiming the catapult behavior', () => {
  describe("the catapult's turn", () => {
    test('with Ballistics the catapult is the active stack as the battle opens, and no stone flies until the player aims', async () => {
      await attackTown()

      expect(readActiveStack().stack).toBe(CATAPULT)
      expect(countCatapultStones()).toBe(0)
      expect(catapultMessages()).toEqual([])
    })

    test("clicking the Mid-Lower Wall shoots at it, and then the first stack's turn starts", async () => {
      const { user } = await attackTown(anAttackScenario(), { rolls: [HITS, ONE_POINT] })

      await aimAt(user, MID_LOWER_WALL)

      expect(catapultMessages()).toEqual(['The Catapult hits the Mid-Lower Wall.'])
      expect(readActiveStack().stack).toBe('Runner 1')
    })

    test('with Advanced Ballistics one click fires both shots at the part clicked', async () => {
      const { user } = await attackTown(
        anAttackScenario({ hero: anAttacker({ level: 'ADVANCED' }) }),
        {
          rolls: [HITS, ONE_POINT, HITS, ONE_POINT]
        }
      )

      await aimAt(user, UPPER_WALL)

      expect(catapultMessages()).toEqual([
        'The Catapult hits the Upper Wall.',
        'The Catapult destroys the Upper Wall.'
      ])
    })

    test("with nothing left standing the catapult has no turn, and the round starts with the first stack's", async () => {
      const { user } = await attackTown(anAttackScenario({ hero: anAttacker({ level: 'EXPERT' }) }))
      await aimAt(user, UPPER_WALL)
      await passTheRound(user)
      await aimAt(user, MID_LOWER_WALL)
      await passTheRound(user)
      await aimAt(user, INNER_DRAWBRIDGE)

      await passTheRound(user)

      expect(readActiveStack().stack).toBe('Runner 1')
      expect(catapultMessages()).toHaveLength(5)
    })
  })

  describe('the parts it aims at', () => {
    test('a roll within the drawbridge chance of Basic Ballistics hits the drawbridge clicked on its outer hex', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [WITHIN_BASIC_DRAWBRIDGE_CHANCE, ONE_POINT]
      })

      await aimAt(user, OUTER_DRAWBRIDGE)

      expect(catapultMessages()).toEqual(['The Catapult hits the Drawbridge.'])
    })

    test('a roll past the drawbridge chance of Basic Ballistics misses onto a wall next to it', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [PAST_BASIC_DRAWBRIDGE_CHANCE, AT_THE_FIRST, ONE_POINT]
      })

      await aimAt(user, INNER_DRAWBRIDGE)

      expect(catapultMessages()).toEqual(['The Catapult hits the Mid-Upper Wall.'])
    })

    test('a roll within the Keep chance of Basic Ballistics hits the Keep clicked', async () => {
      const { user } = await attackCastle({
        rolls: [WITHIN_BASIC_KEEP_CHANCE, ONE_POINT]
      })

      await clickBattleTower(user, KEEP)

      expect(catapultMessages()).toEqual(['The Catapult hits the Keep.'])
    })

    test('a roll past the Keep chance of Basic Ballistics misses onto the Lower Wall', async () => {
      const { user } = await attackCastle({
        rolls: [PAST_BASIC_KEEP_CHANCE, ONE_POINT]
      })

      await clickBattleTower(user, KEEP)

      expect(catapultMessages()).toEqual(['The Catapult hits the Lower Wall.'])
    })

    test('clicking the Upper Tower shoots at it', async () => {
      const { user } = await attackCastle({
        rolls: [HITS, ONE_POINT]
      })

      await clickBattleTower(user, UPPER_TOWER)

      expect(catapultMessages()).toEqual(['The Catapult hits the Upper Tower.'])
    })

    test('a destroyed tower cannot be aimed at', async () => {
      const { user } = await attackCastle({
        rolls: [HITS, TWO_POINTS]
      })
      await clickBattleTower(user, UPPER_TOWER)
      await passTheRound(user)

      await aimAt(user, UNDER_THE_UPPER_TOWER)

      expect(catapultMessages()).toEqual(['The Catapult destroys the Upper Tower.'])
      expect(readActiveStack().stack).toBe(CATAPULT)
    })
  })

  describe('the cursor and the status bar', () => {
    test('over a standing wall segment the cursor is the catapult', async () => {
      const { user } = await attackTown()
      await loadAppStyles()

      await hoverBattleHex(user, UPPER_WALL.row, UPPER_WALL.column)

      expect(getCursorOver(getBattleHex(UPPER_WALL.row, UPPER_WALL.column))).toBe('battle-catapult')
    })

    test('over a standing wall segment the status bar names it', async () => {
      const { user } = await attackTown()

      await hoverBattleHex(user, UPPER_WALL.row, UPPER_WALL.column)

      expect(getBattleStatusBarText()).toBe('Shoot the Catapult at the Upper Wall')
    })

    test('over a tower the status bar names it', async () => {
      const { user } = await attackCastle()

      await hoverBattleTower(user, UPPER_TOWER)

      expect(getBattleStatusBarText()).toBe('Shoot the Catapult at the Upper Tower')
    })

    test.each([
      ['an empty hex', EMPTY_HEX],
      ["the hero's own stack", RUNNERS_HEX],
      ['an indestructible wall hex', INDESTRUCTIBLE_WALL]
    ])('over %s the cursor is blocked', async (_, hex) => {
      const { user } = await attackTown()
      await loadAppStyles()

      await hoverBattleHex(user, hex.row, hex.column)

      expect(getCursorOver(getBattleHex(hex.row, hex.column))).toBe('battle-blocked')
    })

    test('a click on an empty hex does nothing', async () => {
      const { user } = await attackTown()

      await aimAt(user, EMPTY_HEX)

      expect(readActiveStack().stack).toBe(CATAPULT)
      expect(catapultMessages()).toEqual([])
    })

    test('where a destroyed tower stands the cursor is blocked', async () => {
      const { user } = await attackCastle({
        rolls: [HITS, TWO_POINTS]
      })
      await clickBattleTower(user, UPPER_TOWER)
      await passTheRound(user)

      await hoverBattleHex(user, UNDER_THE_UPPER_TOWER.row, UNDER_THE_UPPER_TOWER.column)

      expect(
        getCursorOver(getBattleHex(UNDER_THE_UPPER_TOWER.row, UNDER_THE_UPPER_TOWER.column))
      ).toBe('battle-blocked')
    })
  })

  describe("the hero on the catapult's turn", () => {
    test("a spell cast on the catapult's turn leaves the turn with the catapult", async () => {
      const { user } = await attackTown()

      await pickSpell(user, 'Haste')
      await clickBattleHex(user, RUNNERS_HEX.row, RUNNERS_HEX.column)
      await waitMs()

      expect(readActiveStack().stack).toBe(CATAPULT)
      expect(countCatapultStones()).toBe(0)
    })

    test("Haste cast on the slower stack on the catapult's turn makes it move first once the catapult has shot", async () => {
      const { user } = await attackTown(
        anAttackScenario({
          hero: anAttacker({ army: [stack('RUNNER'), null, stack('PLODDER')] })
        })
      )
      await pickSpell(user, 'Haste')
      await clickBattleHex(user, SECOND_OF_TWO_STACKS_HEX.row, SECOND_OF_TWO_STACKS_HEX.column)
      await waitMs()

      await aimAt(user, UPPER_WALL)

      expect(readActiveStack().stack).toBe('Plodder 1')
    })

    test('Defend passes the catapult turn without a shot', async () => {
      const { user } = await attackTown()

      await clickBattleButton(user, 'Defend')
      await waitMs()

      expect(catapultMessages()).toEqual([])
      expect(readActiveStack().stack).toBe('Runner 1')
    })

    test("Wait is enabled on the catapult's turn", async () => {
      await attackTown()

      expect(getBattleButton('Wait').disabled).toBe(false)
    })

    test('Auto combat turned on during its turn lets the catapult aim itself', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        stepDelayMs: 100
      })

      await user.click(getBattleButton('Auto combat'))
      await waitMs(FLIGHT_MS / 2)

      expect(countCatapultStones()).toBe(1)
    })

    test("the hero can retreat on the catapult's turn", async () => {
      const { user } = await attackTown()

      await retreat(user)
      await waitForBattleResults()

      expect(readBattleResultsSide('Attacker')).toEqual([HERO, 'Defeated'])
    })

    test("the hero can surrender to a defending hero on the catapult's turn", async () => {
      await attackTown(
        anAttackScenario({
          defender: aHero()
            .withId('hero-2')
            .withName('Valeska')
            .ownedBy('blue')
            .withArmy([stack('ARCHER')])
            .at(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
        })
      )

      expect(getBattleButton('Surrender').disabled).toBe(false)
    })
  })

  describe("the catapult's Wait", () => {
    const TOP_LEFT_CORNER = { row: 1, column: 1 }

    test("Wait on the catapult's turn fires no stone, and the first stack's turn starts", async () => {
      const { user } = await attackTown()

      await clickBattleButton(user, 'Wait')
      await waitMs()

      expect(catapultMessages()).toEqual([])
      expect(readActiveStack().stack).toBe('Runner 1')
    })

    test("the catapult's waited turn comes before the other stacks that waited", async () => {
      const { user } = await attackTown()

      await waitWith(user)
      await waitWith(user)

      expect(readActiveStack().stack).toBe(CATAPULT)
    })

    test('clicking a wall segment on the waited turn shoots at it', async () => {
      const { user } = await attackTown(anAttackScenario(), { rolls: [HITS, ONE_POINT] })
      await waitWith(user)
      await passTheRound(user)

      await aimAt(user, UPPER_WALL)

      expect(catapultMessages()).toEqual(['The Catapult hits the Upper Wall.'])
    })

    test('a catapult destroyed before its waited turn has no turn back', async () => {
      const { user } = await attackTown(anAttackScenario({ garrison: [stack('KILLER', 10)] }))
      await waitWith(user)

      await moveActiveStackTo(user, TOP_LEFT_CORNER.row, TOP_LEFT_CORNER.column)
      await waitMs(1000)

      expect(catapultMessages()).toEqual(['The Catapult is destroyed.'])
      expect(readActiveStack().stack).toBe('Runner 1')
    })
  })

  describe('reloading', () => {
    test("a reload on the catapult's turn is still its turn", async () => {
      const eventLog = createMemoryEventLog()
      await attackTown(anAttackScenario(), { eventLog })

      await setupApp(anAttackScenario(), { eventLog })
      await waitMs(1000)

      expect(readActiveStack().stack).toBe(CATAPULT)
      expect(catapultMessages()).toEqual([])
    })

    test('a reload after the first of two shots fires only the second, at the same part', async () => {
      const eventLog = createMemoryEventLog()
      const advanced = () => anAttackScenario({ hero: anAttacker({ level: 'ADVANCED' }) })
      const { user } = await attackTown(advanced(), {
        rolls: [HITS, ONE_POINT],
        stepDelayMs: 100,
        eventLog
      })
      await clickBattleHex(user, UPPER_WALL.row, UPPER_WALL.column)
      await waitMs(FLIGHT_MS / 2)

      await setupApp(advanced(), { rolls: [HITS, ONE_POINT], eventLog })
      await waitMs(1000)

      expect(catapultMessages()).toEqual([
        'The Catapult hits the Upper Wall.',
        'The Catapult destroys the Upper Wall.'
      ])
    })

    test('a reload after the catapult waited still brings its turn back in the wait phase', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await attackTown(anAttackScenario(), { eventLog })
      await waitWith(user)
      await waitWith(user)

      await setupApp(anAttackScenario(), { eventLog })
      await waitMs(1000)

      expect(readActiveStack().stack).toBe(CATAPULT)
    })
  })
})
