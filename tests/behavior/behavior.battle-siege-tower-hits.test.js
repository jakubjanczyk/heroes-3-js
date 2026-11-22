// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import {
  createMemoryEventLog,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  clickBattleButton,
  countCatapultStones,
  LOWEST_ROLLS,
  pickSpell,
  readActiveStack,
  readBattleTowers,
  readCombatMessages,
  readWallHits
} from './battle.utils.js'
import {
  aCreatureDefinition,
  aHero,
  anArrowTower,
  aScenario,
  aTown,
  aTownDefinition
} from './builders.js'
import { readSpellBookMessage } from './spell-book.utils.js'

const SLUG = aCreatureDefinition()
  .withName('Slug')
  .withNamePlural('Slugs')
  .withAttack(0)
  .withDefense(0)
  .withDamage({ min: 1, max: 1 })
  .withHealth(1000)
  .withSpeed(1)
  .withAiValue(1)
  .build()

const TOWERED = 'TOWERED'

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: { ...readGameData('monsters.json'), SLUG },
  spells: readGameData('spells.json'),
  heroes: readGameData('heroes.json'),
  towns: {
    [TOWERED]: aTownDefinition()
      .withName('Towered')
      .withArrowTowers([
        anArrowTower().build(),
        anArrowTower().upper().build(),
        anArrowTower().lower().build()
      ])
      .build()
  },
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const stack = (creature, count = 1) => ({ creature, count })

const CITADEL = ['FORT', 'CITADEL']
const CASTLE = ['FORT', 'CITADEL', 'CASTLE']

// Knowledge 5: 50 spell points, enough for two casts.
const CASTER_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 5 }
const EARTHQUAKE = 'Earthquake'
const NO_GOOD = 'An earthquake will do you no good unless there are town walls to damage.'

// Rows and columns from 1, as the battle screen shows them.
const KEEP = { row: 6, column: 16 }
const FIRST_SLUG = { stack: 'Slug 1', row: 6, column: 1 }

// The catapult's rolls, then the Earthquake's, share one sequence. The catapult's, in turn:
// which of the equally weakest segments it aims at (when there is more than one), whether it
// hits, and how hard.
const AT_THE_FIRST = 0
const AT_THE_SECOND = 0.9
const HITS = 0
const NO_DAMAGE = 0
const ONE_POINT = 0.5
const TWO_POINTS = 0.9
const A_HARMLESS_FIRST_SHOT = [AT_THE_FIRST, HITS, NO_DAMAGE]

// With a Citadel's two hit points a segment falls to one shot of two points, round after round.
const CITADEL_WALLS_DESTROYED = [
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[HITS, TWO_POINTS],
  ...[HITS, TWO_POINTS]
]
const ROUNDS_TO_DESTROY_CITADEL_WALLS = 4

// A Castle's segments have three hit points, so each takes two shots.
const CASTLE_WALLS_DESTROYED = [
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[HITS, TWO_POINTS],
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[HITS, TWO_POINTS],
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[HITS, TWO_POINTS],
  ...[HITS, TWO_POINTS],
  ...[HITS, TWO_POINTS],
  ...[HITS, TWO_POINTS]
]
const ROUNDS_TO_DESTROY_CASTLE_WALLS = 8

// Each Earthquake point lands on one of the parts that can still take it, counted from the top:
// in a Castle the Upper Tower, Upper Wall, Mid-Upper Wall, Drawbridge, Mid-Lower Wall, Lower
// Wall, Lower Tower and Keep; in a Citadel the same without the two towers.
const ON_THE_UPPER_TOWER = 0
const ON_THE_UPPER_WALL = 0.15
const ON_THE_CASTLES_LOWER_TOWER = 0.8
const ON_THE_LOWER_TOWER_ONCE_THE_KEEP_IS_FULL = 0.9
const ON_THE_KEEP = 0.95

const KEEP_SHOT = 'The Arrow Tower does 10 damage.'
const OTHER_TOWER_SHOT = 'The Arrow Tower does 6 damage.'

const aCaster = (level = 'BASIC') =>
  aHero()
    .withName('Lord Haart')
    .withPrimarySkills(CASTER_SKILLS)
    .withSecondarySkills([{ skill: 'EARTH_MAGIC', level }])
    .withSpellBook(true)
    .withSpells(['EARTHQUAKE'])
    .withArmy([stack('SLUG')])

const TOWN_ENTRANCE = { x: 4, y: 3 }

