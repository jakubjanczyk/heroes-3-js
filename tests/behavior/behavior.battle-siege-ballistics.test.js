// @vitest-environment jsdom
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
  clickBattleHex,
  countCatapultStones,
  isBattleHexReachable,
  LOWEST_ROLLS,
  readActiveStack,
  readBattleWalls,
  readCombatMessages
} from './battle.utils.js'
import { ARMY_THAT_WINS, aCreatureDefinition, aHero, aScenario, aTown } from './builders.js'

const aSturdyCreature = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(50)
    .withDamage({ min: 1, max: 1 })
    .withHealth(1000)

const RUNNER = aSturdyCreature('Runner').withSpeed(20).withAiValue(1).build()
const BRUTE = aSturdyCreature('Brute').withSpeed(1).withAiValue(1000).build()
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
  monsters: { ...readGameData('monsters.json'), RUNNER, BRUTE, ARCHER },
  spells: readGameData('spells.json'),
  heroes: readGameData('heroes.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const stack = (creature, count = 1) => ({ creature, count })

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

const ballistics = (level) => (level ? [{ skill: 'BALLISTICS', level }] : [])

const UPPER_WALL = { row: 2, column: 12 }
const MID_UPPER_WALL = { row: 5, column: 10 }
const MID_LOWER_WALL = { row: 8, column: 11 }
const LOWER_WALL = { row: 11, column: 12 }
const DRAWBRIDGE = { row: 6, column: 11 }

const AT_THE_FIRST = 0
const AT_THE_SECOND_OF_TWO = 0.5
const AT_THE_SECOND_OF_THREE = 0.4
const HITS = 0
const MISSES = 0.9
const WITHIN_BASIC_HIT_CHANCE = 0.55
const PAST_BASIC_HIT_CHANCE = 0.65
const WITHIN_EXPERT_HIT_CHANCE = 0.7
const LOWEST_DAMAGE = 0
const ONE_POINT_WITHOUT_THE_SKILL = 0.5
const ONE_POINT = 0
const TWO_POINTS = 0.5

function catapultRolls(...values) {
  const rolls = [...values]
  return () => rolls.shift() ?? 0
}

const wallAt = (hex) =>
  readBattleWalls().find(({ row, column }) => row === hex.row && column === hex.column)?.wall

const catapultMessages = () =>
  readCombatMessages().filter((message) => message.startsWith('The Catapult'))

const TOWN_ENTRANCE = { x: 4, y: 3 }

const FORT = ['FORT']
const CASTLE = ['FORT', 'CITADEL', 'CASTLE']

const aBlueTown = (buildings = FORT) =>
  aTown()
    .named('Kirkwall')
    .ownedBy('blue')
    .withBuildings(buildings)
    .withGarrison([stack('ARCHER')])
    .at(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)

const anAttackScenario = ({ level = null, buildings = FORT } = {}) =>
  aScenario()
    .withSize(9, 7)
    .withEntities(
      aHero()
        .withPrimarySkills(NO_SKILLS)
        .withSecondarySkills(ballistics(level))
        .withArmy([stack('RUNNER')])
        .at(4, 5),
      aBlueTown(buildings)
    )
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

async function attackTown(scenario, options) {
  const app = await setupApp(scenario, options)
  confirmTileClickByDispatch(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
  await waitMs()
  return app
}

async function aimAt(user, hex) {
  await clickBattleHex(user, hex.row, hex.column)
  await waitMs()
}

async function attackAndAimAt(scenario, hex, options) {
  const app = await attackTown(scenario, options)
  await aimAt(app.user, hex)
  return app
}

async function passTheRound(user) {
  await clickBattleButton(user, 'Defend')
  await waitMs(1000)
}

const COMPUTER_TURN_MS = 2000
const PLAYERS_GATE = { x: 20, y: 2 }

const aComputerAttackScenario = (level) =>
  aScenario()
    .withSize(30, 6)
    .withRockAround(2, 5)
    .withEntities(
      aHero().withId('hero-5').withArmy(ARMY_THAT_WINS).at(2, 5),
      aTown()
        .withId('town-1')
        .named('Whitemoon')
        .ownedByPlayer()
        .withBuildings(FORT)
        .withGarrison([stack('RUNNER')])
        .at(PLAYERS_GATE.x, PLAYERS_GATE.y),
      aHero()
        .withId('hero-2')
        .withName('Valeska')
        .ownedBy('blue')
        .withPrimarySkills(NO_SKILLS)
        .withSecondarySkills(ballistics(level))
        .withArmy([stack('BRUTE')])
        .at(20, 5)
    )
    .withDefinitions(definitions)

const FLIGHT_MS = 400
const TWO_SHOTS_AIMED = [HITS, ONE_POINT, HITS, ONE_POINT]
const TWO_SHOTS_AIMING_ITSELF_AT_THE_UPPER_WALL = [AT_THE_FIRST, ...TWO_SHOTS_AIMED]

const TWO_POINTS_ON_THE_PART_AIMED_AT_AND_TWO_ON_ITS_NEIGHBOUR = [
  HITS,
  TWO_POINTS,
  MISSES,
  TWO_POINTS
]

describe('siege Ballistics behavior', () => {
  describe('shots', () => {
    test('with Advanced Ballistics two stones fly one after the other once the player aims, and the log has a line for each', async () => {
      const { user } = await attackTown(anAttackScenario({ level: 'ADVANCED' }), {
        rolls: TWO_SHOTS_AIMED,
        stepDelayMs: 100
      })
      await clickBattleHex(user, UPPER_WALL.row, UPPER_WALL.column)
      await waitMs(FLIGHT_MS / 2)
      const stonesInTheFirstFlight = countCatapultStones()
      await waitMs(FLIGHT_MS)
      const stonesInTheSecondFlight = countCatapultStones()
      const messagesInTheSecondFlight = catapultMessages()

      await waitMs(FLIGHT_MS)

      expect(stonesInTheFirstFlight).toBe(1)
      expect(stonesInTheSecondFlight).toBe(1)
      expect(messagesInTheSecondFlight).toEqual(['The Catapult hits the Upper Wall.'])
      expect(catapultMessages()).toEqual([
        'The Catapult hits the Upper Wall.',
        'The Catapult destroys the Upper Wall.'
      ])
    })

    test('the first stack acts only once the second stone has landed', async () => {
      const { user } = await attackTown(anAttackScenario({ level: 'ADVANCED' }), {
        rolls: TWO_SHOTS_AIMED,
        stepDelayMs: 100
      })
      await clickBattleHex(user, UPPER_WALL.row, UPPER_WALL.column)
      await waitMs(FLIGHT_MS * 1.5)
      const reachableInTheSecondFlight = isBattleHexReachable(6, 2)

      await waitMs(FLIGHT_MS)

      expect(reachableInTheSecondFlight).toBe(false)
      expect(isBattleHexReachable(6, 2)).toBe(true)
    })

    test('with Basic Ballistics the catapult shoots once a round', async () => {
      await attackAndAimAt(anAttackScenario({ level: 'BASIC' }), UPPER_WALL, {
        rolls: TWO_SHOTS_AIMED
      })

      expect(catapultMessages()).toEqual(['The Catapult hits the Upper Wall.'])
    })

    test("both shots go at the same segment: two 1-point hits leave a Castle's Upper Wall at 1, and the next point destroys it", async () => {
      const { user } = await attackAndAimAt(
        anAttackScenario({ level: 'ADVANCED', buildings: CASTLE }),
        UPPER_WALL,
        { rolls: [...TWO_SHOTS_AIMED, HITS, ONE_POINT] }
      )
      const afterTheFirstRound = catapultMessages()
      await passTheRound(user)

      await aimAt(user, UPPER_WALL)

      expect(afterTheFirstRound).toEqual([
        'The Catapult hits the Upper Wall.',
        'The Catapult hits the Upper Wall.'
      ])
      expect(catapultMessages().at(2)).toBe('The Catapult destroys the Upper Wall.')
    })

    test('when the first shot destroys the Upper Wall in a Castle the second goes at the nearest standing part by its roll, here the Upper Tower', async () => {
      const { user } = await attackAndAimAt(
        anAttackScenario({ level: 'ADVANCED', buildings: CASTLE }),
        UPPER_WALL,
        {
          rolls: [
            ...TWO_POINTS_ON_THE_PART_AIMED_AT_AND_TWO_ON_ITS_NEIGHBOUR,
            ...[HITS, ONE_POINT],
            ...[AT_THE_SECOND_OF_TWO, HITS, ONE_POINT]
          ]
        }
      )
      await passTheRound(user)

      await aimAt(user, UPPER_WALL)

      expect(catapultMessages().slice(2)).toEqual([
        'The Catapult destroys the Upper Wall.',
        'The Catapult hits the Upper Tower.'
      ])
    })

    test('the Keep counts as near the Lower Wall as the Mid-Lower Wall and the Lower Tower: the second shot goes at it by its roll', async () => {
      const { user } = await attackAndAimAt(
        anAttackScenario({ level: 'ADVANCED', buildings: CASTLE }),
        LOWER_WALL,
        {
          rolls: [
            ...TWO_POINTS_ON_THE_PART_AIMED_AT_AND_TWO_ON_ITS_NEIGHBOUR,
            ...[HITS, ONE_POINT],
            ...[AT_THE_SECOND_OF_THREE, HITS, ONE_POINT]
          ]
        }
      )
      await passTheRound(user)

      await aimAt(user, LOWER_WALL)

      expect(catapultMessages().slice(2)).toEqual([
        'The Catapult destroys the Lower Wall.',
        'The Catapult hits the Keep.'
      ])
    })

    test('when the first shot destroys the last standing part no second stone flies, and the first stack acts', async () => {
      const { user } = await attackAndAimAt(anAttackScenario({ level: 'EXPERT' }), UPPER_WALL)
      await passTheRound(user)
      await aimAt(user, MID_LOWER_WALL)
      await passTheRound(user)

      await aimAt(user, DRAWBRIDGE)

      expect(catapultMessages()).toEqual([
        'The Catapult destroys the Upper Wall.',
        'The Catapult destroys the Mid-Upper Wall.',
        'The Catapult destroys the Mid-Lower Wall.',
        'The Catapult destroys the Lower Wall.',
        'The Catapult destroys the Drawbridge.'
      ])
      expect(readActiveStack()).toEqual({ stack: 'Runner 1', row: 6, column: 1 })
    })
  })

  describe('chances and damage', () => {
    test('with Basic Ballistics a roll of 0.55 hits the segment aimed at', async () => {
      await attackAndAimAt(anAttackScenario({ level: 'BASIC' }), UPPER_WALL, {
        rolls: [WITHIN_BASIC_HIT_CHANCE, ONE_POINT]
      })

      expect(catapultMessages()).toEqual(['The Catapult hits the Upper Wall.'])
    })

    test('without Ballistics the same roll misses onto the nearest standing segment', async () => {
      await attackTown(anAttackScenario(), {
        rolls: [AT_THE_FIRST, WITHIN_BASIC_HIT_CHANCE, ONE_POINT_WITHOUT_THE_SKILL]
      })

      expect(catapultMessages()).toEqual(['The Catapult hits the Mid-Upper Wall.'])
    })

    test('with Basic Ballistics a roll of 0.65 misses onto the nearest standing segment', async () => {
      await attackAndAimAt(anAttackScenario({ level: 'BASIC' }), UPPER_WALL, {
        rolls: [PAST_BASIC_HIT_CHANCE, ONE_POINT]
      })

      expect(catapultMessages()).toEqual(['The Catapult hits the Mid-Upper Wall.'])
    })

    test('with Expert Ballistics a roll of 0.7 hits the segment aimed at', async () => {
      await attackAndAimAt(anAttackScenario({ level: 'EXPERT' }), UPPER_WALL, {
        rolls: [WITHIN_EXPERT_HIT_CHANCE, LOWEST_DAMAGE]
      })

      expect(catapultMessages().at(0)).toBe('The Catapult destroys the Upper Wall.')
    })

    test('with Basic Ballistics the lowest damage roll still does 1 point', async () => {
      await attackAndAimAt(anAttackScenario({ level: 'BASIC' }), UPPER_WALL, {
        rolls: [HITS, LOWEST_DAMAGE]
      })

      expect(wallAt(UPPER_WALL)).toBe('Damaged wall')
      expect(catapultMessages()).toEqual(['The Catapult hits the Upper Wall.'])
    })

    test("with Basic Ballistics a damage roll of 0.5 does 2 points, destroying a Fort's segment", async () => {
      await attackAndAimAt(anAttackScenario({ level: 'BASIC' }), UPPER_WALL, {
        rolls: [HITS, TWO_POINTS]
      })

      expect(catapultMessages()).toEqual(['The Catapult destroys the Upper Wall.'])
    })

    test("with Expert Ballistics the lowest damage roll does 2 points, destroying a Fort's segment", async () => {
      await attackAndAimAt(anAttackScenario({ level: 'EXPERT' }), UPPER_WALL, {
        rolls: [HITS, LOWEST_DAMAGE]
      })

      expect(catapultMessages().at(0)).toBe('The Catapult destroys the Upper Wall.')
    })
  })

  describe('a computer attacker', () => {
    test("blue's hero with Advanced Ballistics attacking the player's town shoots twice a round", async () => {
      const app = await setupApp(aComputerAttackScenario('ADVANCED'), {
        rolls: TWO_SHOTS_AIMING_ITSELF_AT_THE_UPPER_WALL
      })
      await clickEndTurn(app.user)
      await waitMs(COMPUTER_TURN_MS)

      expect(catapultMessages()).toEqual([
        'The Catapult hits the Upper Wall.',
        'The Catapult destroys the Upper Wall.'
      ])
    })
  })

  describe('reloading', () => {
    test('a reload while the second stone flies shows the walls as both shots left them, and neither is fired again', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await attackTown(anAttackScenario({ level: 'ADVANCED' }), {
        rolls: TWO_SHOTS_AIMED,
        stepDelayMs: 100,
        eventLog
      })
      await clickBattleHex(user, UPPER_WALL.row, UPPER_WALL.column)
      await waitMs(FLIGHT_MS * 1.5)

      await setupApp(anAttackScenario({ level: 'ADVANCED' }), {
        rolls: TWO_SHOTS_AIMED,
        eventLog
      })
      await waitMs(1000)

      expect(wallAt(UPPER_WALL)).toBe('Destroyed wall')
      expect(wallAt(MID_UPPER_WALL)).toBe('Wall')
      expect(catapultMessages()).toEqual([
        'The Catapult hits the Upper Wall.',
        'The Catapult destroys the Upper Wall.'
      ])
    })
  })
})
