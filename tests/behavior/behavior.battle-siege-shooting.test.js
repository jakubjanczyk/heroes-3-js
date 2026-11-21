// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import { clickEndTurn } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  getCursorOver,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import {
  getBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
  LOWEST_ROLLS,
  moveActiveStackTo,
  readBattleStacks,
  readCombatMessages,
  shootAt
} from './battle.utils.js'
import { ARMY_THAT_WINS, aCreatureDefinition, aHero, aScenario, aTown } from './builders.js'

// With no Attack or Defense on either side, a shot does 10 damage, and 5 when halved. Blue's hero
// with a Shooter is strong enough to attack the player's town.
const aShooter = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(50)
    .withDamage({ min: 10, max: 10 })
    .withHealth(1000)
    .withAiValue(1000)
    .withShots(10)
const SHOOTER = aShooter('Shooter').withSpeed(10).withAbilities(['ranged']).build()
const HAWK = aShooter('Hawk').withSpeed(20).withAbilities(['ranged', 'flying']).build()

const aTarget = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(0)
    .withDamage({ min: 1, max: 1 })
    .withHealth(1000)
    .withAiValue(1)
const SLUG = aTarget('Slug').withSpeed(1).build()
const RUNNER = aTarget('Runner').withSpeed(20).build()

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: { ...readGameData('monsters.json'), SHOOTER, HAWK, SLUG, RUNNER },
  spells: readGameData('spells.json'),
  heroes: readGameData('heroes.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const stack = (creature, count = 1) => ({ creature, count })

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

// Rows and columns from 1, as the battle screen shows them. Row 6 has the drawbridge's two hexes,
// columns 10 and 11; behind the walls is column 12 and on, on every row. A lone stack starts on
// row 6: the attacker's in column 1, the defender's in column 15.
const INNER_DRAWBRIDGE = { row: 6, column: 11 }
const BEHIND_A_WALL = { row: 2, column: 13 }

const SHOT = 'The Shooter does 10 damage.'
const HALVED_SHOT = 'The Shooter does 5 damage.'

// The catapult's shot as the next round starts comes after the shooter's in the log.
const lastCombatMessage = () =>
  readCombatMessages()
    .filter((message) => !message.startsWith('The Catapult'))
    .at(-1)

const positionOf = (name) => {
  const { row, column } = readBattleStacks().find(({ stack }) => stack.startsWith(name))
  return { row, column }
}

// The player's hero attacks blue's town; its entrance is at (4, 3), the hero two tiles below it.
const TOWN_ENTRANCE = { x: 4, y: 3 }

const anAttackScenario = ({ army, garrison, buildings = ['FORT'] }) =>
  aScenario()
    .withSize(9, 7)
    .withEntities(
      aHero().withPrimarySkills(NO_SKILLS).withArmy(army).at(4, 5),
      aTown()
        .named('Kirkwall')
        .ownedBy('blue')
        .withBuildings(buildings)
        .withGarrison(garrison)
        .at(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
    )
    .withDefinitions(definitions)

// The catapult's first shot, as the battle opens, aims at the third of the four equally strong
// segments, the Mid-Lower Wall, hits it and does 2 damage, which brings it down. Later shots do
// no damage.
const MID_LOWER_WALL_DESTROYED = [0.5, 0, 0.9]

function catapultRolls(values = []) {
  const rolls = [...values]
  return () => rolls.shift() ?? 0
}

const setupApp = (scenario, { catapult, ...options } = {}) =>
  setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: {
      random: LOWEST_ROLLS,
      catapultRandom: catapultRolls(catapult),
      interactionModalTransitionMs: 0
    },
    ...options
  })

