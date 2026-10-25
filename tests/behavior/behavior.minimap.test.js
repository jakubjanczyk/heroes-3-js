// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import {
  confirmMove,
  confirmTileClickByDispatch,
  expectHeroAt,
  expectNoPreview,
  getMapViewCentreTile,
  getTerrainTile
} from './adventure-map.utils.js'
import { flushMicrotasks, setupMovementBehaviorApp } from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import { aHero, aMine, aMonster, aResource, aScenario, aTown } from './builders.js'
import { ALL_TERRAINS, GRASS, SAND } from './terrain-codes.js'

const PLAYER_RED = 'rgb(255, 0, 0)'
const NEUTRAL_GREY = 'rgb(132, 132, 132)'
const BLACK = 'rgb(0, 0, 0)'

const DEFAULT_MINIMAP_BOUNDS = {
  left: 0,
  top: 0,
  width: 200,
  height: 200,
  right: 200,
  bottom: 200
}

const LARGE_VIEWPORT_SIZE = { width: 1000, height: 700 }
const TILE_SIZE = 32

// The 60x40 large map shows 31.25 x 21.875 tiles at a time in the 1000x700 viewport, and on the
// 200x200 minimap the point (100, 100) is over tile (30, 20).
const MAP_VIEW_AT_BOTTOM_RIGHT_CORNER = { left: 28.75, top: 18.125, right: 60, bottom: 40 }

let mapSize = null
let viewportSize = null

async function setupApp(scenario, options = {}) {
  mapSize = { width: scenario.width, height: scenario.height }
  viewportSize = options.viewportSize ?? null
  return setupMovementBehaviorApp({ loadGameOptions: scenario, ...options })
}

async function setupLargeMapMinimapApp() {
  await setupApp(aScenario().withSize(60, 40).withEntities(aHero().at(20, 15)).build(), {
    viewportSize: LARGE_VIEWPORT_SIZE
  })
  mockMinimapBounds()
}

function getElementOrFail(selector) {
  const element = document.querySelector(selector)
  expect(element).toBeTruthy()
  return element
}

function getMinimapMap() {
  return getElementOrFail('#minimap-map')
}

function getMinimapTile(x, y) {
  return document.querySelector(`.minimap-tile[data-x="${x}"][data-y="${y}"]`)
}

function getTownDots() {
  return [...document.querySelectorAll('.minimap-town-marker')]
}

function getHeroDot() {
  return document.querySelector('.minimap-hero-marker')
}

function getHeroDots() {
  return [...document.querySelectorAll('.minimap-hero-marker')]
}

// jsdom does no layout, so the helpers below read the styles that place an element and turn
// them back into the map tiles the player sees it over.
function percentStyle(element, property) {
  return Number.parseFloat(element.style.getPropertyValue(property))
}

function getMinimapDotTile(dot) {
  expect(dot).toBeTruthy()
  return {
    x: Math.floor((percentStyle(dot, '--minimap-marker-x') / 100) * mapSize.width),
    y: Math.floor((percentStyle(dot, '--minimap-marker-y') / 100) * mapSize.height)
  }
}

// The area, in tiles, that the box on the minimap outlines.
function getMinimapBoxArea() {
  const box = getElementOrFail('#minimap-viewport')
  const left = (percentStyle(box, '--minimap-viewport-left') / 100) * mapSize.width
  const top = (percentStyle(box, '--minimap-viewport-top') / 100) * mapSize.height
  return {
    left,
    top,
    right: left + (percentStyle(box, '--minimap-viewport-width') / 100) * mapSize.width,
    bottom: top + (percentStyle(box, '--minimap-viewport-height') / 100) * mapSize.height
  }
}

// The area, in tiles, that the map view shows.
function getMapViewArea() {
  const [, offsetX, offsetY] = getElementOrFail('.world').style.transform.match(
    /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/
  )
  const left = -Number(offsetX) / TILE_SIZE
  const top = -Number(offsetY) / TILE_SIZE
  return {
    left,
    top,
    right: left + viewportSize.width / TILE_SIZE,
    bottom: top + viewportSize.height / TILE_SIZE
  }
}

