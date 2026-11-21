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
  countCatapultStones,
  isBattleHexReachable,
  LOWEST_ROLLS,
  moveActiveStackTo,
  readActiveStack,
  readBattleCatapult,
  readBattleStacks,
  readBattleWalls,
  readCombatMessages,
  readWallHits
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
const RAIDER = aSturdyCreature('Raider').withSpeed(20).withAiValue(1000).build()
const SLUG = aSturdyCreature('Slug').withSpeed(1).withAiValue(1).build()
const BRUTE = aSturdyCreature('Brute').withSpeed(1).withAiValue(1000).build()
// It shoots from where it starts rather than walk out of the town.
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
  monsters: { ...readGameData('monsters.json'), RUNNER, RAIDER, SLUG, BRUTE, ARCHER },
  spells: readGameData('spells.json'),
  heroes: readGameData('heroes.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const stack = (creature, count = 1) => ({ creature, count })

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

// Rows and columns from 1, as the battle screen shows them.
const CATAPULT = { row: 8, column: 1 }
const UPPER_WALL = { row: 2, column: 12 }
const MID_UPPER_WALL = { row: 5, column: 10 }
const MID_LOWER_WALL = { row: 8, column: 11 }
const LOWER_WALL = { row: 11, column: 12 }
const DRAWBRIDGE = [
  { row: 6, column: 10 },
  { row: 6, column: 11 }
]
const BEHIND_THE_MID_UPPER_WALL = { row: 5, column: 11 }
const BEHIND_THE_DRAWBRIDGE = { row: 6, column: 12 }

// What the catapult rolls, in turn: which of the equally weakest segments it aims at (when there
// is more than one), whether it hits, and how hard. Once the rolls run out they are the lowest:
// the first of the weakest segments, hit, for no damage.
const AT_THE_FIRST = 0
const AT_THE_SECOND = 0.25
const AT_THE_THIRD = 0.5
const HITS = 0
const MISSES = 0.9
const NO_DAMAGE = 0
const ONE_POINT = 0.5
const TWO_POINTS = 0.9

function catapultRolls(...values) {
  const rolls = [...values]
  return () => rolls.shift() ?? 0
}

const ALL_FOUR_SEGMENTS_DESTROYED = [
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[HITS, TWO_POINTS]
]
const ALL_DESTROYED = [...ALL_FOUR_SEGMENTS_DESTROYED, HITS, TWO_POINTS]

const wallAt = (hex) =>
  readBattleWalls().find(({ row, column }) => row === hex.row && column === hex.column)?.wall

const drawbridgeWalls = () => DRAWBRIDGE.map(wallAt)

const catapultMessages = () =>
  readCombatMessages().filter((message) => message.startsWith('The Catapult'))

// The player's hero attacks blue's town; its entrance is at (4, 3), the hero two tiles below it.
const TOWN_ENTRANCE = { x: 4, y: 3 }

const aBlueTown = ({ buildings = ['FORT'], garrison = [stack('ARCHER')] } = {}) =>
  aTown()
    .named('Kirkwall')
    .ownedBy('blue')
    .withBuildings(buildings)
    .withGarrison(garrison)
    .at(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)

const anAttackScenario = ({ army = [stack('RUNNER')], town = aBlueTown() } = {}) =>
  aScenario()
    .withSize(9, 7)
    .withEntities(aHero().withPrimarySkills(NO_SKILLS).withArmy(army).at(4, 5), town)
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

// The player's stack defends and blue's stacks play their turns, and the next round starts.
async function passTheRound(user) {
  await clickBattleButton(user, 'Defend')
  await waitMs(1000)
}

async function passRounds(user, rounds) {
  for (let round = 0; round < rounds; round += 1) {
    await passTheRound(user)
  }
}

// Blue's hero attacks the player's town during blue's turn. The town's gate is at (20, 2), blue's
// hero three tiles below it; the player's other hero is walled in by rock far away.
const COMPUTER_TURN_MS = 2000
const PLAYERS_GATE = { x: 20, y: 2 }

const aComputerAttackScenario = ({ garrison, blueArmy }) =>
  aScenario()
    .withSize(30, 6)
    .withRockAround(2, 5)
    .withEntities(
      aHero().withId('hero-5').withArmy(ARMY_THAT_WINS).at(2, 5),
      aTown()
        .withId('town-1')
        .named('Whitemoon')
        .ownedByPlayer()
        .withBuildings(['FORT'])
        .withGarrison(garrison)
        .at(PLAYERS_GATE.x, PLAYERS_GATE.y),
      aHero()
        .withId('hero-2')
        .withName('Valeska')
        .ownedBy('blue')
        .withPrimarySkills(NO_SKILLS)
        .withArmy(blueArmy)
        .at(20, 5)
    )
    .withDefinitions(definitions)

async function defendAgainstBlue(scenario, options) {
  const app = await setupApp(scenario, options)
  await clickEndTurn(app.user)
  await waitMs(COMPUTER_TURN_MS)
  return app
}

describe('siege catapult behavior', () => {
  describe('which battles have the catapult', () => {
    test('when the hero attacks a town with a Fort then their catapult stands at row 8, column 1', async () => {
      await attackTown()

      expect(readBattleCatapult()).toEqual(CATAPULT)
    })

    test('a battle at a town without a Fort has no catapult', async () => {
      await attackTown(anAttackScenario({ town: aBlueTown({ buildings: [] }) }))

      expect(readBattleCatapult()).toBeNull()
    })
  })

  describe('its shots', () => {
    const FLIGHT_MS = 400

    test('as the battle opens a stone flies from the catapult, and the wall it flies at stays as it was until it lands', async () => {
      await setupApp(anAttackScenario(), {
        rolls: [AT_THE_FIRST, HITS, ONE_POINT],
        stepDelayMs: 100
      })
      confirmTileClickByDispatch(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
      await waitMs(FLIGHT_MS / 2)

      expect(countCatapultStones()).toBe(1)
      expect(wallAt(UPPER_WALL)).toBe('Wall')
      expect(catapultMessages()).toEqual([])
    })

    test('when the stone lands the Upper Wall is shown damaged with the hit on it, and the log says the Catapult hits it', async () => {
      await setupApp(anAttackScenario(), {
        rolls: [AT_THE_FIRST, HITS, ONE_POINT],
        stepDelayMs: 100
      })
      confirmTileClickByDispatch(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
      await waitMs(FLIGHT_MS + 50)

      expect(countCatapultStones()).toBe(0)
      expect(wallAt(UPPER_WALL)).toBe('Damaged wall')
      expect(readWallHits()).toEqual([{ hit: 'Stone hit: damaged', ...UPPER_WALL }])
      expect(catapultMessages()).toEqual(['The Catapult hits the Upper Wall.'])
    })

    test('the first stack acts once the stone has landed', async () => {
      await setupApp(anAttackScenario(), {
        rolls: [AT_THE_FIRST, HITS, ONE_POINT],
        stepDelayMs: 100
      })
      confirmTileClickByDispatch(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
      await waitMs(FLIGHT_MS / 2)
      const reachableInFlight = isBattleHexReachable(6, 2)

      await waitMs(FLIGHT_MS)

      expect(reachableInFlight).toBe(false)
      expect(isBattleHexReachable(6, 2)).toBe(true)
    })

    test('a shot that does no damage shows the hit on the wall and leaves it standing, and the log says so', async () => {
      await attackTown(anAttackScenario(), { rolls: [AT_THE_FIRST, HITS, NO_DAMAGE] })

      expect(wallAt(UPPER_WALL)).toBe('Wall')
      expect(readWallHits()).toEqual([{ hit: 'Stone hit: no damage', ...UPPER_WALL }])
      expect(catapultMessages()).toEqual(['The Catapult hits the Upper Wall, but does no damage.'])
    })

    test("a Fort's segment hit for 2 is destroyed with the hit on it, and the log says the Catapult destroys it", async () => {
      await attackTown(anAttackScenario(), { rolls: [AT_THE_FIRST, HITS, TWO_POINTS] })

      expect(wallAt(UPPER_WALL)).toBe('Destroyed wall')
      expect(readWallHits()).toEqual([{ hit: 'Stone hit: destroyed', ...UPPER_WALL }])
      expect(catapultMessages()).toEqual(['The Catapult destroys the Upper Wall.'])
    })

    test("a Castle's segment hit for 2 still stands, damaged, and the next point destroys it", async () => {
      const { user } = await attackTown(
        anAttackScenario({ town: aBlueTown({ buildings: ['FORT', 'CITADEL', 'CASTLE'] }) }),
        { rolls: [AT_THE_FIRST, HITS, TWO_POINTS, HITS, ONE_POINT] }
      )
      const afterTwoPoints = wallAt(UPPER_WALL)

      await passTheRound(user)

      expect(afterTwoPoints).toBe('Damaged wall')
      expect(wallAt(UPPER_WALL)).toBe('Destroyed wall')
    })

    test('the catapult shoots once a round: again as the second round starts, not on each stack turn', async () => {
      const { user } = await attackTown(
        anAttackScenario({ army: [stack('RUNNER'), stack('RUNNER')] })
      )
      await clickBattleButton(user, 'Defend')
      await waitMs(1000)
      const afterOneStack = catapultMessages().length

      await passTheRound(user)

      expect(afterOneStack).toBe(1)
      expect(catapultMessages()).toHaveLength(2)
    })

    test('after a segment is damaged the next shot goes at that segment', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [AT_THE_THIRD, HITS, ONE_POINT, HITS, ONE_POINT]
      })

      await passTheRound(user)

      expect(catapultMessages()).toEqual([
        'The Catapult hits the Mid-Lower Wall.',
        'The Catapult destroys the Mid-Lower Wall.'
      ])
      expect(wallAt(MID_LOWER_WALL)).toBe('Destroyed wall')
    })

    test('a missed shot hits the nearest standing segment: one aimed at the Upper Wall hits the Mid-Upper Wall', async () => {
      await attackTown(anAttackScenario(), { rolls: [AT_THE_FIRST, MISSES, ONE_POINT] })

      expect(wallAt(UPPER_WALL)).toBe('Wall')
      expect(wallAt(MID_UPPER_WALL)).toBe('Damaged wall')
      expect(catapultMessages()).toEqual(['The Catapult hits the Mid-Upper Wall.'])
    })

    test('with one segment left a missed shot still hits it', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...ALL_FOUR_SEGMENTS_DESTROYED.slice(0, 9), MISSES, ONE_POINT]
      })

      await passRounds(user, 3)

      expect(wallAt(LOWER_WALL)).toBe('Damaged wall')
      expect(catapultMessages().at(-1)).toBe('The Catapult hits the Lower Wall.')
    })

    test('once all four segments are down it shoots the drawbridge, which destroyed stays open', async () => {
      const { user } = await attackTown(anAttackScenario(), { rolls: ALL_DESTROYED })

      await passRounds(user, 4)

      expect(drawbridgeWalls()).toEqual(['Destroyed drawbridge', 'Destroyed drawbridge'])
      expect(catapultMessages().at(-1)).toBe('The Catapult destroys the Drawbridge.')
    })

    test('with the walls and the drawbridge all destroyed the catapult does nothing, and the round goes on', async () => {
      const { user } = await attackTown(anAttackScenario(), { rolls: ALL_DESTROYED })
      await passRounds(user, 4)

      await passTheRound(user)

      expect(catapultMessages()).toHaveLength(5)
      expect(readActiveStack()).toEqual({ stack: 'Runner 1', row: 6, column: 1 })
    })

    test("blue's hero attacking the player's town has a catapult that shoots the player's walls", async () => {
      await defendAgainstBlue(
        aComputerAttackScenario({ garrison: [stack('RUNNER')], blueArmy: [stack('BRUTE')] }),
        { rolls: [AT_THE_FIRST, HITS, ONE_POINT] }
      )

      expect(readBattleCatapult()).toEqual(CATAPULT)
      expect(wallAt(UPPER_WALL)).toBe('Damaged wall')
    })
  })

  describe('the broken walls', () => {
    const MID_UPPER_WALL_DESTROYED = [AT_THE_SECOND, HITS, TWO_POINTS]

    test("the attacker's walking stack walks through a destroyed segment to the hexes behind the walls", async () => {
      const { user } = await attackTown(anAttackScenario(), { rolls: MID_UPPER_WALL_DESTROYED })

      await moveActiveStackTo(user, BEHIND_THE_MID_UPPER_WALL.row, BEHIND_THE_MID_UPPER_WALL.column)

      expect(readBattleStacks()).toContainEqual({ stack: 'Runner 1', ...BEHIND_THE_MID_UPPER_WALL })
    })

    test("the attacker's walking stack walks in through the destroyed drawbridge", async () => {
      const { user } = await attackTown(anAttackScenario(), { rolls: ALL_DESTROYED })
      await passRounds(user, 4)

      await moveActiveStackTo(user, BEHIND_THE_DRAWBRIDGE.row, BEHIND_THE_DRAWBRIDGE.column)

      expect(readBattleStacks()).toContainEqual({ stack: 'Runner 1', ...BEHIND_THE_DRAWBRIDGE })
    })

    test("the defender's walking stack walks onto a destroyed segment", async () => {
      const { user } = await defendAgainstBlue(
        aComputerAttackScenario({ garrison: [stack('RUNNER')], blueArmy: [stack('BRUTE')] }),
        { rolls: MID_UPPER_WALL_DESTROYED }
      )

      await moveActiveStackTo(user, MID_UPPER_WALL.row, MID_UPPER_WALL.column)

      expect(readBattleStacks()).toContainEqual({ stack: 'Runner 1', ...MID_UPPER_WALL })
    })

    test("blue's walking stacks attacking the player's town come in through a destroyed segment", async () => {
      const { user } = await defendAgainstBlue(
        aComputerAttackScenario({ garrison: [stack('SLUG')], blueArmy: [stack('RAIDER')] }),
        { rolls: MID_UPPER_WALL_DESTROYED }
      )

      await passTheRound(user)

      const raider = readBattleStacks().find(({ stack }) => stack.startsWith('Raider'))
      expect(raider.column).toBeGreaterThan(MID_UPPER_WALL.column)
    })
  })

  describe('reloading', () => {
    test("when the page reloads then the walls are as the catapult left them, and it doesn't shoot again that round", async () => {
      const eventLog = createMemoryEventLog()
      await attackTown(anAttackScenario(), {
        rolls: [AT_THE_FIRST, HITS, TWO_POINTS, AT_THE_FIRST, HITS, ONE_POINT],
        eventLog
      })

      await setupApp(anAttackScenario(), { rolls: [AT_THE_FIRST, HITS, TWO_POINTS], eventLog })
      await waitMs(1000)

      expect(wallAt(UPPER_WALL)).toBe('Destroyed wall')
      expect(wallAt(MID_UPPER_WALL)).toBe('Wall')
      expect(catapultMessages()).toEqual(['The Catapult destroys the Upper Wall.'])
    })
  })
})
