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
  attackBattleHexFrom,
  castSpellAt,
  clickBattleButton,
  countCatapultStones,
  isBattleHexReachable,
  LOWEST_ROLLS,
  moveActiveStackTo,
  readBattleResultsSide,
  readBattleStacks,
  readBattleTowers,
  readCombatMessages,
  readTowerArrows,
  waitForBattleResults
} from './battle.utils.js'
import {
  aCreatureDefinition,
  aHero,
  anArrowTower,
  aScenario,
  aTown,
  aTownDefinition
} from './builders.js'

const aCreature = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(0)
    .withDamage({ min: 1, max: 1 })
    .withHealth(1000)
    .withSpeed(1)
    .withAiValue(1)

const ONE_TOWER_SHOT_KILLS_ONE = 10

const SLUG = aCreature('Slug').build()
const WISP = aCreature('Wisp').withHealth(ONE_TOWER_SHOT_KILLS_ONE).build()
const ARMOURED = aCreature('Armoured').withDefense(50).build()
const GUARD = aCreature('Guard').build()
const FLYER = aCreature('Flyer')
  .withHealth(ONE_TOWER_SHOT_KILLS_ONE)
  .withSpeed(20)
  .withAbilities(['flying'])
  .build()
const KILLER = aCreature('Killer')
  .withDamage({ min: 1000, max: 1000 })
  .withSpeed(20)
  .withAbilities(['flying'])
  .build()
const aShooter = (name) =>
  aCreature(name).withHealth(ONE_TOWER_SHOT_KILLS_ONE).withShots(99).withAbilities(['ranged'])
const SHOOTER = aShooter('Shooter').build()
const CHEAP = aShooter('Cheap').build()
const PRECIOUS = aShooter('Precious').withAiValue(1000).build()
const BRUTE = aCreature('Brute').withHealth(ONE_TOWER_SHOT_KILLS_ONE).withAiValue(1000).build()
const SENTRY = aCreature('Sentry').withSpeed(20).build()

const TOWERED = 'TOWERED'
const UNTOWERED = 'UNTOWERED'

const THE_TOWERS = [
  anArrowTower().build(),
  anArrowTower().upper().build(),
  anArrowTower().lower().build()
]

const definitionsWith = (towers = THE_TOWERS) => ({
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: {
    ...readGameData('monsters.json'),
    SLUG,
    WISP,
    ARMOURED,
    GUARD,
    FLYER,
    KILLER,
    SHOOTER,
    CHEAP,
    PRECIOUS,
    BRUTE,
    SENTRY
  },
  spells: readGameData('spells.json'),
  heroes: readGameData('heroes.json'),
  towns: {
    [TOWERED]: aTownDefinition().withName('Towered').withArrowTowers(towers).build(),
    [UNTOWERED]: aTownDefinition().withName('Untowered').build()
  },
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
})

const stack = (creature, count = 1) => ({ creature, count })

const FORT = ['FORT']
const CITADEL = ['FORT', 'CITADEL']
const CASTLE = ['FORT', 'CITADEL', 'CASTLE']

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

const KEEP = { tower: 'Keep', row: 6, column: 16 }
const UPPER_TOWER = { tower: 'Upper Tower', row: 1, column: 12 }
const LOWER_TOWER = { tower: 'Lower Tower', row: 11, column: 12 }
const BEHIND_THE_WALLS = { row: 2, column: 13 }
const GUARDS_START = { row: 6, column: 15 }
const FIRST_OF_TWO = { row: 3, column: 1 }
const NEXT_TO_THE_SLUG = { row: 6, column: 2 }

const LOWEST = 0
const HIGHEST = 0.99

function rollsOf(values = []) {
  const rolls = [...values]
  return () => rolls.shift() ?? 0
}

const FLIGHT_MS = 400

const setupApp = (scenario, { towerRolls, stepDelayMs = 0, eventLog } = {}) =>
  setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: {
      random: LOWEST_ROLLS,
      catapultRandom: LOWEST_ROLLS,
      towerRandom: rollsOf(towerRolls),
      battleStepDelayMs: stepDelayMs,
      interactionModalTransitionMs: 0
    },
    ...(eventLog ? { eventLog } : {})
  })

const TOWN_ENTRANCE = { x: 4, y: 3 }

