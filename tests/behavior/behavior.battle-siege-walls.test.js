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
  isBattleHexReachable,
  LOWEST_ROLLS,
  moveActiveStackTo,
  pickSpell,
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

// One hit kills one, so a Frail dies to the first blow struck at it.
const aFrailCreature = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(0)
    .withDamage({ min: 1, max: 1 })
    .withHealth(1)
    .withAiValue(1)
const FRAIL = aFrailCreature('Frail').withSpeed(19).build()
const WISP = aFrailCreature('Wisp').withSpeed(19).withHealth(2).withAiValue(1000).build()
const MOTH = aFrailCreature('Moth').withSpeed(30).withAbilities(['flying']).build()

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: {
    ...readGameData('monsters.json'),
    RUNNER,
    FLYER,
    SLUG,
    BRUTE,
    RAIDER,
    FRAIL,
    WISP,
    MOTH
  },
  spells: readGameData('spells.json'),
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

const drawbridge = (state) => [
  { wall: `Drawbridge, ${state}`, row: 6, column: 10 },
  { wall: `Drawbridge, ${state}`, row: 6, column: 11 }
]
const SHUT_DRAWBRIDGE = drawbridge('shut')
const OPEN_DRAWBRIDGE = drawbridge('open')

const IN_FRONT_OF_THE_DRAWBRIDGE = { row: 6, column: 9 }
const A_WALL = { row: 5, column: 10 }
const OUTER_DRAWBRIDGE = { row: 6, column: 10 }
const INNER_DRAWBRIDGE = { row: 6, column: 11 }
const BEHIND_THE_DRAWBRIDGE = { row: 6, column: 12 }
const BEHIND_A_WALL = { row: 2, column: 13 }

const isReachable = ({ row, column }) => isBattleHexReachable(row, column)

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

const aComputerAttackScenario = ({ garrison, blueArmy, others = [] }) =>
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
        .at(20, 5),
      ...others
    )
    .withDefinitions(definitions)