const anAttackScenario = ({ buildings = CITADEL, hero = aCaster() } = {}) =>
  aScenario()
    .withSize(9, 7)
    .withEntities(
      hero.at(4, 5),
      aTown()
        .withType(TOWERED)
        .named('Kirkwall')
        .ownedBy('blue')
        .withBuildings(buildings)
        .withGarrison([stack('SLUG')])
        .at(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
    )
    .withDefinitions(definitions)

function rollsOf(values) {
  const rolls = [...values]
  return () => rolls.shift() ?? 0
}

const setupApp = (scenario, { rolls = [], stepDelayMs = 0, eventLog } = {}) =>
  setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: {
      random: LOWEST_ROLLS,
      catapultRandom: rollsOf(rolls),
      towerRandom: LOWEST_ROLLS,
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

async function passRounds(user, rounds) {
  for (let round = 0; round < rounds; round += 1) {
    await clickBattleButton(user, 'Defend')
    await waitMs(1000)
  }
}

// The hit stays on the part it landed on for a second.
async function passRoundsAndLookAtTheHit(user, rounds) {
  await passRounds(user, rounds - 1)
  await clickBattleButton(user, 'Defend')
  await waitMs(500)
}

async function castEarthquake(user) {
  await pickSpell(user, EARTHQUAKE)
  await waitMs()
}

const towerNamed = (name) => readBattleTowers().find(({ tower }) => tower.endsWith(name))?.tower

const catapultMessages = () =>
  readCombatMessages().filter((message) => message.startsWith('The Catapult'))

const earthquakeMessages = () =>
  readCombatMessages().filter((message) => message.startsWith('The Earthquake'))

const towerLines = () =>
  readCombatMessages().filter((message) => message.startsWith('The Arrow Tower'))

const hitAt = (hex) =>
  readWallHits().find(({ row, column }) => row === hex.row && column === hex.column)?.hit

describe('siege towers hit behavior', () => {
  describe('the catapult at the towers', () => {
    test('with the four segments and the drawbridge down the stone flies to the Keep, which is shown damaged, and the log says the Catapult hits it', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...CITADEL_WALLS_DESTROYED, HITS, ONE_POINT]
      })

      await passRoundsAndLookAtTheHit(user, ROUNDS_TO_DESTROY_CITADEL_WALLS + 1)

      expect(towerNamed('Keep')).toBe('Damaged Keep')
      expect(hitAt(KEEP)).toBe('Stone hit: damaged')
      expect(catapultMessages().at(-1)).toBe('The Catapult hits the Keep.')
    })

    test('a second hit destroys the Keep, shown as a ruin, and the log says the Catapult destroys it', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...CITADEL_WALLS_DESTROYED, HITS, ONE_POINT, HITS, ONE_POINT]
      })

      await passRoundsAndLookAtTheHit(user, ROUNDS_TO_DESTROY_CITADEL_WALLS + 2)

      expect(towerNamed('Keep')).toBe('Destroyed Keep')
      expect(hitAt(KEEP)).toBe('Stone hit: destroyed')
      expect(catapultMessages().at(-1)).toBe('The Catapult destroys the Keep.')
    })

    test('a shot at the Keep that does no damage leaves it standing, and the log says so', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...CITADEL_WALLS_DESTROYED, HITS, NO_DAMAGE]
      })

      await passRounds(user, ROUNDS_TO_DESTROY_CITADEL_WALLS + 1)

      expect(towerNamed('Keep')).toBe('Keep')
      expect(catapultMessages().at(-1)).toBe('The Catapult hits the Keep, but does no damage.')
    })

    test('with the Keep destroyed in a Castle the catapult shoots the upper or the lower tower, by its roll', async () => {
      const { user } = await attackTown(anAttackScenario({ buildings: CASTLE }), {
        rolls: [...CASTLE_WALLS_DESTROYED, HITS, TWO_POINTS, AT_THE_SECOND, HITS, ONE_POINT]
      })

      await passRounds(user, ROUNDS_TO_DESTROY_CASTLE_WALLS + 2)

      expect(catapultMessages().at(-2)).toBe('The Catapult destroys the Keep.')
      expect(catapultMessages().at(-1)).toBe('The Catapult hits the Lower Tower.')
    })

    test('in a Citadel, once the Keep is destroyed, the catapult has nothing left and the first stack acts at once', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...CITADEL_WALLS_DESTROYED, HITS, TWO_POINTS]
      })
      await passRounds(user, ROUNDS_TO_DESTROY_CITADEL_WALLS + 1)

      await passRounds(user, 1)

      expect(catapultMessages()).toHaveLength(6)
      expect(countCatapultStones()).toBe(0)
      expect(readActiveStack()).toEqual(FIRST_SLUG)
    })
  })

  describe('a damaged or destroyed tower', () => {
    test('a damaged Keep still shoots for its full damage', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...A_HARMLESS_FIRST_SHOT, ON_THE_KEEP, ON_THE_UPPER_WALL]
      })
      await castEarthquake(user)

      await passRounds(user, 1)

      expect(towerNamed('Keep')).toBe('Damaged Keep')
      expect(towerLines().at(-1)).toBe(KEEP_SHOT)
    })

    test('a destroyed Keep does not shoot in the next round, and the upper and lower towers still do', async () => {
      const { user } = await attackTown(
        anAttackScenario({ buildings: CASTLE, hero: aCaster('EXPERT') }),
        {
          rolls: [
            ...A_HARMLESS_FIRST_SHOT,
            ON_THE_KEEP,
            ON_THE_KEEP,
            ON_THE_UPPER_WALL,
            ON_THE_UPPER_WALL
          ]
        }
      )
      await castEarthquake(user)

      await passRounds(user, 1)

      expect(towerLines().slice(3)).toEqual([OTHER_TOWER_SHOT, OTHER_TOWER_SHOT])
    })

    test('with every tower destroyed the round starts with the catapult', async () => {
      const { user } = await attackTown(
        anAttackScenario({ buildings: CASTLE, hero: aCaster('EXPERT') }),
        {
          rolls: [
            ...A_HARMLESS_FIRST_SHOT,
            ON_THE_KEEP,
            ON_THE_KEEP,
            ON_THE_LOWER_TOWER_ONCE_THE_KEEP_IS_FULL,
            ON_THE_LOWER_TOWER_ONCE_THE_KEEP_IS_FULL,
            ...[AT_THE_FIRST, HITS, NO_DAMAGE],
            ON_THE_UPPER_TOWER,
            ON_THE_UPPER_TOWER,
            ON_THE_UPPER_WALL,
            ON_THE_UPPER_WALL
          ]
        }
      )
      await castEarthquake(user)
      await passRounds(user, 1)
      await castEarthquake(user)

      await passRounds(user, 1)

      expect(towerLines()).toHaveLength(4)
      expect(catapultMessages()).toHaveLength(3)
    })
  })

  describe('Earthquake at the towers', () => {
    test("Earthquake's points can land on the Keep, which is shown damaged, and the log says the Earthquake damages it", async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...A_HARMLESS_FIRST_SHOT, ON_THE_KEEP, ON_THE_UPPER_WALL]
      })

      await castEarthquake(user)

      expect(towerNamed('Keep')).toBe('Damaged Keep')
      expect(hitAt(KEEP)).toBe('Earthquake hit: damaged')
      expect(earthquakeMessages()).toContain('The Earthquake damages the Keep.')
    })

    test('two points on the Upper Tower destroy it, and it does not shoot in the next round', async () => {
      const { user } = await attackTown(anAttackScenario({ buildings: CASTLE }), {
        rolls: [...A_HARMLESS_FIRST_SHOT, ON_THE_UPPER_TOWER, ON_THE_UPPER_TOWER]
      })
      await castEarthquake(user)

      await passRounds(user, 1)

      expect(towerNamed('Upper Tower')).toBe('Destroyed Upper Tower')
      expect(earthquakeMessages()).toEqual(['The Earthquake destroys the Upper Tower.'])
      expect(towerLines().slice(3)).toEqual([KEEP_SHOT, OTHER_TOWER_SHOT])
    })

    test('the log goes through the parts hit from the Upper Tower, along the walls, to the Lower Tower and the Keep last', async () => {
      const { user } = await attackTown(
        anAttackScenario({ buildings: CASTLE, hero: aCaster('EXPERT') }),
        {
          rolls: [
            ...A_HARMLESS_FIRST_SHOT,
            ON_THE_KEEP,
            ON_THE_CASTLES_LOWER_TOWER,
            ON_THE_UPPER_WALL,
            ON_THE_UPPER_TOWER
          ]
        }
      )

      await castEarthquake(user)

      expect(earthquakeMessages()).toEqual([
        'The Earthquake damages the Upper Tower.',
        'The Earthquake damages the Upper Wall.',
        'The Earthquake damages the Lower Tower.',
        'The Earthquake damages the Keep.'
      ])
    })

    test('in a Citadel with every wall part down Earthquake can still be cast, on the Keep', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...CITADEL_WALLS_DESTROYED, HITS, NO_DAMAGE]
      })
      await passRounds(user, ROUNDS_TO_DESTROY_CITADEL_WALLS + 1)

      await castEarthquake(user)

      expect(towerNamed('Keep')).toBe('Destroyed Keep')
      expect(earthquakeMessages()).toEqual(['The Earthquake destroys the Keep.'])
    })

    test('with the Keep down too the book says it does no good', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...CITADEL_WALLS_DESTROYED, HITS, TWO_POINTS]
      })
      await passRounds(user, ROUNDS_TO_DESTROY_CITADEL_WALLS + 1)

      await castEarthquake(user)

      expect(readSpellBookMessage()).toEqual(['', NO_GOOD])
    })
  })

  describe('reloading', () => {
    test('after a reload the Keep the catapult destroyed is still destroyed and does not shoot', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...CITADEL_WALLS_DESTROYED, HITS, TWO_POINTS],
        eventLog
      })
      await passRounds(user, ROUNDS_TO_DESTROY_CITADEL_WALLS + 1)
      const shotsBeforeTheReload = towerLines().length

      const reloaded = await setupApp(anAttackScenario(), { eventLog })
      await waitMs(1000)
      await passRounds(reloaded.user, 1)

      expect(towerNamed('Keep')).toBe('Destroyed Keep')
      expect(towerLines()).toHaveLength(shotsBeforeTheReload)
    })

    test('after a reload the tower the Earthquake damaged is still damaged', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...A_HARMLESS_FIRST_SHOT, ON_THE_KEEP, ON_THE_UPPER_WALL],
        eventLog
      })
      await castEarthquake(user)

      await setupApp(anAttackScenario(), { eventLog })
      await waitMs(1000)

      expect(towerNamed('Keep')).toBe('Damaged Keep')
    })
  })
})
