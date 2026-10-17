// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { loadAppStyles } from './app-styles.js'
import {
  confirmMove,
  expectHeroAt,
  expectNoPreview,
  flushMicrotasks,
  getTerrainTile,
  setupMovementBehaviorApp
} from './behavior.utils.js'
import { aHero, aMine, aMonster, aResource, aScenario, aTown } from './builders.js'
import { ALL_TERRAINS, GRASS, SAND } from './terrain-codes.js'

const PLAYER_RED = 'rgb(255, 0, 0)'
const NEUTRAL_GREY = 'rgb(132, 132, 132)'

const DEFAULT_MINIMAP_BOUNDS = {
  left: 0,
  top: 0,
  width: 200,
  height: 200,
  right: 200,
  bottom: 200
}

const LARGE_VIEWPORT_SIZE = { width: 1000, height: 700 }

// On the 60x40 large map with a 200x200 minimap, the point (100, 100) is tile (30, 20).
const CAMERA_CENTERED_ON_MIDDLE = 'translate(-476px, -306px)'
const CAMERA_AT_BOTTOM_RIGHT_EDGE = 'translate(-920px, -580px)'

async function setupLargeMapMinimapApp() {
  await setupMovementBehaviorApp({
    loadGameOptions: aScenario().withSize(60, 40).withEntities(aHero().at(20, 15)).build(),
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

function getTownMarker(x, y) {
  return document.querySelector(`.minimap-town-marker[data-tile-x="${x}"][data-tile-y="${y}"]`)
}

function getHeroMarker() {
  return document.querySelector('.minimap-hero-marker')
}

function backgroundOf(element) {
  expect(element).toBeTruthy()
  return window.getComputedStyle(element).backgroundColor
}

function getCameraTransform() {
  return getElementOrFail('.world').style.transform
}

function mockMinimapBounds(bounds = DEFAULT_MINIMAP_BOUNDS) {
  getMinimapMap().getBoundingClientRect = () => bounds
}

function dispatchMouse(target, type, clientX, clientY) {
  target.dispatchEvent(
    new window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX, clientY })
  )
}

function dispatchPointer(target, type, clientX, clientY, pointerType) {
  target.dispatchEvent(
    new window.PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 1,
      isPrimary: true,
      pointerType,
      clientX,
      clientY
    })
  )
}

function clickMinimap(clientX, clientY) {
  dispatchMouse(getMinimapMap(), 'click', clientX, clientY)
}

function pressOnMinimap(clientX, clientY, pointerType = 'mouse') {
  dispatchPointer(getMinimapMap(), 'pointerdown', clientX, clientY, pointerType)
}

function movePointer(clientX, clientY, target = getMinimapMap(), pointerType = 'mouse') {
  dispatchPointer(target, 'pointermove', clientX, clientY, pointerType)
}

function releasePointer(clientX, clientY, target = getMinimapMap(), pointerType = 'mouse') {
  dispatchPointer(target, 'pointerup', clientX, clientY, pointerType)
}