function expectAreaCloseTo(actual, expected) {
  for (const side of ['left', 'top', 'right', 'bottom']) {
    expect(actual[side], side).toBeCloseTo(expected[side])
  }
}

function backgroundOf(element) {
  expect(element).toBeTruthy()
  return window.getComputedStyle(element).backgroundColor
}

function mockMinimapBounds(bounds = DEFAULT_MINIMAP_BOUNDS) {
  getMinimapMap().getBoundingClientRect = () => bounds
}

function dispatchMouse(target, type, clientX, clientY) {
  target.dispatchEvent(
    new window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX, clientY })
  )
}

// `buttons` is 1 while the primary button is held (or a finger is down), 0 otherwise.
function dispatchPointer(target, type, clientX, clientY, pointerType, buttons) {
  target.dispatchEvent(
    new window.PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      buttons,
      pointerId: 1,
      isPrimary: true,
      pointerType,
      clientX,
      clientY
    })
  )
}

// A click is a press and a release followed by the click event, as browsers send it.
function clickMinimap(clientX, clientY) {
  pressOnMinimap(clientX, clientY)
  releasePointer(clientX, clientY)
  dispatchMouse(getMinimapMap(), 'click', clientX, clientY)
}

function pressPointer(clientX, clientY, target, pointerType = 'mouse') {
  dispatchPointer(target, 'pointerdown', clientX, clientY, pointerType, 1)
}

function pressOnMinimap(clientX, clientY, pointerType = 'mouse') {
  pressPointer(clientX, clientY, getMinimapMap(), pointerType)
}

// Moves with the button held, as in a drag.
function movePointer(clientX, clientY, target = getMinimapMap(), pointerType = 'mouse') {
  dispatchPointer(target, 'pointermove', clientX, clientY, pointerType, 1)
}

// Moves with no button held.
function hoverPointer(clientX, clientY, target = getMinimapMap()) {
  dispatchPointer(target, 'pointermove', clientX, clientY, 'mouse', 0)
}

function releasePointer(clientX, clientY, target = getMinimapMap(), pointerType = 'mouse') {
  dispatchPointer(target, 'pointerup', clientX, clientY, pointerType, 0)
}

