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
  clickBattleHex,
  isBattleHexReachable,
  LOWEST_ROLLS,
  moveActiveStackTo,
  readActiveStack,
  readBattleStacks,
  readBattleWalls
} from './battle.utils.js'
import { ARMY_THAT_WINS, aCreatureDefinition, aHero, aScenario, aTown } from './builders.js'

// Nothing in these battles can hurt anything else, so a battle goes on as long as a test needs.
const aSturdyCreature = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(50)
    .withDamage({ min: 1, max: 1 })
    .withHealth(1000)

const RUNNER = aSturdyCreature('Runner').withSpeed(20).withAiValue(1).build()
const FLYER = aSturdyCreature('Flyer')
  .withSpeed(20)
  .withAiValue(1)
  .withAbilities(['flying'])
  .build()
const SLUG = aSturdyCreature('Slug').withSpeed(1).withAiValue(1).build()
const BRUTE = aSturdyCreature('Brute').withSpeed(1).withAiValue(1000).build()
const RAIDER = aSturdyCreature('Raider').withSpeed(20).withAiValue(1000).build()

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: { ...readGameData('monsters.json'), RUNNER, FLYER, SLUG, BRUTE, RAIDER },
  heroes: readGameData('heroes.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const stack = (creature, count = 1) => ({ creature, count })

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

// The walls stand one hex from row to row, rows and columns counted from 1 as the battle screen
// shows them; row 6 has the drawbridge's two hexes.
const SHUT_WALLS = [
  { wall: 'Wall', row: 1, column: 12 },
  { wall: 'Wall', row: 2, column: 12 },
  { wall: 'Wall', row: 3, column: 11 },
  { wall: 'Wall', row: 4, column: 11 },
  { wall: 'Wall', row: 5, column: 10 },
  { wall: 'Drawbridge, shut', row: 6, column: 10 },
  { wall: 'Drawbridge, shut', row: 6, column: 11 },
  { wall: 'Wall', row: 7, column: 10 },
  { wall: 'Wall', row: 8, column: 11 },
  { wall: 'Wall', row: 9, column: 11 },
  { wall: 'Wall', row: 10, column: 12 },
  { wall: 'Wall', row: 11, column: 12 }
]

const drawbridgeOf = (walls) => walls.filter(({ wall }) => wall.startsWith('Drawbridge'))

const IN_FRONT_OF_THE_DRAWBRIDGE = { row: 6, column: 9 }
const A_WALL = { row: 5, column: 10 }
const OUTER_DRAWBRIDGE = { row: 6, column: 10 }
const INNER_DRAWBRIDGE = { row: 6, column: 11 }
const BEHIND_THE_DRAWBRIDGE = { row: 6, column: 12 }
const BEHIND_A_WALL = { row: 2, column: 13 }

const reachableAmong = (hexes) =>
  hexes.filter(({ row, column }) => isBattleHexReachable(row, column))

// The player's hero attacks blue's town. Its entrance is at (4, 3); the hero starts two tiles below
// it. A lone stack starts on row 6: the attacker's in column 1, the defender's in column 15.
const TOWN_ENTRANCE = { x: 4, y: 3 }

const aBlueTown = ({ buildings = ['FORT'], garrison = [stack('RUNNER')] } = {}) =>
  aTown()
    .named('Kirkwall')
    .ownedBy('blue')
    .withBuildings(buildings)
    .withGarrison(garrison)
    .at(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)

const anAttackScenario = ({ army = [stack('RUNNER')], town = aBlueTown(), others = [] } = {}) =>
  aScenario()
    .withSize(9, 7)
    .withEntities(aHero().withArmy(army).at(4, 5), town, ...others)
    .withDefinitions(definitions)

const setupApp = (scenario, options = {}) =>
  setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { random: LOWEST_ROLLS, interactionModalTransitionMs: 0 },
    ...options
  })

