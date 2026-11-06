// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  clickTile,
  confirmMove,
  expectHeroAt,
  expectNoPreview,
  getMapCursor,
  hoverTile,
  isTileExplored,
  pointerOverTile
} from './adventure-map.utils.js'
import {
  clickEndTurn,
  expectMovementPoints,
  getHeroInfoBox,
  readMessage,
  readSpellPoints
} from './adventure-panels.utils.js'
import { castSpellFromMap } from './adventure-spells.utils.js'
import {
  createMemoryEventLog,
  pressKey,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import { queryBattleScreen } from './battle.utils.js'
import { aHero, aMonster, aScenario, aSpellDefinition, aTown } from './builders.js'
import {
  clickHeroInHeroList,
  clickHeroScreenSpellBook,
  queryHeroScreen
} from './hero-screen.utils.js'
import { clickSpell } from './spell-book.utils.js'

const HERO = 'Christian'
const GRASS = 2
const WATER = 9

const spells = {
  DIMENSION_DOOR: aSpellDefinition()
    .withName('Dimension Door')
    .withLevel(5)
    .withSchools(['AIR'])
    .withKind('adventure')
    .withCosts([25, 20, 20, 20])
    .describedAs('Dimension Door description.')
    .withDimensionDoor({
      castsPerDay: [1, 2, 3, 4],
      movementPoints: [300, 300, 300, 200],
      range: { x: 9, y: 8 }
    })
    .build()
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  buildings: readGameData('buildings.json'),
  towns: { CASTLE: readGameData('towns.json').CASTLE },
  spells
}

const WIDTH = 30
const HEIGHT = 20

// A Knight with Knowledge 10: 100 spell points, enough for four casts at any skill level.
const aCaster = ({ air } = {}) =>
  aHero()
    .withName(HERO)
    .withPrimarySkills({ knowledge: 10 })
    .withSecondarySkills(air ? [{ skill: 'AIR_MAGIC', level: air }] : [])
    .withSpellBook(true)
    .withSpells(['DIMENSION_DOOR'])
    .at(10, 10)

const aDoorScenario = ({ hero = aCaster(), others = [], tiles } = {}) => {
  const scenario = aScenario()
    .withSize(WIDTH, HEIGHT)
    .withEntities(hero, ...others)
    .withDefinitions(gameDefinitions)
  return tiles ? scenario.withTiles(tiles) : scenario
}

const withWaterAt = (x, y) => {
  const tiles = new Array(WIDTH * HEIGHT).fill(GRASS)
  tiles[y * WIDTH + x] = WATER
  return tiles
}

async function setupApp(scenario = aDoorScenario(), { eventLog } = {}) {
  const app = await setupMovementBehaviorApp({ loadGameOptions: scenario.build(), eventLog })
  await loadAppStyles()
  return app
}

async function castDimensionDoorTo(user, x, y) {
  await castSpellFromMap(user, 'Dimension Door')
  await clickTile(user, x, y)
}

const readHeroSpellPoints = () => readSpellPoints(getHeroInfoBox())

describe('Dimension Door behavior', () => {
  describe('aiming', () => {
    test('given a hero casting Dimension Door when the mouse is over a free tile in range then the cursor is the Dimension Door one', async () => {
      const { user } = await setupApp()

      await castSpellFromMap(user, 'Dimension Door')
      await hoverTile(user, 19, 18)

      expect(getMapCursor()).toBe('dimension-door')
    })

    // The range is 9 tiles left or right and 8 up or down from the hero at (10, 10).
    test.each([
      ['ten tiles to the right', 20, 10],
      ['nine tiles up', 10, 1]
    ])('given a tile %s when the player clicks it then the cursor is the arrow and the hero stays', async (_case, x, y) => {
      const { user } = await setupApp()
      await castSpellFromMap(user, 'Dimension Door')

      await hoverTile(user, x, y)
      const cursor = getMapCursor()
      await clickTile(user, x, y)

      expect(cursor).toBe('arrow')
      expectHeroAt(10, 10)
      expect(readHeroSpellPoints()).toBe('100')
    })

    test.each([
      ['a monster', aMonster().at(14, 10), 14, 10],
      ['another hero', aHero().withId('hero-2').withName('Adela').at(14, 10), 14, 10],
      // A town blocks the tiles around its entrance at (14, 10).
      ['a town', aTown().at(14, 10), 13, 9]
    ])('given a tile taken by %s when the player clicks it then the cursor is the arrow and the hero stays', async (_case, other, x, y) => {
      const { user } = await setupApp(aDoorScenario({ others: [other] }))
      await castSpellFromMap(user, 'Dimension Door')

      await hoverTile(user, x, y)
      const cursor = getMapCursor()
      await clickTile(user, x, y)

      expect(cursor).toBe('arrow')
      expectHeroAt(10, 10)
      expect(readHeroSpellPoints()).toBe('100')
    })

    test('given a hero aiming Dimension Door when the player presses Escape then a click walks the hero instead', async () => {
      const { user } = await setupApp()
      await castSpellFromMap(user, 'Dimension Door')

      await pressKey(user, '{Escape}')
      await confirmMove(user, 12, 10)

      expectHeroAt(12, 10)
      expect(readHeroSpellPoints()).toBe('100')
    })

    test('given a hero aiming Dimension Door when the player right-clicks the map then nothing is cast', async () => {
      const { user } = await setupApp()
      await castSpellFromMap(user, 'Dimension Door')

      await user.pointer({ keys: '[MouseRight]', ...pointerOverTile(15, 10) })
      await hoverTile(user, 16, 10)

      expect(getMapCursor()).toBe('move')
      expect(readHeroSpellPoints()).toBe('100')
    })
  })

  describe('casting', () => {
    test('given a hero casting Dimension Door when the player clicks a free tile in range then the hero stands there with spell points and movement points spent', async () => {
      const { user } = await setupApp()

      await castDimensionDoorTo(user, 19, 18)

      expectHeroAt(19, 18)
      expect(readHeroSpellPoints()).toBe('75')
      expectMovementPoints(1200)
    })

    test('given Expert Air Magic when the hero casts Dimension Door then it takes 200 movement points', async () => {
      const { user } = await setupApp(aDoorScenario({ hero: aCaster({ air: 'EXPERT' }) }))

      await castDimensionDoorTo(user, 15, 10)

      expectMovementPoints(1300)
    })

    // Thirteen steps right leave the hero 200 of their 1500 movement points.
    test('given a hero with 200 movement points left when they cast Dimension Door then they land with none left', async () => {
      const { user } = await setupApp()
      await confirmMove(user, 23, 10)

      await castDimensionDoorTo(user, 23, 15)

      expectHeroAt(23, 15)
      expectMovementPoints(0)
    })

    test('given a hero with a planned route when they cast Dimension Door then the route is gone', async () => {
      const { user } = await setupApp()
      await clickTile(user, 12, 10)

      await castDimensionDoorTo(user, 15, 15)

      expectNoPreview()
    })

    test('given the spell book opened from the hero screen when the player clicks Dimension Door then the hero screen closes and a click on the map casts it', async () => {
      const { user } = await setupApp()
      await clickHeroInHeroList(user, HERO)
      await clickHeroScreenSpellBook(user)

      await clickSpell(user, 'Dimension Door')
      await clickTile(user, 15, 15)

      expect(queryHeroScreen()).toBeNull()
      expectHeroAt(15, 15)
    })

    test('given fog of war when the hero lands on a tile in the fog then the land around it is revealed', async () => {
      const { user } = await setupApp(aDoorScenario().withFogOfWar(true))

      await castDimensionDoorTo(user, 19, 10)

      expectHeroAt(19, 10)
      expect(isTileExplored(24, 10)).toBe(true)
    })

    test('given a monster next to a free tile when the hero lands on it then the battle starts', async () => {
      const { user } = await setupApp(aDoorScenario({ others: [aMonster().at(15, 10)] }))

      await castDimensionDoorTo(user, 14, 10)

      expect(queryBattleScreen()).toBeTruthy()
    })

    test('given a monster two tiles away from the landing tile when the hero lands then no battle starts', async () => {
      const { user } = await setupApp(aDoorScenario({ others: [aMonster().at(16, 10)] }))

      await castDimensionDoorTo(user, 14, 10)

      expectHeroAt(14, 10)
      expect(queryBattleScreen()).toBeNull()
    })
  })

  describe('failing', () => {
    const TOO_TIRED = 'Your hero is too tired to cast this spell today.  Try again tomorrow.'
    const NOT_SKILLED_ENOUGH = `${HERO} is not skilled enough to cast this spell again today.`

    test('given a hero without Air Magic who cast Dimension Door today when they cast it again then it says they are not skilled enough', async () => {
      const { user } = await setupApp()
      await castDimensionDoorTo(user, 15, 10)

      await castSpellFromMap(user, 'Dimension Door')

      expect(readMessage()).toBe(NOT_SKILLED_ENOUGH)
      expect(readHeroSpellPoints()).toBe('75')
    })

    test('given Basic Air Magic and two casts today when the hero casts Dimension Door a third time then it says they are not skilled enough', async () => {
      const { user } = await setupApp(aDoorScenario({ hero: aCaster({ air: 'BASIC' }) }))
      await castDimensionDoorTo(user, 15, 10)
      await castDimensionDoorTo(user, 20, 10)

      await castSpellFromMap(user, 'Dimension Door')

      expect(readMessage()).toBe(NOT_SKILLED_ENOUGH)
    })

    test('given a hero who cast Dimension Door yesterday when they cast it today then they land', async () => {
      const { user } = await setupApp()
      await castDimensionDoorTo(user, 15, 10)
      await clickEndTurn(user)

      await castDimensionDoorTo(user, 20, 10)

      expectHeroAt(20, 10)
    })

    // Fifteen steps right take all 1500 movement points.
    test('given a hero with no movement points left when they cast Dimension Door then they are too tired', async () => {
      const { user } = await setupApp()
      await confirmMove(user, 25, 10)

      await castSpellFromMap(user, 'Dimension Door')

      expect(readMessage()).toBe(TOO_TIRED)
      expect(readHeroSpellPoints()).toBe('100')
    })

    test('given water in range when the hero casts Dimension Door onto it then it fails and the spell points, movement points and the cast are spent', async () => {
      const { user } = await setupApp(aDoorScenario({ tiles: withWaterAt(15, 10) }))

      await castDimensionDoorTo(user, 15, 10)

      expect(readMessage()).toBe('Dimension Door failed!')
      expectHeroAt(10, 10)
      expect(readHeroSpellPoints()).toBe('75')
      expectMovementPoints(1200)
    })
  })

  describe('after a reload', () => {
    test('given a hero who cast Dimension Door when the page reloads then they stand where they landed and cannot cast it again today', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(aDoorScenario(), { eventLog })
      await castDimensionDoorTo(user, 15, 15)

      const reloaded = await setupApp(aDoorScenario(), { eventLog })
      expectHeroAt(15, 15)
      expect(readHeroSpellPoints()).toBe('75')
      expectMovementPoints(1200)

      await castSpellFromMap(reloaded.user, 'Dimension Door')
      expect(readMessage()).toMatch(/not skilled enough/)
    })
  })
})