// The active stack moves and the other side plays its turns.
async function moveAndWait(user, { row, column }) {
  await moveActiveStackTo(user, row, column)
  await waitMs(1000)
}

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

      expect(readActiveStack()).toEqual({ stack: 'Runner 1', row: 6, column: 15 })
      expect(readBattleWalls()).toEqual(SHUT_WALLS)
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

      expect(isReachable(IN_FRONT_OF_THE_DRAWBRIDGE)).toBe(true)
      expect(isReachable(A_WALL)).toBe(false)
      expect(isReachable(OUTER_DRAWBRIDGE)).toBe(false)
      expect(isReachable(BEHIND_THE_DRAWBRIDGE)).toBe(false)
      expect(isReachable(BEHIND_A_WALL)).toBe(false)
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

      expect(isReachable(A_WALL)).toBe(false)
      expect(isReachable(OUTER_DRAWBRIDGE)).toBe(false)
      expect(isReachable(INNER_DRAWBRIDGE)).toBe(false)
    })

    // Blue's Raider acts first but can't get at the player's Slug behind the walls.
    test("blue's walking stacks attacking the player's town don't get past the walls, and their turn passes", async () => {
      await defendAgainstBlue(
        aComputerAttackScenario({ garrison: [stack('SLUG')], blueArmy: [stack('RAIDER')] })
      )

      expect(readBattleStacks()).toContainEqual({ stack: 'Raider 1', row: 6, column: 1 })
      expect(readActiveStack()).toEqual({ stack: 'Slug 1', row: 6, column: 15 })
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

      expect(readBattleStacks()).toContainEqual({ stack: 'Runner 1', row: 6, column: 8 })
      expect(drawbridgeOf(readBattleWalls())).toEqual([
        { wall: 'Drawbridge, shut', row: 6, column: 10 },
        { wall: 'Drawbridge, shut', row: 6, column: 11 }
      ])
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

    test("the defender's walking stack that went out comes back in through the drawbridge, which shuts behind it", async () => {
      const { user } = await defendAgainstBlue(aRunnerDefending())
      await moveAndWait(user, IN_FRONT_OF_THE_DRAWBRIDGE)

      await moveAndWait(user, BEHIND_THE_DRAWBRIDGE)

      expect(readBattleStacks()).toContainEqual({ stack: 'Runner 1', ...BEHIND_THE_DRAWBRIDGE })
      expect(drawbridgeOf(readBattleWalls())).toEqual(SHUT_DRAWBRIDGE)
    })

    // Blue's Raider comes out and attacks the player's Runner on column 5, and the drawbridge shuts
    // behind it.
    test("after the defender's stack went out and the drawbridge shut, the attacker's walking stack still can't get through it", async () => {
      const { user } = await attackTown(
        anAttackScenario({ town: aBlueTown({ garrison: [stack('RAIDER')] }) })
      )

      await moveAndWait(user, { row: 6, column: 5 })

      expect(readActiveStack()).toEqual({ stack: 'Runner 1', row: 6, column: 5 })
      expect(isReachable(OUTER_DRAWBRIDGE)).toBe(false)
      expect(isReachable(BEHIND_THE_DRAWBRIDGE)).toBe(false)
    })

    describe('a dead stack on it', () => {
      // The player's Flyer waits next to the drawbridge's outer hex. Blue's Frail comes out onto
      // that hex to attack it and dies to the Flyer's retaliation; blue's Slug stays behind.
      async function killFrailOnTheDrawbridge(options) {
        const app = await attackTown(
          anAttackScenario({
            army: [stack('FLYER'), stack('RUNNER')],
            town: aBlueTown({ garrison: [stack('FRAIL'), stack('SLUG')] })
          }),
          options
        )
        await moveAndWait(app.user, { row: 5, column: 9 })
        await moveAndWait(app.user, { row: 9, column: 2 })
        await clickBattleButton(app.user, 'Defend')
        await waitMs(1000)
        return app
      }

      test("the drawbridge stays open, and the attacker's walking stack walks through it behind the walls", async () => {
        const { user } = await killFrailOnTheDrawbridge()

        await moveActiveStackTo(user, BEHIND_THE_DRAWBRIDGE.row, BEHIND_THE_DRAWBRIDGE.column)

        expect(readBattleStacks()).toEqual(
          expect.arrayContaining([
            { stack: 'Dead Frail', ...OUTER_DRAWBRIDGE },
            { stack: 'Runner 1', ...BEHIND_THE_DRAWBRIDGE }
          ])
        )
        expect(drawbridgeOf(readBattleWalls())).toEqual(OPEN_DRAWBRIDGE)
      })

      test('when the page reloads then the drawbridge is still open', async () => {
        const eventLog = createMemoryEventLog()
        await killFrailOnTheDrawbridge({ eventLog })

        await setupApp(anAttackScenario(), { eventLog })

        expect(drawbridgeOf(readBattleWalls())).toEqual(OPEN_DRAWBRIDGE)
      })

      // Blue's Raider kills the player's Frail on the drawbridge, then walks in to the Slug.
      test("blue's walking stacks attacking the player's town come in through it", async () => {
        const { user } = await defendAgainstBlue(
          aComputerAttackScenario({
            garrison: [stack('FRAIL'), stack('SLUG')],
            blueArmy: [stack('RAIDER')]
          })
        )
        await moveAndWait(user, OUTER_DRAWBRIDGE)
        await clickBattleButton(user, 'Defend')
        await waitMs(1000)

        await clickBattleButton(user, 'Defend')
        await waitMs(1000)

        expect(readBattleStacks()).toEqual(
          expect.arrayContaining([
            { stack: 'Dead Frail', ...OUTER_DRAWBRIDGE },
            { stack: 'Raider 1', row: 9, column: 14 }
          ])
        )
      })

      // The player's hero defends the town. Blue's Brute kills the Moth, which flew out to it; the
      // hero then sacrifices the Runner, which stood on the drawbridge, to raise the Moth.
      test('a stack sacrificed on the drawbridge leaves no body there, and the drawbridge shuts', async () => {
        const hero = aHero()
          .withPrimarySkills({ ...NO_SKILLS, knowledge: 5 })
          .withSpellBook(true)
          .withSpells(['SACRIFICE'])
          .withArmy([stack('MOTH'), stack('RUNNER')])
          .at(PLAYERS_GATE.x, PLAYERS_GATE.y)
        const { user } = await defendAgainstBlue(
          aComputerAttackScenario({ garrison: [], blueArmy: [stack('BRUTE')], others: [hero] })
        )
        await moveAndWait(user, { row: 6, column: 2 })
        await moveAndWait(user, INNER_DRAWBRIDGE)

        await pickSpell(user, 'Sacrifice')
        await clickBattleHex(user, 6, 2)
        await clickBattleHex(user, INNER_DRAWBRIDGE.row, INNER_DRAWBRIDGE.column)
        await waitMs()

        expect(readBattleStacks()).toContainEqual({ stack: 'Moth 1', row: 6, column: 2 })
        expect(drawbridgeOf(readBattleWalls())).toEqual(SHUT_DRAWBRIDGE)
      })
    })

    describe('an attacker on it or in front of it', () => {
      test("the player's walking stack in front of the shut drawbridge keeps blue's walking garrison in, and its turn passes", async () => {
        const { user } = await attackTown(
          anAttackScenario({ town: aBlueTown({ garrison: [stack('RAIDER')] }) })
        )

        await moveAndWait(user, IN_FRONT_OF_THE_DRAWBRIDGE)

        expect(readBattleStacks()).toContainEqual({ stack: 'Raider 1', row: 6, column: 15 })
        expect(readActiveStack()).toEqual({ stack: 'Runner 1', ...IN_FRONT_OF_THE_DRAWBRIDGE })
      })

      // The player's Flyer draws blue's Raider out: first to the hex above and left of the one in
      // front of the drawbridge, then, from there, to the hex in front of it.
      test("blue's stack in front of the shut drawbridge keeps the player's walking stack off it", async () => {
        const { user } = await defendAgainstBlue(
          aComputerAttackScenario({
            garrison: [stack('FLYER'), stack('RUNNER')],
            blueArmy: [stack('RAIDER')]
          })
        )
        await moveAndWait(user, { row: 5, column: 9 })
        await moveAndWait(user, { row: 9, column: 14 })
        await moveAndWait(user, { row: 7, column: 9 })
        await moveAndWait(user, { row: 9, column: 13 })
        await clickBattleButton(user, 'Defend')

        expect(readBattleStacks()).toContainEqual({
          stack: 'Raider 1',
          ...IN_FRONT_OF_THE_DRAWBRIDGE
        })
        expect(readActiveStack()).toEqual({ stack: 'Runner 1', row: 9, column: 13 })
        expect(isReachable(INNER_DRAWBRIDGE)).toBe(false)
        expect(isReachable(OUTER_DRAWBRIDGE)).toBe(false)
      })

      // The player's Flyer draws blue's Wisp out, as above. The Wisp, of two health, dies to the
      // Flyer's second retaliation, in front of the drawbridge.
      test("blue's dead stack in front of the shut drawbridge doesn't keep the player's walking stack off it", async () => {
        const { user } = await defendAgainstBlue(
          aComputerAttackScenario({
            garrison: [stack('FLYER'), stack('RUNNER')],
            blueArmy: [stack('WISP'), stack('SLUG')]
          })
        )
        await moveAndWait(user, { row: 5, column: 9 })
        await moveAndWait(user, { row: 9, column: 14 })
        await moveAndWait(user, { row: 7, column: 9 })
        await moveAndWait(user, { row: 9, column: 13 })
        await clickBattleButton(user, 'Defend')

        expect(readBattleStacks()).toContainEqual({
          stack: 'Dead Wisp',
          ...IN_FRONT_OF_THE_DRAWBRIDGE
        })
        expect(readActiveStack()).toEqual({ stack: 'Runner 1', row: 9, column: 13 })
        expect(isReachable(OUTER_DRAWBRIDGE)).toBe(true)
      })

      // Blue's Raider attacks the player's Runner on the inner hex from the outer one; the Runner
      // steps back and the Raider follows it in.
      test("blue's stack on the drawbridge's outer hex holds it open once the defender's stack leaves, and walks in", async () => {
        const { user } = await defendAgainstBlue(
          aComputerAttackScenario({ garrison: [stack('RUNNER')], blueArmy: [stack('RAIDER')] })
        )
        await moveAndWait(user, INNER_DRAWBRIDGE)
        expect(readBattleStacks()).toContainEqual({ stack: 'Raider 1', ...OUTER_DRAWBRIDGE })

        await moveAndWait(user, { row: 6, column: 14 })

        expect(readBattleStacks()).toContainEqual({ stack: 'Raider 1', row: 6, column: 13 })
      })
    })
  })
})