async function attackTown(scenario, options) {
  const app = await setupApp(scenario, options)
  confirmTileClickByDispatch(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
  await waitMs()
  return app
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

async function defendAgainstBlue(scenario) {
  const app = await setupApp(scenario)
  await clickEndTurn(app.user)
  await waitMs(COMPUTER_TURN_MS)
  return app
}

// The player's Runner acts before blue's Brute.
const aRunnerDefending = () =>
  aComputerAttackScenario({ garrison: [stack('RUNNER')], blueArmy: [stack('BRUTE')] })

describe('siege walls behavior', () => {
  describe('which battles have walls', () => {
    test.each([
      ['Fort', ['FORT']],
      ['Citadel', ['FORT', 'CITADEL']],
      ['Castle', ['FORT', 'CITADEL', 'CASTLE']]
    ])('given a garrisoned town with a %s when the hero attacks it then the battlefield has the walls with the drawbridge shut', async (_, buildings) => {
      await attackTown(anAttackScenario({ town: aBlueTown({ buildings }) }))

      expect(readBattleWalls()).toEqual(SHUT_WALLS)
    })

    test('given a garrisoned town without a Fort when the hero attacks it then the battlefield has no walls', async () => {
      await attackTown(anAttackScenario({ town: aBlueTown({ buildings: [] }) }))

      expect(readBattleWalls()).toEqual([])
    })

    test('given a blue hero in a town with a Fort when the hero attacks the town then the battlefield has the walls', async () => {
      const blueHeroInTown = aHero()
        .withId('hero-2')
        .ownedBy('blue')
        .withArmy([stack('BRUTE')])
        .at(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)

      await attackTown(
        anAttackScenario({ town: aBlueTown({ garrison: [] }), others: [blueHeroInTown] })
      )

      expect(readBattleWalls()).toEqual(SHUT_WALLS)
    })

    test("given the player's town has a Fort when blue's hero attacks it then the player defends it behind the walls", async () => {
      await defendAgainstBlue(aRunnerDefending())

      expect({ walls: readBattleWalls(), active: readActiveStack() }).toEqual({
        walls: SHUT_WALLS,
        active: { stack: 'Runner 1', row: 6, column: 15 }
      })
    })

    test('given a siege when the page reloads then the battlefield still has the walls', async () => {
      const eventLog = createMemoryEventLog()
      await attackTown(anAttackScenario(), { eventLog })

      await setupApp(anAttackScenario(), { eventLog })

      expect(readBattleWalls()).toEqual(SHUT_WALLS)
    })
  })

  describe('attacking the walls', () => {
    test("the attacker's walking stack can't reach the walls, the shut drawbridge or the hexes behind them", async () => {
      await attackTown(anAttackScenario())

      expect(
        reachableAmong([
          IN_FRONT_OF_THE_DRAWBRIDGE,
          A_WALL,
          OUTER_DRAWBRIDGE,
          BEHIND_THE_DRAWBRIDGE,
          BEHIND_A_WALL
        ])
      ).toEqual([IN_FRONT_OF_THE_DRAWBRIDGE])
    })

    test("clicking a hex behind the walls leaves the attacker's walking stack where it is", async () => {
      const { user } = await attackTown(anAttackScenario())

      await clickBattleHex(user, 6, 12)

      expect(readBattleStacks()).toContainEqual({ stack: 'Runner 1', row: 6, column: 1 })
    })

    test("the attacker's flying stack flies over the walls and lands behind them", async () => {
      const { user } = await attackTown(anAttackScenario({ army: [stack('FLYER')] }))

      await moveActiveStackTo(user, 6, 13)

      expect(readBattleStacks()).toContainEqual({ stack: 'Flyer 1', row: 6, column: 13 })
    })

    test("the attacker's flying stack can't land on a wall or on the shut drawbridge", async () => {
      await attackTown(anAttackScenario({ army: [stack('FLYER')] }))

      expect(reachableAmong([A_WALL, OUTER_DRAWBRIDGE, INNER_DRAWBRIDGE])).toEqual([])
    })

    // Blue's Raider acts first but can't get at the player's Slug behind the walls.
    test("blue's walking stacks attacking the player's town don't get past the walls, and their turn passes", async () => {
      await defendAgainstBlue(
        aComputerAttackScenario({ garrison: [stack('SLUG')], blueArmy: [stack('RAIDER')] })
      )

      expect({
        raider: readBattleStacks().find(({ stack }) => stack === 'Raider 1'),
        active: readActiveStack()
      }).toEqual({
        raider: { stack: 'Raider 1', row: 6, column: 1 },
        active: { stack: 'Slug 1', row: 6, column: 15 }
      })
    })
  })

  describe('the drawbridge', () => {
    test("the defender's walking stack standing on the drawbridge holds it open", async () => {
      const { user } = await defendAgainstBlue(aRunnerDefending())

      await moveActiveStackTo(user, 6, 11)

      expect(drawbridgeOf(readBattleWalls())).toEqual([
        { wall: 'Drawbridge, open', row: 6, column: 10 },
        { wall: 'Drawbridge, open', row: 6, column: 11 }
      ])
    })

    test("the defender's walking stack goes out through the drawbridge, which shuts behind it", async () => {
      const { user } = await defendAgainstBlue(aRunnerDefending())

      await moveActiveStackTo(user, 6, 8)

      expect({
        runner: readBattleStacks().find(({ stack }) => stack === 'Runner 1'),
        drawbridge: drawbridgeOf(readBattleWalls())
      }).toEqual({
        runner: { stack: 'Runner 1', row: 6, column: 8 },
        drawbridge: [
          { wall: 'Drawbridge, shut', row: 6, column: 10 },
          { wall: 'Drawbridge, shut', row: 6, column: 11 }
        ]
      })
    })

    test("the defender's flying stack flies out over the walls", async () => {
      const { user } = await defendAgainstBlue(
        aComputerAttackScenario({ garrison: [stack('FLYER')], blueArmy: [stack('BRUTE')] })
      )

      await moveActiveStackTo(user, 2, 8)

      expect(readBattleStacks()).toContainEqual({ stack: 'Flyer 1', row: 2, column: 8 })
    })

    // Blue's Raider acts before the player's Brute and walks out through the drawbridge to attack it
    // from the next hex.
    test("blue's garrison comes out through the drawbridge to attack the player's stack", async () => {
      await attackTown(
        anAttackScenario({
          army: [stack('BRUTE')],
          town: aBlueTown({ garrison: [stack('RAIDER')] })
        })
      )

      expect(readBattleStacks()).toContainEqual({ stack: 'Raider 1', row: 6, column: 2 })
    })
  })
})
