// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  getMapViewCentreTile,
  getTerrainTile,
  isTileExplored,
  panCamera
} from './adventure-map.utils.js'
import { getHeroInfoBox, readSpellPoints } from './adventure-panels.utils.js'
import { castSpellFromMap } from './adventure-spells.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import {
  aHero,
  aMine,
  anArtifact,
  anArtifactDefinition,
  aResource,
  aScenario,
  aSpellDefinition,
  aTown
} from './builders.js'
import {
  clickHeroInHeroList,
  clickHeroScreenSpellBook,
  queryHeroScreen
} from './hero-screen.utils.js'
import { clickSpell } from './spell-book.utils.js'
import {
  clickAdventureOption,
  clickViewWorldButton,
  dragViewWorld,
  getViewWorldIcon,
  getViewWorldTile,
  openAdventureOptions,
  queryAdventureOptions,
  queryViewWorld,
  readAdventureOptions,
  readPressedViewWorldZoom,
  readViewWorldIcons,
  readViewWorldLegend,
  readViewWorldTileSize,
  readViewWorldTopLeftTile,
  setViewWorldViewportSize
} from './view-world.utils.js'

const PLAYER_RED = 'rgb(255, 0, 0)'
const NEUTRAL_GREY = 'rgb(132, 132, 132)'
const BLACK = 'rgb(0, 0, 0)'

const spells = {
  VIEW_EARTH: aSpellDefinition()
    .withName('View Earth')
    .withSchools(['EARTH'])
    .withKind('adventure')
    .withCosts([2, 1, 1, 1])
    .describedAs('View Earth description.')
    .withViewWorld({
      reveals: [['RESOURCE'], ['RESOURCE'], ['RESOURCE', 'MINE'], ['RESOURCE', 'MINE']],
      showsTerrain: [false, false, false, true]
    })
    .build(),
  VIEW_AIR: aSpellDefinition()
    .withName('View Air')
    .withSchools(['AIR'])
    .withKind('adventure')
    .withCosts([2, 1, 1, 1])
    .describedAs('View Air description.')
    .withViewWorld({
      reveals: [['ARTIFACT'], ['ARTIFACT'], ['ARTIFACT', 'HERO'], ['ARTIFACT', 'HERO', 'TOWN']],
      showsTerrain: [false, false, false, false]
    })
    .build()
}

const definitions = {
  resources: readGameData('resources.json'),
  mines: readGameData('mines.json'),
  towns: readGameData('towns.json'),
  spells,
  artifacts: { ARTIFACT: anArtifactDefinition().withName('Sword').build() }
}

const aCaster = ({ earth, air } = {}) =>
  aHero()
    .withName('Seer')
    .withPrimarySkills({ knowledge: 10 })
    .withSecondarySkills([
      ...(earth ? [{ skill: 'EARTH_MAGIC', level: earth }] : []),
      ...(air ? [{ skill: 'AIR_MAGIC', level: air }] : [])
    ])
    .withSpellBook(true)
    .withSpells(['VIEW_EARTH', 'VIEW_AIR'])
    .at(1, 1)

const exploredObjects = () => [
  aTown().ownedByPlayer().at(4, 4),
  aMine().withId('mine-near').at(5, 1),
  aResource().withId('resource-near').at(1, 5),
  anArtifact().withId('artifact-near').at(3, 0)
]

const hiddenObjects = () => [
  aResource().withId('resource-far').withType('WOOD_PILE').at(20, 2),
  aMine().withId('mine-far').withType('SAWMILL').at(20, 6),
  anArtifact().withId('artifact-far').at(25, 2),
  aTown().withId('town-far').at(26, 8)
]

// The hero at (1, 1) sees 5 tiles around them; everything from x = 7 on is under the fog.
const aWorld = ({ hero = aCaster(), others = [...exploredObjects(), ...hiddenObjects()] } = {}) =>
  aScenario()
    .withSize(30, 10)
    .withFogOfWar(true)
    .withEntities(hero, ...others)
    .withDefinitions(definitions)