async function attackTown(scenario, options) {
  const app = await setupApp(scenario, options)
  await loadAppStyles()
  confirmTileClickByDispatch(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
  await waitMs()
  return app
}

// The active stack moves and the other side plays its turns.
async function moveAndWait(user, { row, column }) {
  await moveActiveStackTo(user, row, column)
  await waitMs(1000)
}

// The Shooter walks to column 6; the Slug crawls one hex toward it, staying behind the walls,
// 9 hexes or less from the Shooter.
const SHOOTER_CLOSE_TO_THE_WALLS = { row: 6, column: 6 }

async function shooterCloseToTheWalls(options) {
  const app = await attackTown(
    anAttackScenario({ army: [stack('SHOOTER')], garrison: [stack('SLUG')] }),
    options
  )
  await moveAndWait(app.user, SHOOTER_CLOSE_TO_THE_WALLS)
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

// The player's Runner, faster than blue's Shooter, moves first; then blue's Shooter shoots it
// from column 1. Every hex behind the walls is more than 10 hexes from there, so blue's shots into
// the town are halved for the distance anyway.
async function blueShootsTheRunnerAt(hex) {
  const app = await setupApp(
    aComputerAttackScenario({ garrison: [stack('RUNNER')], blueArmy: [stack('SHOOTER')] })
  )
  await clickEndTurn(app.user)
  await waitMs(COMPUTER_TURN_MS)
  await moveAndWait(app.user, hex)
  return app
}

describe('siege shooting behavior', () => {
  describe("the attacker's shots at a stack behind the walls", () => {
    test('a shot from outside the walls at a stack behind them does half damage', async () => {
      const { user } = await shooterCloseToTheWalls()
      const slug = positionOf('Slug')

      await shootAt(user, slug.row, slug.column)

      expect(lastCombatMessage()).toBe(HALVED_SHOT)
    })

    test('the mouse over a stack behind the walls shows the halved damage and the broken arrow', async () => {
      const { user } = await shooterCloseToTheWalls()
      const slug = positionOf('Slug')

      await hoverBattleHex(user, slug.row, slug.column)

      expect(getBattleStatusBarText()).toBe('Shoot Slug (10 shots left, damage 5)')
      expect(getCursorOver(getBattleHex(slug.row, slug.column))).toBe('battle-shoot-penalty')
    })

    // 14 hexes away and behind the walls: halved once.
    test('a shot from far away at a stack behind the walls is halved only once', async () => {
      const { user } = await attackTown(
        anAttackScenario({ army: [stack('SHOOTER')], garrison: [stack('SLUG')] })
      )

      await shootAt(user, 6, 15)

      expect(lastCombatMessage()).toBe(HALVED_SHOT)
    })

    test('a flying shooter that flew over the walls shoots a stack behind them at full damage', async () => {
      const { user } = await attackTown(
        anAttackScenario({ army: [stack('HAWK')], garrison: [stack('SLUG')] })
      )
      await moveAndWait(user, BEHIND_A_WALL)
      const slug = positionOf('Slug')

      await shootAt(user, slug.row, slug.column)

      expect(lastCombatMessage()).toBe('The Hawk does 10 damage.')
    })

    test('a shot at a town without a Fort does full damage', async () => {
      const { user } = await attackTown(
        anAttackScenario({
          army: [stack('SHOOTER')],
          garrison: [stack('SLUG')],
          buildings: []
        })
      )
      await moveAndWait(user, SHOOTER_CLOSE_TO_THE_WALLS)
      const slug = positionOf('Slug')

      await shootAt(user, slug.row, slug.column)

      expect(lastCombatMessage()).toBe(SHOT)
    })

    test('when the page reloads then the mouse over the stack behind the walls still shows the halved damage', async () => {
      const eventLog = createMemoryEventLog()
      await shooterCloseToTheWalls({ eventLog })
      const slug = positionOf('Slug')

      const { user } = await setupApp(
        anAttackScenario({ army: [stack('SHOOTER')], garrison: [stack('SLUG')] }),
        { eventLog }
      )
      await hoverBattleHex(user, slug.row, slug.column)

      expect(getBattleStatusBarText()).toBe('Shoot Slug (10 shots left, damage 5)')
    })
  })

  describe('through the broken walls', () => {
    // From row 8, column 8 the way to the Slug goes through the gap where the Mid-Lower Wall was.
    const BY_THE_GAP = { row: 8, column: 8 }

    async function shooterBy(hex) {
      const app = await attackTown(
        anAttackScenario({ army: [stack('SHOOTER')], garrison: [stack('SLUG')] }),
        { catapult: MID_LOWER_WALL_DESTROYED }
      )
      await moveAndWait(app.user, hex)
      return app
    }

    test("a shot through a destroyed segment's gap at a stack behind it does full damage", async () => {
      const { user } = await shooterBy(BY_THE_GAP)
      const slug = positionOf('Slug')

      await shootAt(user, slug.row, slug.column)

      expect(lastCombatMessage()).toBe(SHOT)
    })

    test("the mouse over a stack behind a destroyed segment's gap shows the full damage", async () => {
      const { user } = await shooterBy(BY_THE_GAP)
      const slug = positionOf('Slug')

      await hoverBattleHex(user, slug.row, slug.column)

      expect(getBattleStatusBarText()).toBe('Shoot Slug (10 shots left, damage 10)')
      expect(getCursorOver(getBattleHex(slug.row, slug.column))).toBe('battle-shoot')
    })

    test('a shot at a stack behind a standing segment is still halved while another segment is destroyed', async () => {
      const { user } = await shooterBy(SHOOTER_CLOSE_TO_THE_WALLS)
      const slug = positionOf('Slug')

      await shootAt(user, slug.row, slug.column)

      expect(lastCombatMessage()).toBe(HALVED_SHOT)
    })
  })

  describe("blue's shots at the player's town", () => {
    test("blue's shooter shoots the player's stack on the drawbridge at full damage", async () => {
      await blueShootsTheRunnerAt(INNER_DRAWBRIDGE)

      expect(lastCombatMessage()).toBe(SHOT)
    })

    test("blue's shooter shoots the player's stack that came out of the walls at full damage", async () => {
      await blueShootsTheRunnerAt({ row: 6, column: 8 })

      expect(lastCombatMessage()).toBe(SHOT)
    })
  })

  describe("the defender's shots out of the town", () => {
    // The player's Runner walks to column 6; blue's Shooter, inside, shoots it from 9 hexes.
    test("blue's shooter behind the walls shoots the player's stack outside at full damage", async () => {
      const { user } = await attackTown(
        anAttackScenario({ army: [stack('RUNNER')], garrison: [stack('SHOOTER')] })
      )

      await moveAndWait(user, SHOOTER_CLOSE_TO_THE_WALLS)

      expect(lastCombatMessage()).toBe(SHOT)
    })
  })
})
