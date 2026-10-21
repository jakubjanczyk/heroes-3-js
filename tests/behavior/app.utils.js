// Starting the app in a behavior test, and waiting for it: the page, the faked game data and
// the event log a reload replays.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import userEvent from '@testing-library/user-event'
import { expect, vi } from 'vitest'

import { bootApp } from '../../app/boot-app.js'
import { aScenario } from './builders.js'

const INDEX_HTML_PATH = join(import.meta.dirname, '../../index.html')
const appBodyHtml = readFileSync(INDEX_HTML_PATH, 'utf8')
  .match(/<body>([\s\S]*)<\/body>/)[1]
  .replace(/<script[\s\S]*?<\/script>/g, '')

export function readGameData(fileName) {
  return JSON.parse(readFileSync(join(import.meta.dirname, '../../game/data', fileName), 'utf8'))
}

export function mountAppTemplate() {
  document.body.innerHTML = appBodyHtml
}

export function createMemoryEventLog() {
  const entries = []

  return {
    async init() {},
    async record(event) {
      entries.push({
        id: entries.length + 1,
        v: 1,
        type: event.type,
        detail: event.detail,
        at: Date.now()
      })
    },
    getAll() {
      return [...entries]
    },
    async reset() {
      entries.length = 0
    },
    hasExistingSession() {
      return entries.length > 0
    }
  }
}

export function createLoadGame({
  width = 4,
  height = 1,
  tiles = [0, 0, 0, 0],
  roads,
  startingResources,
  entities = [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }],
  definitions = {}
} = {}) {
  const terrainTiles = Array.isArray(tiles) ? [...tiles] : []
  const scenarioEntities = Array.isArray(entities)
    ? entities.map((entity) => ({
        ...entity,
        tile: entity?.tile ? { ...entity.tile } : entity.tile
      }))
    : []

  return {
    scenario: {
      meta: { id: 'demo' },
      terrain: { width, height, tiles: terrainTiles, ...(roads ? { roads: [...roads] } : {}) },
      entities: scenarioEntities,
      ...(startingResources ? { startingResources: { ...startingResources } } : {})
    },
    definitions: {
      hero: {},
      heroClasses: {},
      monsters: {},
      resources: {},
      towns: {},
      mines: {},
      ...definitions
    }
  }
}

// setImmediate is left real by the fake clock and runs only once the microtask queue is empty,
// so every promise chain already started settles, without moving the clock.
export async function flushMicrotasks() {
  await new Promise((resolve) => setImmediate(resolve))
}

// Moves the fake clock (see fake-timers.setup.js) on by `ms`, running every timer due on the way.
export async function waitMs(ms = 0) {
  await vi.advanceTimersByTimeAsync(ms)
}

function createJsonResponse(value) {
  return {
    ok: true,
    status: 200,
    async json() {
      return value
    }
  }
}

function createGameFetch({ scenario, definitions, musicTracks = [] }) {
  const routeMap = new Map([
    ['./scenarios/scenario.json', scenario],
    ['/scenarios/scenario.json', scenario],
    ['./game/data/hero.json', definitions.hero ?? {}],
    ['/game/data/hero.json', definitions.hero ?? {}],
    ['./game/data/hero-classes.json', definitions.heroClasses ?? {}],
    ['/game/data/hero-classes.json', definitions.heroClasses ?? {}],
    ['./game/data/monsters.json', definitions.monsters ?? {}],
    ['/game/data/monsters.json', definitions.monsters ?? {}],
    ['./game/data/resources.json', definitions.resources ?? {}],
    ['/game/data/resources.json', definitions.resources ?? {}],
    ['./game/data/towns.json', definitions.towns ?? {}],
    ['/game/data/towns.json', definitions.towns ?? {}],
    ['./game/data/mines.json', definitions.mines ?? {}],
    ['/game/data/mines.json', definitions.mines ?? {}],
    ['./assets/music/tracks.json', musicTracks],
    ['/assets/music/tracks.json', musicTracks]
  ])

  return async (url) => {
    if (!routeMap.has(url)) {
      return {
        ok: false,
        status: 404,
        async json() {
          return null
        }
      }
    }

    return createJsonResponse(routeMap.get(url))
  }
}

export function setViewportSize(width, height) {
  const viewport = document.querySelector('.viewport')
  expect(viewport).toBeTruthy()
  Object.defineProperty(viewport, 'clientWidth', {
    value: width,
    configurable: true
  })
  Object.defineProperty(viewport, 'clientHeight', {
    value: height,
    configurable: true
  })
  viewport.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: width,
    bottom: height
  })
}

export async function setupMovementBehaviorApp({
  loadGameOptions,
  viewportSize,
  musicTracks = [],
  AudioCtor,
  movementStepDelayMs = 0,
  appConfig = {},
  eventLog,
  envWindow
} = {}) {
  mountAppTemplate()
  if (viewportSize) {
    setViewportSize(viewportSize.width, viewportSize.height)
  }

  const gameData = createLoadGame(loadGameOptions)
  const fetch = createGameFetch({
    scenario: gameData.scenario,
    definitions: gameData.definitions,
    musicTracks
  })

  const movementSleep = (ms) => {
    if (ms <= 0) {
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  const world = await bootApp({
    fetch,
    document,
    window: envWindow ?? window,
    ...(AudioCtor ? { AudioCtor } : {}),
    ...(eventLog ? { eventLog } : {}),
    config: {
      musicTracks,
      movementStepDelayMs,
      movementSleep,
      battleStepDelayMs: 0,
      interactionModalTransitionMs: 0,
      ...appConfig
    }
  })

  return { user, world }
}

export async function setupLinearMovementApp(options = {}) {
  const {
    width = 20,
    viewportSize,
    musicTracks,
    AudioCtor,
    movementStepDelayMs,
    appConfig
  } = options
  return setupMovementBehaviorApp({
    loadGameOptions: aScenario().withSize(width).build(),
    viewportSize,
    musicTracks,
    AudioCtor,
    movementStepDelayMs,
    appConfig
  })
}

// The Heroes 3 cursor the mouse shows over an element, by its picture in assets/cursors:
// 'arrow', 'hero', 'move', 'attack' or 'visit', with '-2' to '-4' for the day the hero gets there.
export function getCursorOver(element) {
  const cursor = window.getComputedStyle(element).cursor
  return cursor.match(/cursors\/([\w-]+)\.png/)?.[1] ?? cursor
}

export async function pressKey(user, key) {
  await user.keyboard(key)
  await flushMicrotasks()
  await waitMs()
  await flushMicrotasks()
}