const ICONS_OF_EXPLORED_OBJECTS = [
  'Artifact at 3,0',
  'Hero at 1,1',
  'Mine (Gold) at 5,1',
  'Town at 4,4',
  'Resource (Gold) at 1,5'
]

const setupApp = (scenario = aWorld(), options = {}) =>
  setupMovementBehaviorApp({ loadGameOptions: scenario.build(), ...options })

const tileOf = (icon) =>
  icon
    .match(/(\d+),(\d+)$/)
    .slice(1)
    .map(Number)

// Row by row, top to bottom, as the screen reads.
const inReadingOrder = (icons) =>
  [...icons].sort((left, right) => {
    const [leftX, leftY] = tileOf(left)
    const [rightX, rightY] = tileOf(right)
    return leftY - rightY || leftX - rightX
  })

const readIconsInOrder = () => inReadingOrder(readViewWorldIcons())

function backgroundOf(element) {
  expect(element).toBeTruthy()
  return window.getComputedStyle(element).backgroundColor
}

const readHeroSpellPoints = () => readSpellPoints(getHeroInfoBox())

async function cast(spellName, skill = {}) {
  const app = await setupApp(aWorld({ hero: aCaster(skill) }))
  await castSpellFromMap(app.user, spellName)
  return app
}

async function openViewWorldFromOptions(user) {
  await openAdventureOptions(user)
  await clickAdventureOption(user, 'View World')
}

