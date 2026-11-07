// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  clickTile,
  confirmMove,
  expectHeroAt,
  expectNoPreview,
  expectPreviewOverLimitDashAt,
  expectPreviewTargetAt,
  expectResourcePresent,
  getPreviewOverLimitDashAt
} from './adventure-map.utils.js'
import {
  clickEndTurn,
  expectMovementPoints,
  getHeroInfoBox,
  readSpellPoints
} from './adventure-panels.utils.js'
import { castSpellFromMap } from './adventure-spells.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { queryBattleScreen } from './battle.utils.js'
import { aHero, aMonster, anObstacle, aResource, aScenario, aSpellDefinition } from './builders.js'
import { DIRT_ROAD, GRASS, ROCK, SWAMP, WATER } from './terrain-codes.js'

const spells = {
  FLY: aSpellDefinition()
    .withName('Fly')
    .withLevel(5)
    .withSchools(['AIR'])
    .withKind('adventure')
    .withCosts([20, 15, 15, 15])
    .describedAs('Fly description.')
    .withFly({ penalty: [40, 40, 20, 0] })
    .build()
}

// Blocks its own tile and the one left of it.
const MOUNTAIN = {
  name: 'Mountain',
  look: 'mountain',
  blocks: [
    { x: -1, y: 0 },
    { x: 0, y: 0 }
  ]
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  obstacles: { MOUNTAIN },
  spells
}

const TERRAIN_BY_LETTER = { g: GRASS, w: WATER, r: ROCK, s: SWAMP }

// One string per row of the map: g grass, w water, r rock, s swamp.
const terrainOf = (rows) => ({
  width: rows[0].length,
  height: rows.length,
  tiles: rows.flatMap((row) => [...row].map((letter) => TERRAIN_BY_LETTER[letter]))
})

const grassRow = (length) => 'g'.repeat(length)

// Knowledge 10 gives 100 spell points.
const aFlier = ({ air, x = 0, y = 0 } = {}) =>
  aHero()
    .withPrimarySkills({ knowledge: 10 })
    .withSecondarySkills(air ? [{ skill: 'AIR_MAGIC', level: air }] : [])
    .withSpellBook(true)
    .withSpells(['FLY'])
    .at(x, y)

const aFlyScenario = ({ rows = ['gwwg'], hero = aFlier(), others = [] } = {}) => {
  const { width, height, tiles } = terrainOf(rows)
  return aScenario()
    .withSize(width, height)
    .withTiles(tiles)
    .withEntities(hero, ...others)
    .withDefinitions(gameDefinitions)
}

const setupApp = (scenario = aFlyScenario(), { eventLog } = {}) =>
  setupMovementBehaviorApp({ loadGameOptions: scenario.build(), eventLog })

async function setupFlyingApp(scenario, options) {
  const app = await setupApp(scenario, options)
  await castSpellFromMap(app.user, 'Fly')
  return app
}

const readHeroSpellPoints = () => readSpellPoints(getHeroInfoBox())