describe('minimap behavior', () => {
  describe('terrain', () => {
    test('given every terrain type in the scenario when the minimap renders then each terrain is drawn in its own colour', async () => {
      await loadAppStyles()
      await setupMovementBehaviorApp({
        loadGameOptions: aScenario().withSize(ALL_TERRAINS.length).withTiles(ALL_TERRAINS).build()
      })

      const colours = ALL_TERRAINS.map((_, x) => backgroundOf(getMinimapTile(x, 0)))

      expect(colours).not.toContain('rgba(0, 0, 0, 0)')
      expect(new Set(colours).size).toBe(ALL_TERRAINS.length)
    })

    test.each(
      ALL_TERRAINS
    )('given a tile with terrain code %i when the minimap renders then its minimap tile has the same colour as the map tile', async (terrainCode) => {
      await loadAppStyles()
      await setupMovementBehaviorApp({
        loadGameOptions: aScenario()
          .withSize(2)
          .withTiles([GRASS, terrainCode])
          .withEntities(aHero().at(0, 0))
          .build()
      })

      expect(backgroundOf(getMinimapTile(1, 0))).toBe(backgroundOf(getTerrainTile(1, 0)))
    })
  })

  describe('objects', () => {
    test('given a hero when the minimap renders then a hero marker in the player colour is at the hero tile', async () => {
      await loadAppStyles()
      await setupMovementBehaviorApp({
        loadGameOptions: aScenario().withSize(8, 7).withEntities(aHero().at(5, 3)).build()
      })

      const marker = getHeroMarker()
      expect(marker?.dataset.tileX).toBe('5')
      expect(marker?.dataset.tileY).toBe('3')
      expect(backgroundOf(marker)).toBe(PLAYER_RED)
    })

    test('given the hero moves when the move finishes then the hero marker is at the new tile', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aScenario().withSize(8, 3).withEntities(aHero().at(0, 1)).build()
      })

      await confirmMove(user, 4, 2)
      await flushMicrotasks()

      expectHeroAt(4, 2)
      expect(getHeroMarker()?.dataset.tileX).toBe('4')
      expect(getHeroMarker()?.dataset.tileY).toBe('2')
    })

    test('given a mine when the minimap renders then its tiles are drawn neutral grey', async () => {
      await loadAppStyles()
      await setupMovementBehaviorApp({
        loadGameOptions: aScenario()
          .withSize(5, 3)
          .withEntities(aHero().at(0, 2), aMine().at(2, 1))
          .build()
      })

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

    test('given a town when the minimap renders then its marker is neutral grey', async () => {
      await loadAppStyles()
      await setupMovementBehaviorApp({
        loadGameOptions: aScenario().withSize(8, 7).withEntities(aHero(), aTown().at(4, 3)).build()
      })

      expect(backgroundOf(getTownMarker(4, 3))).toBe(NEUTRAL_GREY)
    })

    test('given towns when the minimap renders then town markers appear at town coordinates', async () => {
      await setupMovementBehaviorApp({
        loadGameOptions: aScenario()
          .withSize(8, 7)
          .withEntities(aHero(), aTown().at(4, 3), aTown().withId('town-2').at(6, 2))
          .build()
      })

      const townMarkers = document.querySelectorAll('.minimap-town-marker')
      expect(townMarkers).toHaveLength(2)
      expect(getTownMarker(4, 3)).toBeTruthy()
      expect(getTownMarker(6, 2)).toBeTruthy()
    })

    test('given a monster and a resource when the minimap renders then their tiles show only the terrain colour', async () => {
      await loadAppStyles()
      await setupMovementBehaviorApp({
        loadGameOptions: aScenario()
          .withSize(4)
          .withTiles([GRASS, SAND, SAND, GRASS])
          .withEntities(aHero().at(0, 0), aMonster().at(1, 0), aResource().at(2, 0))
          .build()
      })

      expect(backgroundOf(getMinimapTile(1, 0))).toBe(backgroundOf(getTerrainTile(1, 0)))
      expect(backgroundOf(getMinimapTile(2, 0))).toBe(backgroundOf(getTerrainTile(2, 0)))
    })
  })

  describe('camera', () => {
    test('given camera starts and then pans when viewport changes then minimap viewport box updates position', async () => {
      await setupLargeMapMinimapApp()

      const viewportBox = getElementOrFail('#minimap-viewport')
      const before = viewportBox.style.getPropertyValue('--minimap-viewport-left')

      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }))

      expect(viewportBox.style.getPropertyValue('--minimap-viewport-left')).not.toBe(before)
    })

    test('given player clicks minimap when click hits a valid map region then camera recenters to clicked area', async () => {
      await setupLargeMapMinimapApp()

      clickMinimap(100, 100)

      expect(getCameraTransform()).toBe(CAMERA_CENTERED_ON_MIDDLE)
    })

    test('given player clicks near minimap border when recentering exceeds bounds then camera clamps at map edge', async () => {
      await setupLargeMapMinimapApp()

      clickMinimap(199, 199)

      expect(getCameraTransform()).toBe(CAMERA_AT_BOTTOM_RIGHT_EDGE)
    })

    test('given the player presses on the minimap and drags when the pointer moves then the camera follows the pointer', async () => {
      await setupLargeMapMinimapApp()

      pressOnMinimap(10, 10)
      movePointer(100, 100)

      expect(getCameraTransform()).toBe(CAMERA_CENTERED_ON_MIDDLE)
    })

    test('given the player touches the minimap and slides their finger when it moves then the camera follows the finger', async () => {
      await setupLargeMapMinimapApp()

      pressOnMinimap(10, 10, 'touch')
      movePointer(100, 100, getMinimapMap(), 'touch')

      expect(getCameraTransform()).toBe(CAMERA_CENTERED_ON_MIDDLE)
    })

    test('given the player is dragging when the pointer leaves the minimap then the camera keeps following and stays inside the map edges', async () => {
      await setupLargeMapMinimapApp()

      pressOnMinimap(10, 10)
      movePointer(500, 450, document.body)

      expect(getCameraTransform()).toBe(CAMERA_AT_BOTTOM_RIGHT_EDGE)
    })

    test('given the player releases the pointer when they move the mouse afterwards then the camera stops following', async () => {
      await setupLargeMapMinimapApp()

      pressOnMinimap(10, 10)
      movePointer(100, 100)
      releasePointer(100, 100)
      movePointer(190, 190)

      expect(getCameraTransform()).toBe(CAMERA_CENTERED_ON_MIDDLE)
    })

    test('given the player drags from the minimap onto the map when they release then the hero does not move and no path preview appears', async () => {
      await setupLargeMapMinimapApp()
      const mapTile = getTerrainTile(21, 15)

      pressOnMinimap(10, 10)
      movePointer(100, 100, mapTile)
      releasePointer(100, 100, mapTile)
      // The browser sends the click to the closest element containing both press and release.
      dispatchMouse(getElementOrFail('.game-shell'), 'click', 100, 100)
      await flushMicrotasks()

      expectHeroAt(20, 15)
      expectNoPreview()
    })
  })
})