describe('minimap behavior', () => {
  describe('terrain', () => {
    test('given every terrain type in the scenario when the minimap renders then each terrain is drawn in its own colour', async () => {
      await loadAppStyles()
      await setupApp(aScenario().withSize(ALL_TERRAINS.length).withTiles(ALL_TERRAINS).build())

      const colours = ALL_TERRAINS.map((_, x) => backgroundOf(getMinimapTile(x, 0)))

      expect(colours).not.toContain('rgba(0, 0, 0, 0)')
      expect(new Set(colours).size).toBe(ALL_TERRAINS.length)
    })

    test.each(
      ALL_TERRAINS
    )('given a tile with terrain code %i when the minimap renders then its minimap tile has the same colour as the map tile', async (terrainCode) => {
      await loadAppStyles()
      await setupApp(
        aScenario()
          .withSize(2)
          .withTiles([GRASS, terrainCode])
          .withEntities(aHero().at(0, 0))
          .build()
      )

      expect(backgroundOf(getMinimapTile(1, 0))).toBe(backgroundOf(getTerrainTile(1, 0)))
    })
  })

  describe('objects', () => {
    test('given a hero when the minimap renders then a hero marker in the player colour is at the hero tile', async () => {
      await loadAppStyles()
      await setupApp(aScenario().withSize(8, 7).withEntities(aHero().at(5, 3)).build())

      const dot = getHeroDot()
      expect(getMinimapDotTile(dot)).toEqual({ x: 5, y: 3 })
      expect(backgroundOf(dot)).toBe(PLAYER_RED)
    })

    test('given two heroes when the minimap renders then there is a hero marker at each of their tiles', async () => {
      await setupApp(
        aScenario()
          .withSize(8, 7)
          .withEntities(aHero().at(5, 3), aHero().withId('hero-2').at(1, 6))
          .build()
      )

      expect(getHeroDots().map(getMinimapDotTile)).toEqual([
        { x: 5, y: 3 },
        { x: 1, y: 6 }
      ])
    })

    test('given the hero moves when the move finishes then the hero marker is at the new tile', async () => {
      const { user } = await setupApp(
        aScenario().withSize(8, 3).withEntities(aHero().at(0, 1)).build()
      )

      await confirmMove(user, 4, 2)

      expectHeroAt(4, 2)
      expect(getMinimapDotTile(getHeroDot())).toEqual({ x: 4, y: 2 })
    })

    test('given a mine when the minimap renders then its tiles are drawn neutral grey', async () => {
      await loadAppStyles()
      await setupApp(
        aScenario().withSize(5, 3).withEntities(aHero().at(0, 2), aMine().at(2, 1)).build()
      )

      const mineTiles = [
        [1, 0],
        [2, 0],
        [3, 0],
        [1, 1],
        [2, 1],
        [3, 1]
      ]
      const colours = mineTiles.map(([x, y]) => backgroundOf(getMinimapTile(x, y)))

      expect(colours).toEqual(new Array(6).fill(NEUTRAL_GREY))
    })

    test('given the hero captured a mine when the minimap renders then its tiles are drawn in the player colour', async () => {
      await loadAppStyles()
      await setupApp(
        aScenario().withSize(5, 3).withEntities(aHero().at(2, 2), aMine().at(2, 1)).build()
      )

      confirmTileClickByDispatch(2, 1)
      await flushMicrotasks()

      const mineTiles = [
        [1, 0],
        [2, 0],
        [3, 0],
        [1, 1],
        [2, 1],
        [3, 1]
      ]
      const colours = mineTiles.map(([x, y]) => backgroundOf(getMinimapTile(x, y)))

      expect(colours).toEqual(new Array(6).fill(PLAYER_RED))
    })

    test('given a town when the minimap renders then its marker is neutral grey', async () => {
      await loadAppStyles()
      await setupApp(aScenario().withSize(8, 7).withEntities(aHero(), aTown().at(4, 3)).build())

      expect(backgroundOf(getTownDots()[0])).toBe(NEUTRAL_GREY)
    })

    test('given the player owns a town when the minimap renders then its marker is in the player colour', async () => {
      await loadAppStyles()
      await setupApp(
        aScenario().withSize(8, 7).withEntities(aHero(), aTown().ownedByPlayer().at(4, 3)).build()
      )

      expect(backgroundOf(getTownDots()[0])).toBe(PLAYER_RED)
    })

    test('given towns when the minimap renders then town markers appear at town coordinates', async () => {
      await setupApp(
        aScenario()
          .withSize(8, 7)
          .withEntities(aHero(), aTown().at(4, 3), aTown().withId('town-2').at(6, 2))
          .build()
      )

      expect(getTownDots().map(getMinimapDotTile)).toEqual([
        { x: 4, y: 3 },
        { x: 6, y: 2 }
      ])
    })

    test('given a monster and a resource when the minimap renders then their tiles show only the terrain colour', async () => {
      await loadAppStyles()
      await setupApp(
        aScenario()
          .withSize(4)
          .withTiles([GRASS, SAND, SAND, GRASS])
          .withEntities(aHero().at(0, 0), aMonster().at(1, 0), aResource().at(2, 0))
          .build()
      )

      expect(backgroundOf(getMinimapTile(1, 0))).toBe(backgroundOf(getTerrainTile(1, 0)))
      expect(backgroundOf(getMinimapTile(2, 0))).toBe(backgroundOf(getTerrainTile(2, 0)))
    })
  })

  describe('fog of war', () => {
    const aFoggyScenario = () => aScenario().withFogOfWar(true).withSize(30, 3)

    test('given tiles the hero has not explored when the minimap renders then they are drawn black', async () => {
      await loadAppStyles()
      await setupApp(aFoggyScenario().build())

      expect([0, 29].map((x) => backgroundOf(getMinimapTile(x, 0)))).toEqual([
        backgroundOf(getTerrainTile(0, 0)),
        BLACK
      ])
    })

    test('given a town on an unexplored tile when the minimap renders then only the explored town has a marker', async () => {
      await setupApp(
        aFoggyScenario()
          .withEntities(aHero(), aTown().at(4, 2), aTown().withId('town-2').at(20, 2))
          .build()
      )

      expect(getTownDots().map(getMinimapDotTile)).toEqual([{ x: 4, y: 2 }])
    })

    test('given a mine on an unexplored tile when the minimap renders then its tiles are drawn black', async () => {
      await loadAppStyles()
      await setupApp(aFoggyScenario().withEntities(aHero(), aMine().at(20, 1)).build())

      expect([19, 20, 21].map((x) => backgroundOf(getMinimapTile(x, 1)))).toEqual([
        BLACK,
        BLACK,
        BLACK
      ])
    })
  })

  describe('camera', () => {
    test('given the player pans the map when the camera moves then the minimap box outlines the area the map view shows', async () => {
      await setupLargeMapMinimapApp()

      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }))

      // Centred on the hero at (20, 15), then half a tile to the right.
      expectAreaCloseTo(getMinimapBoxArea(), {
        left: 5.375,
        top: 4.5625,
        right: 36.625,
        bottom: 26.4375
      })
    })

    test('given player clicks minimap when click hits a valid map region then the map view is centred on the clicked spot', async () => {
      await setupLargeMapMinimapApp()

      clickMinimap(100, 100)

      expect(getMapViewCentreTile()).toEqual({ x: 30, y: 20 })
    })

    test('given player clicks near minimap border when recentering exceeds bounds then the map view stops at the map edge', async () => {
      await setupLargeMapMinimapApp()

      clickMinimap(199, 199)

      expect(getMapViewArea()).toEqual(MAP_VIEW_AT_BOTTOM_RIGHT_CORNER)
    })

    test('given the player presses on the minimap and drags when the pointer moves then the camera follows the pointer', async () => {
      await setupLargeMapMinimapApp()

      pressOnMinimap(10, 10)
      movePointer(100, 100)

      expect(getMapViewCentreTile()).toEqual({ x: 30, y: 20 })
    })

    test('given the player touches the minimap and slides their finger when it moves then the camera follows the finger', async () => {
      await setupLargeMapMinimapApp()

      pressOnMinimap(10, 10, 'touch')
      movePointer(100, 100, getMinimapMap(), 'touch')

      expect(getMapViewCentreTile()).toEqual({ x: 30, y: 20 })
    })

    test('given the player is dragging when the pointer leaves the minimap then the camera keeps following and stays inside the map edges', async () => {
      await setupLargeMapMinimapApp()

      pressOnMinimap(10, 10)
      movePointer(500, 450, document.body)

      expect(getMapViewArea()).toEqual(MAP_VIEW_AT_BOTTOM_RIGHT_CORNER)
    })

    test('given the player released a minimap drag when they later drag elsewhere then the camera does not follow', async () => {
      await setupLargeMapMinimapApp()
      const heroInfo = getElementOrFail('.info-box')

      pressOnMinimap(10, 10)
      movePointer(100, 100)
      releasePointer(100, 100)
      pressPointer(190, 190, heroInfo)
      movePointer(195, 195, heroInfo)

      expect(getMapViewCentreTile()).toEqual({ x: 30, y: 20 })
    })

    test('given the release of a minimap drag was lost when the mouse moves with no button held then the camera does not follow', async () => {
      await setupLargeMapMinimapApp()

      pressOnMinimap(10, 10)
      movePointer(100, 100)
      // No pointerup arrives, e.g. the button was released while a context menu was open.
      hoverPointer(190, 190)

      expect(getMapViewCentreTile()).toEqual({ x: 30, y: 20 })
    })

    test('given the player drags from the minimap onto the map when they release then the hero does not move and no path preview appears', async () => {
      await setupLargeMapMinimapApp()
      const mapTile = getTerrainTile(21, 15)

      pressOnMinimap(10, 10)
      movePointer(100, 100, mapTile)
      releasePointer(100, 100, mapTile)
      // The browser sends the click to the closest element containing both press and release.
      dispatchMouse(getElementOrFail('.game-shell'), 'click', 100, 100)

      expectHeroAt(20, 15)
      expectNoPreview()
    })
  })
})
