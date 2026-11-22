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
  isBattleHexReachable,
  LOWEST_ROLLS,
  pickSpell,
  readBattleSpellPoints,
  readBattleWalls,
  readCombatMessages,
  readWallHits,
  startBattle
} from './battle.utils.js'
import {
  ARMY_THAT_WINS,
  aCreatureDefinition,
  aHero,
  aMonster,
  aScenario,
  aTown
} from './builders.js'
import { readSpellBookMessage, readSpellBookSpellPoints } from './spell-book.utils.js'

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
  monsters: { ...readGameData('monsters.json'), RUNNER, BRUTE, ARCHER },
  spells: readGameData('spells.json'),
  heroes: readGameData('heroes.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const stack = (creature, count = 1) => ({ creature, count })

const HERO = 'Lord Haart'
// Knowledge 5: 50 spell points.
const CASTER_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 5 }
const FULL_SPELL_POINTS = '50'
const EARTHQUAKE = 'Earthquake'

// Rows and columns from 1, as the battle screen shows them.
const UPPER_WALL = { row: 2, column: 12 }
const MID_UPPER_WALL = { row: 5, column: 10 }
const MID_LOWER_WALL = { row: 8, column: 11 }
const LOWER_WALL = { row: 11, column: 12 }
const DRAWBRIDGE = [
  { row: 6, column: 10 },
  { row: 6, column: 11 }
]
const BEHIND_THE_UPPER_WALL = { row: 2, column: 13 }

// The catapult's rolls come first as the round starts: which of the equally weakest segments it
// aims at, whether it hits, and how hard. Its first shot here hits the Upper Wall for no damage.
const AT_THE_FIRST = 0
const HITS = 0
const NO_DAMAGE = 0
const ONE_POINT = 0.5
const TWO_POINTS = 0.9
const A_HARMLESS_FIRST_SHOT = [AT_THE_FIRST, HITS, NO_DAMAGE]

// Then the Earthquake's, one for each point: which of the parts that can still take a point it
// lands on, counted from the top of the wall (Upper Wall, Mid-Upper Wall, Drawbridge, Mid-Lower
// Wall, Lower Wall) while all five can.
const ON_THE_FIRST = 0
const ON_THE_SECOND = 0.3
const ON_THE_THIRD = 0.5
const ON_THE_FOURTH = 0.7
const ON_THE_FIFTH = 0.9

const ALL_FOUR_SEGMENTS_DESTROYED = [
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[HITS, TWO_POINTS]
]
const ALL_DESTROYED = [...ALL_FOUR_SEGMENTS_DESTROYED, HITS, TWO_POINTS]

function wallRolls(...values) {
  const rolls = [...values]
  return () => rolls.shift() ?? 0
}

const wallAt = (hex) =>
  readBattleWalls().find(({ row, column }) => row === hex.row && column === hex.column)?.wall

const drawbridgeWalls = () => DRAWBRIDGE.map(wallAt)

const earthquakeHits = () => readWallHits().filter(({ hit }) => hit.startsWith('Earthquake'))

const earthquakeMessages = () =>
  readCombatMessages().filter(
    (message) => message.startsWith('The Earthquake') || message.includes(EARTHQUAKE)
  )

const earthMagic = (level) => [{ skill: 'EARTH_MAGIC', level }]

const aCaster = ({ skills = [] } = {}) =>
  aHero()
    .withName(HERO)
    .withPrimarySkills(CASTER_SKILLS)
    .withSecondarySkills(skills)
    .withSpellBook(true)
    .withSpells(['EARTHQUAKE'])
    .withArmy([stack('RUNNER')])

// The player's hero attacks blue's town; its entrance is at (4, 3), the hero two tiles below it.
const TOWN_ENTRANCE = { x: 4, y: 3 }

const aBlueTown = ({ buildings = ['FORT'] } = {}) =>
  aTown()
    .named('Kirkwall')
    .ownedBy('blue')
    .withBuildings(buildings)
    .withGarrison([stack('ARCHER')])
    .at(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)

const anAttackScenario = ({ hero = aCaster(), town = aBlueTown() } = {}) =>
  aScenario().withSize(9, 7).withEntities(hero.at(4, 5), town).withDefinitions(definitions)