describe('View World behavior', () => {
  describe('from the Adventure Options', () => {
    test('when the player opens the Adventure Options then only View World can be picked', async () => {
      const { user } = await setupApp()

      await openAdventureOptions(user)

      expect(readAdventureOptions()).toEqual([
        'View World',
        'View Puzzle (disabled)',
        'View Scenario Info (disabled)',
        'Dig (disabled)',
        'Replay Opponent Turn (disabled)',
        'OK'
      ])
    })

    test('given the Adventure Options when the player clicks OK then they close', async () => {
      const { user } = await setupApp()
      await openAdventureOptions(user)

      await clickAdventureOption(user, 'OK')

      expect(queryAdventureOptions()).toBeNull()
    })

    test('given the Adventure Options when the player clicks View World then View World opens with the explored objects only', async () => {
      const { user } = await setupApp()

      await openViewWorldFromOptions(user)

      expect(queryAdventureOptions()).toBeNull()
      expect(readIconsInOrder()).toEqual(ICONS_OF_EXPLORED_OBJECTS)
    })
  })

  describe('the screen', () => {
    test('given an explored area and the fog beyond it when View World opens then the explored tiles have their terrain colour and the rest is black', async () => {
      await loadAppStyles()
      const { user } = await setupApp()

      await openViewWorldFromOptions(user)

      expect(backgroundOf(getViewWorldTile(2, 2))).toBe(backgroundOf(getTerrainTile(2, 2)))
      expect(backgroundOf(getViewWorldTile(15, 5))).toBe(BLACK)
    })

    test('given an own town and a neutral mine when View World opens then the town is marked in the player colour and the mine in grey', async () => {
      await loadAppStyles()
      const { user } = await setupApp()

      await openViewWorldFromOptions(user)

      expect(backgroundOf(getViewWorldIcon('Town', 4, 4))).toBe(PLAYER_RED)
      expect(backgroundOf(getViewWorldIcon('Mine (Gold)', 5, 1))).toBe(NEUTRAL_GREY)
    })

    test('when View World opens then the legend names the objects and the resources of the mines and piles', async () => {
      const { user } = await setupApp()

      await openViewWorldFromOptions(user)

      expect(readViewWorldLegend()).toEqual([
        'Town',
        'Hero',
        'Artifact',
        'Teleporter',
        'Gate',
        'Wood',
        'Mercury',
        'Ore',
        'Sulfur',
        'Crystal',
        'Gems',
        'Gold'
      ])
    })

    test('when View World opens then the map is at the middle zoom, and the zoom buttons make it smaller and larger', async () => {
      const { user } = await setupApp()
      await openViewWorldFromOptions(user)

      expect(readViewWorldTileSize()).toBe(11)
      expect(readPressedViewWorldZoom()).toEqual(['Magnify 2x'])

      await clickViewWorldButton(user, 'Magnify 1x')
      expect(readViewWorldTileSize()).toBe(7)
      expect(readPressedViewWorldZoom()).toEqual(['Magnify 1x'])

      await clickViewWorldButton(user, 'Magnify 4x')
      expect(readViewWorldTileSize()).toBe(16)
      expect(readPressedViewWorldZoom()).toEqual(['Magnify 4x'])
    })

    // The camera is centred on the hero's tile, (30.5, 20.5) in tiles. The screen's 220 x 220
    // map area at 11 pixels a tile shows 20 x 20 tiles, so their top-left corner is 10 tiles
    // up and left of that.
    test('given a large map when View World opens then it shows the part of the map the camera shows', async () => {
      const { user } = await setupApp(
        aScenario().withSize(60, 40).withEntities(aHero().at(30, 20)).withDefinitions(definitions),
        { viewportSize: { width: 1000, height: 700 } }
      )
      setViewWorldViewportSize(220, 220)

      await openViewWorldFromOptions(user)

      expect(readViewWorldTopLeftTile()).toEqual({ x: 20.5, y: 10.5 })
    })

    // At 1x the 60 x 40 map is 420 x 280 pixels and sits in the middle of the 500 x 300 area.
    // At 4x it is 16 pixels a tile and centred again on the camera's (30.5, 20.5): the area
    // shows 31.25 x 18.75 tiles, so its top-left corner is at (14.875, 11.125).
    test('given View World zoomed out until the whole map fits when the player zooms in then it is centred on where the camera is again', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(60, 40)
          .withEntities(aHero().at(30, 20))
          .withDefinitions(definitions),
        { viewportSize: { width: 1000, height: 700 } }
      )
      setViewWorldViewportSize(500, 300)
      await openViewWorldFromOptions(user)

      await clickViewWorldButton(user, 'Magnify 1x')
      await clickViewWorldButton(user, 'Magnify 4x')

      expect(readViewWorldTopLeftTile()).toEqual({ x: 14.875, y: 11.125 })
    })

    // Dragging 55 pixels left and 22 up moves the map by 5 and 2 tiles of 11 pixels.
    test('given View World on a large map when the player drags its map then it shows another part of it', async () => {
      const { user } = await setupApp(
        aScenario().withSize(60, 40).withEntities(aHero().at(30, 20)).withDefinitions(definitions),
        { viewportSize: { width: 1000, height: 700 } }
      )
      setViewWorldViewportSize(220, 220)
      await openViewWorldFromOptions(user)

      dragViewWorld({ x: 100, y: 100 }, { x: 45, y: 78 })

      expect(readViewWorldTopLeftTile()).toEqual({ x: 25.5, y: 12.5 })
    })

    test('given the adventure map scrolled away from the hero when the player closes View World with OK then the map is centred on the hero', async () => {
      const { user } = await setupApp(
        aScenario().withSize(60, 40).withEntities(aHero().at(30, 20)).withDefinitions(definitions),
        { viewportSize: { width: 1000, height: 700 } }
      )
      panCamera('ArrowRight', 10)
      await openViewWorldFromOptions(user)

      await clickViewWorldButton(user, 'OK')

      expect(queryViewWorld()).toBeNull()
      expect(getMapViewCentreTile()).toEqual({ x: 30, y: 20 })
    })

    test.each([
      'Escape',
      'Enter'
    ])('given View World when the player presses %s then it closes', async (key) => {
      const { user } = await setupApp()
      await openViewWorldFromOptions(user)

      await user.keyboard(`{${key}}`)

      expect(queryViewWorld()).toBeNull()
    })
  })

  describe('casting View Earth or View Air', () => {
    test('given a hero with View Earth when the player casts it then View World opens and the spell points go down by its cost', async () => {
      await cast('View Earth')

      expect(queryViewWorld()).toBeTruthy()
      expect(readHeroSpellPoints()).toBe('98')
    })

    test('given the spell book opened from the hero screen when the player clicks View Air then the hero screen closes and View World opens', async () => {
      const { user } = await setupApp()
      await clickHeroInHeroList(user, 'Seer')
      await clickHeroScreenSpellBook(user)

      await clickSpell(user, 'View Air')

      expect(queryHeroScreen()).toBeNull()
      expect(queryViewWorld()).toBeTruthy()
    })

    test('given a hero who cast View Earth and closed View World when they cast it again the same day then View World opens again', async () => {
      const { user } = await cast('View Earth', { earth: 'BASIC' })
      await clickViewWorldButton(user, 'OK')

      await castSpellFromMap(user, 'View Earth')

      expect(queryViewWorld()).toBeTruthy()
      expect(readHeroSpellPoints()).toBe('98')
    })

    test('given a hero who cast View Earth when the page reloads then the adventure map shows with the spell points spent', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(aWorld(), { eventLog })
      await castSpellFromMap(user, 'View Earth')

      await setupApp(aWorld(), { eventLog })

      expect(queryViewWorld()).toBeNull()
      expect(readHeroSpellPoints()).toBe('98')
    })

    test('given a hero who cast View Earth when they close View World and open it from the Adventure Options then the objects under the fog are not shown', async () => {
      const { user } = await cast('View Earth', { earth: 'EXPERT' })
      await clickViewWorldButton(user, 'OK')

      await openViewWorldFromOptions(user)

      expect(readIconsInOrder()).toEqual(ICONS_OF_EXPLORED_OBJECTS)
    })
  })

  describe('View Earth', () => {
    test.each([
      ['no skill', {}],
      ['Basic Earth Magic', { earth: 'BASIC' }]
    ])('given %s when the hero casts View Earth then View World also shows the resources under the fog', async (_, skill) => {
      await cast('View Earth', skill)

      expect(readIconsInOrder()).toEqual(
        inReadingOrder([...ICONS_OF_EXPLORED_OBJECTS, 'Resource (Wood) at 20,2'])
      )
    })

    test('given Advanced Earth Magic when the hero casts View Earth then View World also shows the mines under the fog', async () => {
      await cast('View Earth', { earth: 'ADVANCED' })

      expect(readIconsInOrder()).toEqual(
        inReadingOrder([
          ...ICONS_OF_EXPLORED_OBJECTS,
          'Resource (Wood) at 20,2',
          'Mine (Wood) at 20,6'
        ])
      )
    })

    test('given Expert Earth Magic when the hero casts View Earth then View World draws the terrain under the fog, but not the objects there', async () => {
      await loadAppStyles()
      await cast('View Earth', { earth: 'EXPERT' })

      expect(backgroundOf(getViewWorldTile(15, 5))).toBe(backgroundOf(getTerrainTile(2, 2)))
      expect(backgroundOf(getViewWorldTile(20, 6))).toBe(backgroundOf(getTerrainTile(2, 2)))
      expect(readIconsInOrder()).toEqual(
        inReadingOrder([
          ...ICONS_OF_EXPLORED_OBJECTS,
          'Resource (Wood) at 20,2',
          'Mine (Wood) at 20,6'
        ])
      )
    })

    test('given a hero who cast Expert View Earth when they close View World then the fog on the adventure map is as it was', async () => {
      const { user } = await cast('View Earth', { earth: 'EXPERT' })

      await clickViewWorldButton(user, 'OK')

      expect(isTileExplored(15, 5)).toBe(false)
    })
  })

  describe('View Air', () => {
    test.each([
      ['no skill', {}],
      ['Basic Air Magic', { air: 'BASIC' }]
    ])('given %s when the hero casts View Air then View World also shows the artifacts under the fog', async (_, skill) => {
      await cast('View Air', skill)

      expect(readIconsInOrder()).toEqual(
        inReadingOrder([...ICONS_OF_EXPLORED_OBJECTS, 'Artifact at 25,2'])
      )
    })

    test('given Expert Air Magic when the hero casts View Air then View World also shows the towns under the fog', async () => {
      await cast('View Air', { air: 'EXPERT' })

      expect(readIconsInOrder()).toEqual(
        inReadingOrder([...ICONS_OF_EXPLORED_OBJECTS, 'Artifact at 25,2', 'Town at 26,8'])
      )
    })
  })
})