describe('Fly behavior', () => {
  describe('casting', () => {
    test('given a hero with Fly when they cast it then the spell points are spent and the movement points stay', async () => {
      await setupFlyingApp()

      expect(readHeroSpellPoints()).toBe('80')
      expectMovementPoints(1500)
    })

    test('given a hero with a planned route when they cast Fly then the route is gone', async () => {
      const { user } = await setupApp(aFlyScenario({ rows: [grassRow(4)] }))
      await clickTile(user, 3, 0)

      await castSpellFromMap(user, 'Fly')

      expectNoPreview()
    })

    test('given Basic Air Magic when the hero casts Fly then it costs 15 spell points', async () => {
      await setupFlyingApp(aFlyScenario({ hero: aFlier({ air: 'BASIC' }) }))

      expect(readHeroSpellPoints()).toBe('85')
    })
  })

  describe('flying', () => {
    test('given a lake between the hero and a tile when the hero flies then the route crosses the lake and they land there', async () => {
      const { user } = await setupFlyingApp()

      await confirmMove(user, 3, 0)

      expectHeroAt(3, 0)
    })

    test('given a mountain between the hero and a tile when the hero flies then the route goes over it', async () => {
      const { user } = await setupFlyingApp(
        aFlyScenario({
          rows: [grassRow(4)],
          others: [anObstacle().withType('MOUNTAIN').at(2, 0)]
        })
      )

      await confirmMove(user, 3, 0)

      expectHeroAt(3, 0)
    })

    test('given a flying hero when the mouse is over water then there is no route and a click does nothing', async () => {
      const { user } = await setupFlyingApp()

      await clickTile(user, 1, 0)

      expectNoPreview()
      expectHeroAt(0, 0)
    })

    test('given a flying hero when the mouse is over a tile an obstacle blocks then there is no route', async () => {
      const { user } = await setupFlyingApp(
        aFlyScenario({
          rows: [grassRow(4)],
          others: [anObstacle().withType('MOUNTAIN').at(2, 0)]
        })
      )

      await clickTile(user, 1, 0)

      expectNoPreview()
    })

    test('given rock between the hero and a tile when the hero flies then the route goes around the rock', async () => {
      const { user } = await setupFlyingApp(aFlyScenario({ rows: ['grg', 'ggg'] }))

      await confirmMove(user, 2, 0)

      expectHeroAt(2, 0)
      // Two diagonal grass steps (141 + 141); over the rock it would cost 100 + 140.
      expectMovementPoints(1218)
    })

    // The hero sees 5 tiles around them and the other hero sees from 8 to 18, so the lake at
    // 6 and 7 is under the fog.
    test('given a lake under the fog when the hero flies then the route does not cross it', async () => {
      const { user } = await setupFlyingApp(
        aFlyScenario({
          rows: [`${grassRow(6)}ww${grassRow(12)}`],
          others: [aHero().withId('hero-2').at(13, 0)]
        }).withFogOfWar(true)
      )

      await clickTile(user, 8, 0)

      expectNoPreview()
    })

    // Over the gold: 100 off the grass and 140 off the gold's tile; around it 141 + 141.
    test('given a resource pile under the route when the hero flies over it then it stays on the map', async () => {
      const { user } = await setupFlyingApp(
        aFlyScenario({
          rows: [grassRow(3), grassRow(3), grassRow(3)],
          hero: aFlier({ y: 1 }),
          others: [aResource().at(1, 1)]
        })
      )

      await confirmMove(user, 2, 1)

      expectHeroAt(2, 1)
      expectMovementPoints(1260)
      expectResourcePresent()
    })

    // The monster at (6, 1) guards (5, 2) to (7, 2) on the hero's row.
    test("given a monster's guarded tiles under the route when the hero flies over them then no battle starts", async () => {
      const { user } = await setupFlyingApp(
        aFlyScenario({
          rows: [grassRow(10), grassRow(10), grassRow(10)],
          hero: aFlier({ x: 4, y: 2 }),
          others: [aMonster().at(6, 1)]
        })
      )

      await confirmMove(user, 8, 2)

      expectHeroAt(8, 2)
      expect(queryBattleScreen()).toBeNull()
    })

    test('given a free tile next to a monster when the flying hero lands on it then the battle starts', async () => {
      const { user } = await setupFlyingApp(
        aFlyScenario({
          rows: [grassRow(10), grassRow(10), grassRow(10)],
          hero: aFlier({ x: 4, y: 2 }),
          others: [aMonster().at(6, 1)]
        })
      )

      await confirmMove(user, 7, 2)

      expect(queryBattleScreen()).toBeTruthy()
    })
  })

  describe('costs', () => {
    // 100 off the grass, then 100 + the penalty off the water.
    test.each([
      ['no', undefined, 1260],
      ['Basic', 'BASIC', 1260],
      ['Advanced', 'ADVANCED', 1280],
      ['Expert', 'EXPERT', 1300]
    ])('given %s Air Magic when the hero flies off water then the step costs 100 and its penalty', async (_level, air, movementPoints) => {
      const { user } = await setupFlyingApp(aFlyScenario({ rows: ['gwg'], hero: aFlier({ air }) }))

      await confirmMove(user, 2, 0)

      expectMovementPoints(movementPoints)
    })

    test('given Basic Air Magic when the flying hero steps off swamp then it costs 140', async () => {
      const { user } = await setupFlyingApp(
        aFlyScenario({ rows: ['sg'], hero: aFlier({ air: 'BASIC' }) })
      )

      await confirmMove(user, 1, 0)

      expectMovementPoints(1360)
    })

    test("given Basic Air Magic when the flying hero steps along a road then it costs the road's 75", async () => {
      const { user } = await setupFlyingApp(
        aFlyScenario({ rows: ['gg'], hero: aFlier({ air: 'BASIC' }) }).withRoads([
          DIRT_ROAD,
          DIRT_ROAD
        ])
      )

      await confirmMove(user, 1, 0)

      expectMovementPoints(1425)
    })
  })

  describe('landing', () => {
    // 100 off the grass and 14 × 140 over the lake: 2060, more than a day's 1500.
    test("given a lake wider than today's movement points when the hero flies then the tile across has no route", async () => {
      const { user } = await setupFlyingApp(aFlyScenario({ rows: [`g${'w'.repeat(14)}gg`] }))

      await clickTile(user, 15, 0)

      expectNoPreview()
    })

    // Over the lake: 100 + 140 + 140, so 1120 is left at (3, 0), for 11 grass steps to (14, 0).
    test('given the flight fits today when the route goes on for more days then only the walked steps past today are red', async () => {
      const { user } = await setupFlyingApp(aFlyScenario({ rows: [`gww${grassRow(22)}`] }))

      await clickTile(user, 20, 0)

      expectPreviewTargetAt(20, 0)
      expect(getPreviewOverLimitDashAt(14, 0)).toBeFalsy()
      expectPreviewOverLimitDashAt(15, 0)
    })

    test('given a hero who flew yesterday when the new day starts then water has no route again', async () => {
      const { user } = await setupFlyingApp()
      await clickEndTurn(user)

      await clickTile(user, 3, 0)

      expectNoPreview()
    })
  })

  describe('after a reload', () => {
    test('given a hero who cast Fly when the page reloads then the route still crosses the lake', async () => {
      const eventLog = createMemoryEventLog()
      await setupFlyingApp(aFlyScenario(), { eventLog })

      const { user } = await setupApp(aFlyScenario(), { eventLog })
      await confirmMove(user, 3, 0)

      expectHeroAt(3, 0)
    })
  })
})