const setupApp = (scenario, { rolls = [], eventLog } = {}) =>
  setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: {
      random: LOWEST_ROLLS,
      catapultRandom: wallRolls(...rolls),
      battleStepDelayMs: 0,
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

async function passRounds(user, rounds) {
  for (let round = 0; round < rounds; round += 1) {
    await clickBattleButton(user, 'Defend')
    await waitMs(1000)
  }
}

async function castEarthquake(user) {
  await pickSpell(user, EARTHQUAKE)
  await waitMs()
}

// Blue's hero attacks the player's town during blue's turn, with the player's caster in it.
const COMPUTER_TURN_MS = 2000
const PLAYERS_GATE = { x: 20, y: 2 }

const aDefenceScenario = () =>
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
        .at(PLAYERS_GATE.x, PLAYERS_GATE.y),
      aCaster().at(PLAYERS_GATE.x, PLAYERS_GATE.y),
      aHero()
        .withId('hero-2')
        .withName('Valeska')
        .ownedBy('blue')
        .withArmy([stack('BRUTE')])
        .at(20, 5)
    )
    .withDefinitions(definitions)

describe('siege Earthquake behavior', () => {
  describe('casting it', () => {
    test('the hero casts Earthquake from the book and two parts are shown damaged, each with a hit on it, and the log says so', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...A_HARMLESS_FIRST_SHOT, ON_THE_FIRST, ON_THE_FOURTH]
      })

      await castEarthquake(user)

      expect(wallAt(UPPER_WALL)).toBe('Damaged wall')
      expect(wallAt(MID_LOWER_WALL)).toBe('Damaged wall')
      expect(earthquakeHits()).toEqual([
        { hit: 'Earthquake hit: damaged', ...UPPER_WALL },
        { hit: 'Earthquake hit: damaged', ...MID_LOWER_WALL }
      ])
      expect(earthquakeMessages()).toEqual([
        `${HERO} casts 'Earthquake'.`,
        'The Earthquake damages the Upper Wall.',
        'The Earthquake damages the Mid-Lower Wall.'
      ])
    })

    test('with Advanced Earth Magic it hits three parts', async () => {
      const { user } = await attackTown(
        anAttackScenario({ hero: aCaster({ skills: earthMagic('ADVANCED') }) }),
        { rolls: [...A_HARMLESS_FIRST_SHOT, ON_THE_FIRST, ON_THE_SECOND, ON_THE_FIFTH] }
      )

      await castEarthquake(user)

      expect(earthquakeMessages().slice(1)).toEqual([
        'The Earthquake damages the Upper Wall.',
        'The Earthquake damages the Mid-Upper Wall.',
        'The Earthquake damages the Lower Wall.'
      ])
    })

    test('with Expert Earth Magic it hits four parts', async () => {
      const { user } = await attackTown(
        anAttackScenario({ hero: aCaster({ skills: earthMagic('EXPERT') }) }),
        {
          rolls: [
            ...A_HARMLESS_FIRST_SHOT,
            ON_THE_FIRST,
            ON_THE_SECOND,
            ON_THE_FOURTH,
            ON_THE_FIFTH
          ]
        }
      )

      await castEarthquake(user)

      expect(wallAt(UPPER_WALL)).toBe('Damaged wall')
      expect(wallAt(MID_UPPER_WALL)).toBe('Damaged wall')
      expect(wallAt(MID_LOWER_WALL)).toBe('Damaged wall')
      expect(wallAt(LOWER_WALL)).toBe('Damaged wall')
    })

    test("two points on a Fort's segment destroy it, the log says so, and a walking stack can walk through the gap", async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...A_HARMLESS_FIRST_SHOT, ON_THE_FIRST, ON_THE_FIRST]
      })

      await castEarthquake(user)

      expect(wallAt(UPPER_WALL)).toBe('Destroyed wall')
      expect(earthquakeHits()).toEqual([{ hit: 'Earthquake hit: destroyed', ...UPPER_WALL }])
      expect(earthquakeMessages().slice(1)).toEqual(['The Earthquake destroys the Upper Wall.'])
      expect(isBattleHexReachable(BEHIND_THE_UPPER_WALL.row, BEHIND_THE_UPPER_WALL.column)).toBe(
        true
      )
    })

    test('two points on the drawbridge destroy it, and it stays open', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...A_HARMLESS_FIRST_SHOT, ON_THE_THIRD, ON_THE_THIRD]
      })

      await castEarthquake(user)

      expect(drawbridgeWalls()).toEqual(['Destroyed drawbridge', 'Destroyed drawbridge'])
      expect(earthquakeMessages().slice(1)).toEqual(['The Earthquake destroys the Drawbridge.'])
    })

    test('with the four segments down every point goes to the drawbridge, and the points beyond its hit points are lost', async () => {
      const { user } = await attackTown(
        anAttackScenario({ hero: aCaster({ skills: earthMagic('EXPERT') }) }),
        { rolls: ALL_FOUR_SEGMENTS_DESTROYED }
      )
      await passRounds(user, 3)

      await castEarthquake(user)

      expect(drawbridgeWalls()).toEqual(['Destroyed drawbridge', 'Destroyed drawbridge'])
      expect(earthquakeMessages().slice(1)).toEqual(['The Earthquake destroys the Drawbridge.'])
    })

    test('it costs 20 spell points', async () => {
      const { user } = await attackTown(anAttackScenario(), { rolls: A_HARMLESS_FIRST_SHOT })

      await castEarthquake(user)
      await passRounds(user, 1)

      expect(await readBattleSpellPoints(user)).toBe('30')
    })

    test('with Earth Magic it costs 17 spell points', async () => {
      const { user } = await attackTown(
        anAttackScenario({ hero: aCaster({ skills: earthMagic('BASIC') }) }),
        { rolls: A_HARMLESS_FIRST_SHOT }
      )

      await castEarthquake(user)
      await passRounds(user, 1)

      expect(await readBattleSpellPoints(user)).toBe('33')
    })
  })

  describe('when it does no good', () => {
    const NO_GOOD = 'An earthquake will do you no good unless there are town walls to damage.'

    test('in a battle on the open map the book says it does no good, stays open and keeps the spell points', async () => {
      const { user } = await startBattle(
        aScenario()
          .withSize(9, 7)
          .withEntities(aCaster().at(4, 5), aMonster().withType('ARCHER').at(4, 3))
          .withDefinitions(definitions)
      )

      await castEarthquake(user)

      expect(readSpellBookMessage()).toEqual(['', NO_GOOD])
      expect(readSpellBookSpellPoints()).toBe(FULL_SPELL_POINTS)
    })

    test('at a town without a Fort the book says it does no good', async () => {
      const { user } = await attackTown(anAttackScenario({ town: aBlueTown({ buildings: [] }) }))

      await castEarthquake(user)

      expect(readSpellBookMessage()).toEqual(['', NO_GOOD])
    })

    test('with every part of the walls destroyed the book says it does no good and keeps the spell points', async () => {
      const { user } = await attackTown(anAttackScenario(), { rolls: ALL_DESTROYED })
      await passRounds(user, 4)

      await castEarthquake(user)

      expect(readSpellBookMessage()).toEqual(['', NO_GOOD])
      expect(readSpellBookSpellPoints()).toBe(FULL_SPELL_POINTS)
    })

    test("the hero defending their town can't cast it: the book says it will affect no one and keeps the spell points", async () => {
      const app = await setupApp(aDefenceScenario(), { rolls: A_HARMLESS_FIRST_SHOT })
      await clickEndTurn(app.user)
      await waitMs(COMPUTER_TURN_MS)

      await castEarthquake(app.user)

      expect(readSpellBookMessage()).toEqual(['', 'That spell will affect no one!'])
      expect(readSpellBookSpellPoints()).toBe(FULL_SPELL_POINTS)
      expect(wallAt(UPPER_WALL)).toBe('Wall')
    })
  })

  describe('with the catapult', () => {
    test('the catapult goes for the segment the Earthquake damaged as the next round starts', async () => {
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...A_HARMLESS_FIRST_SHOT, ON_THE_THIRD, ON_THE_FOURTH, HITS, ONE_POINT]
      })
      await castEarthquake(user)

      await passRounds(user, 1)

      expect(readCombatMessages().at(-1)).toBe('The Catapult destroys the Mid-Lower Wall.')
    })
  })

  describe('reloading', () => {
    test('after a reload the walls are as the Earthquake left them and the spell points stay spent', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await attackTown(anAttackScenario(), {
        rolls: [...A_HARMLESS_FIRST_SHOT, ON_THE_FIRST, ON_THE_FOURTH],
        eventLog
      })
      await castEarthquake(user)

      const reloaded = await setupApp(anAttackScenario(), { eventLog })
      await waitMs(1000)

      expect(wallAt(UPPER_WALL)).toBe('Damaged wall')
      expect(wallAt(MID_LOWER_WALL)).toBe('Damaged wall')
      await passRounds(reloaded.user, 1)
      expect(await readBattleSpellPoints(reloaded.user)).toBe('30')
    })
  })
})