const aBlueTown = ({ type = TOWERED, buildings = CITADEL } = {}) =>
  aTown()
    .withType(type)
    .named('Kirkwall')
    .ownedBy('blue')
    .withBuildings(buildings)
    .withGarrison([stack('GUARD')])
    .at(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)

const anAttackScenario = ({
  army = [stack('SLUG')],
  town = aBlueTown(),
  hero = aHero().withPrimarySkills(NO_SKILLS),
  defendingHero = null,
  towers
} = {}) =>
  aScenario()
    .withSize(9, 7)
    .withEntities(
      hero.withArmy(army).at(4, 5),
      town,
      ...(defendingHero ? [defendingHero.at(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)] : [])
    )
    .withDefinitions(definitionsWith(towers))

async function attackTown(scenario = anAttackScenario(), options) {
  const app = await setupApp(scenario, options)
  confirmTileClickByDispatch(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
  await waitMs()
  return app
}

async function passTheRound(user) {
  await clickBattleButton(user, 'Defend')
  await waitMs(1000)
}

const COMPUTER_TURN_MS = 2000
const PLAYERS_GATE = { x: 20, y: 2 }

const aDefenceScenario = ({ defender = null, garrison = [stack('GUARD')], blueArmy }) =>
  aScenario()
    .withSize(30, 6)
    .withRockAround(2, 5)
    .withEntities(
      ...(defender
        ? [defender.at(PLAYERS_GATE.x, PLAYERS_GATE.y)]
        : [
            aHero()
              .withId('hero-5')
              .withArmy([stack('SLUG')])
              .at(2, 5)
          ]),
      aTown()
        .withId('town-1')
        .withType(TOWERED)
        .named('Whitemoon')
        .ownedByPlayer()
        .withBuildings(CITADEL)
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
    .withDefinitions(definitionsWith())

async function defendAgainstBlue(scenario, options) {
  const app = await setupApp(scenario, options)
  await clickEndTurn(app.user)
  await waitMs(COMPUTER_TURN_MS)
  return app
}

const towerLines = () =>
  readCombatMessages().filter((message) => message.startsWith('The Arrow Tower'))

const stackOf = (name) => readBattleStacks().find(({ stack: each }) => each.startsWith(name))?.stack

const aCaster = (spell) =>
  aHero()
    .withName('Lord Haart')
    .withPrimarySkills({ attack: 0, defense: 0, power: 5, knowledge: 3 })
    .withSpellBook(true)
    .withSpells([spell])

describe('siege arrow towers behavior', () => {
  describe('which battles have them', () => {
    test('a town with a Citadel has the Keep and no other tower', async () => {
      await attackTown()

      expect(readBattleTowers()).toEqual([KEEP])
    })

    test('a town with a Castle has the Keep, the upper tower and the lower tower', async () => {
      await attackTown(anAttackScenario({ town: aBlueTown({ buildings: CASTLE }) }))

      expect(readBattleTowers()).toEqual([UPPER_TOWER, KEEP, LOWER_TOWER])
    })

    test('a town with only a Fort has no arrow towers', async () => {
      await attackTown(anAttackScenario({ town: aBlueTown({ buildings: FORT }) }))

      expect(readBattleTowers()).toEqual([])
    })
  })

  describe('their shots', () => {
    test('as the battle opens an arrow flies from the Keep, and its target is as it was until it lands', async () => {
      await setupApp(anAttackScenario({ army: [stack('WISP', 5)] }), { stepDelayMs: 100 })
      confirmTileClickByDispatch(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
      await waitMs(FLIGHT_MS / 2)

      expect(readTowerArrows()).toEqual(['Keep arrow'])
      expect(stackOf('Wisp')).toBe('Wisps 5')
      expect(towerLines()).toEqual([])
    })

    test('when the arrow lands its target loses creatures, and the log says what the Arrow Tower did', async () => {
      await setupApp(anAttackScenario({ army: [stack('WISP', 5)] }), { stepDelayMs: 100 })
      confirmTileClickByDispatch(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
      await waitMs(FLIGHT_MS + 50)

      expect(readTowerArrows()).toEqual([])
      expect(stackOf('Wisp')).toBe('Wisps 4')
      expect(towerLines()).toEqual(['The Arrow Tower does 10 damage. One Wisp perishes.'])
    })

    test('with a Castle the Keep, the upper tower and the lower tower shoot in turn, and then the catapult', async () => {
      await setupApp(anAttackScenario({ town: aBlueTown({ buildings: CASTLE }) }), {
        stepDelayMs: 100
      })
      confirmTileClickByDispatch(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
      await waitMs(FLIGHT_MS / 2)
      const first = readTowerArrows()
      await waitMs(FLIGHT_MS)
      const second = readTowerArrows()
      await waitMs(FLIGHT_MS)
      const third = readTowerArrows()
      await waitMs(FLIGHT_MS)

      expect(first).toEqual(['Keep arrow'])
      expect(second).toEqual(['Upper Tower arrow'])
      expect(third).toEqual(['Lower Tower arrow'])
      expect(countCatapultStones()).toBe(1)
    })

    test('the first stack acts only once every arrow and the stone have landed', async () => {
      await setupApp(anAttackScenario({ town: aBlueTown({ buildings: CASTLE }) }), {
        stepDelayMs: 100
      })
      confirmTileClickByDispatch(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
      await waitMs(FLIGHT_MS * 3.5)
      const reachableWhileTheStoneFlies = isBattleHexReachable(
        NEXT_TO_THE_SLUG.row,
        NEXT_TO_THE_SLUG.column
      )
      await waitMs(FLIGHT_MS)

      expect(reachableWhileTheStoneFlies).toBe(false)
      expect(isBattleHexReachable(NEXT_TO_THE_SLUG.row, NEXT_TO_THE_SLUG.column)).toBe(true)
    })

    test('they shoot again as the next round starts', async () => {
      const { user } = await attackTown()

      await passTheRound(user)

      expect(towerLines()).toEqual([
        'The Arrow Tower does 10 damage.',
        'The Arrow Tower does 10 damage.'
      ])
    })
  })

  describe('their damage', () => {
    test('the Keep does 10 at the lowest roll, to a stack across the battlefield', async () => {
      await attackTown(anAttackScenario(), { towerRolls: [LOWEST] })

      expect(towerLines()).toEqual(['The Arrow Tower does 10 damage.'])
    })

    test('the Keep does 20 at the highest roll', async () => {
      await attackTown(anAttackScenario(), { towerRolls: [HIGHEST] })

      expect(towerLines()).toEqual(['The Arrow Tower does 20 damage.'])
    })

    test('the upper and lower towers do 6 at the lowest roll', async () => {
      await attackTown(anAttackScenario({ town: aBlueTown({ buildings: CASTLE }) }), {
        towerRolls: [LOWEST, LOWEST, LOWEST]
      })

      expect(towerLines()).toEqual([
        'The Arrow Tower does 10 damage.',
        'The Arrow Tower does 6 damage.',
        'The Arrow Tower does 6 damage.'
      ])
    })

    test('the upper and lower towers do 12 at the highest roll', async () => {
      await attackTown(anAttackScenario({ town: aBlueTown({ buildings: CASTLE }) }), {
        towerRolls: [LOWEST, HIGHEST, HIGHEST]
      })

      expect(towerLines()).toEqual([
        'The Arrow Tower does 10 damage.',
        'The Arrow Tower does 12 damage.',
        'The Arrow Tower does 12 damage.'
      ])
    })

    test("the target's Defense doesn't lower it", async () => {
      await attackTown(anAttackScenario({ army: [stack('ARMOURED')] }))

      expect(towerLines()).toEqual(['The Arrow Tower does 10 damage.'])
    })

    test("the defending hero's Attack doesn't raise it", async () => {
      await attackTown(
        anAttackScenario({
          defendingHero: aHero()
            .withId('hero-2')
            .withName('Valeska')
            .ownedBy('blue')
            .withPrimarySkills({ attack: 50, defense: 0, power: 1, knowledge: 1 })
            .withArmy([stack('GUARD')])
        })
      )

      expect(towerLines()).toEqual(['The Arrow Tower does 10 damage.'])
    })

    test('Air Shield lowers it as it lowers any shot', async () => {
      const { user } = await attackTown(
        anAttackScenario({ army: [stack('SENTRY')], hero: aCaster('AIR_SHIELD') })
      )
      await castSpellAt(user, 'Air Shield', { row: 6, column: 1 })
      await waitMs()

      await passTheRound(user)

      expect(towerLines()).toEqual([
        'The Arrow Tower does 10 damage.',
        'The Arrow Tower does 7 damage.'
      ])
    })
  })

  describe('their targets', () => {
    test("a stack that can strike a defender on its next turn is shot before one that can't", async () => {
      await attackTown(anAttackScenario({ army: [stack('BRUTE', 2), stack('SHOOTER', 2)] }))

      expect(towerLines()).toEqual(['The Arrow Tower does 10 damage. One Shooter perishes.'])
    })

    test('of two stacks that can strike, the one inside the walls is shot first', async () => {
      const { user } = await attackTown(
        anAttackScenario({ army: [stack('FLYER', 3), stack('PRECIOUS', 3)] })
      )
      await moveActiveStackTo(user, BEHIND_THE_WALLS.row, BEHIND_THE_WALLS.column)
      await waitMs(1000)

      await passTheRound(user)

      expect(towerLines()).toEqual([
        'The Arrow Tower does 10 damage. One Precious perishes.',
        'The Arrow Tower does 10 damage. One Flyer perishes.'
      ])
    })

    test('otherwise the stack whose losses are worth the most is shot', async () => {
      await attackTown(anAttackScenario({ army: [stack('CHEAP', 2), stack('PRECIOUS', 2)] }))

      expect(towerLines()).toEqual(['The Arrow Tower does 10 damage. One Precious perishes.'])
    })

    test('a blinded stack is shot only after every stack that can act', async () => {
      const { user } = await defendAgainstBlue(
        aDefenceScenario({
          defender: aCaster('BLIND')
            .withId('hero-5')
            .withArmy([stack('SENTRY')]),
          garrison: [],
          blueArmy: [stack('PRECIOUS', 3), stack('CHEAP', 3)]
        })
      )
      await castSpellAt(user, 'Blind', FIRST_OF_TWO)
      await waitMs()

      await passTheRound(user)

      expect(towerLines()).toEqual([
        'The Arrow Tower does 10 damage. One Precious perishes.',
        'The Arrow Tower does 10 damage. One Cheap perishes.'
      ])
    })
  })

  describe('the battle', () => {
    test('the attacker wins once every defending stack is dead, with the towers still standing', async () => {
      const { user } = await attackTown(anAttackScenario({ army: [stack('KILLER')] }))

      await attackBattleHexFrom(user, GUARDS_START.row, GUARDS_START.column, 'left')
      await waitForBattleResults()

      expect(readBattleResultsSide('Attacker')).toEqual(['Hero', 'Victorious'])
    })

    test("when the player defends the town, its towers shoot the computer's stacks by themselves", async () => {
      await defendAgainstBlue(aDefenceScenario({ blueArmy: [stack('WISP', 5)] }))

      expect(towerLines()[0]).toBe('The Arrow Tower does 10 damage. One Wisp perishes.')
    })
  })

  describe("from the town's data", () => {
    test('a town type whose towers have other numbers in its data shoots for those numbers', async () => {
      await attackTown(
        anAttackScenario({
          towers: [anArrowTower().withDamage({ min: 30, max: 60 }).build()]
        })
      )

      expect(towerLines()).toEqual(['The Arrow Tower does 30 damage.'])
    })

    test('a town type without arrow towers in its data has none, whatever its fort', async () => {
      await attackTown(
        anAttackScenario({ town: aBlueTown({ type: UNTOWERED, buildings: CASTLE }) })
      )

      expect(readBattleTowers()).toEqual([])
    })
  })

  describe('reloading', () => {
    test('after a reload the losses from the towers are as they were', async () => {
      const eventLog = createMemoryEventLog()
      await attackTown(anAttackScenario({ army: [stack('WISP', 5)] }), { eventLog })

      await setupApp(anAttackScenario({ army: [stack('WISP', 5)] }), { eventLog })
      await waitMs(1000)

      expect(stackOf('Wisp')).toBe('Wisps 4')
    })

    test("a reload part way through a round doesn't make the towers shoot again", async () => {
      const eventLog = createMemoryEventLog()
      await attackTown(anAttackScenario(), { eventLog })

      await setupApp(anAttackScenario(), { eventLog })
      await waitMs(1000)

      expect(towerLines()).toEqual(['The Arrow Tower does 10 damage.'])
    })
  })
})
