// Shared utilities for behavior-level tests.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { screen, within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { expect } from 'vitest'

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

export async function flushMicrotasks(times = 30) {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve()
  }
}

export async function waitMs(ms = 0) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
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

  const user = userEvent.setup()

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

export function getTerrainTile(x, y) {
  return document.querySelector(`.terrain-tile[data-x="${x}"][data-y="${y}"]`)
}

export function getRoadOn(x, y) {
  return document.querySelector(`.road[data-x="${x}"][data-y="${y}"]`)
}

export function getHeroEntity() {
  return document.querySelector('.entity--hero[data-entity-id="hero-1"]')
}

export function getMonsterEntity(entityId = 'monster-1') {
  return document.querySelector(`.entity--monster[data-entity-id="${entityId}"]`)
}

export function getResourceEntity(entityId = 'resource-1') {
  return document.querySelector(`.entity--resource[data-entity-id="${entityId}"]`)
}

export function getTownEntity(entityId = 'town-1') {
  return document.querySelector(`.entity--town[data-entity-id="${entityId}"]`)
}

export function getMineEntity(entityId = 'mine-1') {
  return document.querySelector(`.entity--mine[data-entity-id="${entityId}"]`)
}

export function expectHeroAt(x, y) {
  const heroEntity = getHeroEntity()
  expect(heroEntity).toBeTruthy()
  expect(heroEntity?.dataset.tileX).toBe(String(x))
  expect(heroEntity?.dataset.tileY).toBe(String(y))
  return heroEntity
}

export function getHeroList() {
  return screen.getByRole('list', { name: 'Heroes' })
}

export function getHeroInHeroList(heroName) {
  return within(getHeroList()).getByRole('button', { name: heroName })
}

// Each of the seven army slots as "<name> <count>", or '' when the slot is empty.
export function readArmySlots(container) {
  const army = within(container).getByRole('list', { name: 'Army' })
  return within(army)
    .getAllByRole('listitem')
    .map((slot) => {
      const creature = within(slot).queryByRole('img')
      return creature ? `${creature.getAttribute('aria-label')} ${slot.textContent.trim()}` : ''
    })
}

export function getHeroInfoBox() {
  return screen.getByRole('region', { name: 'Hero info' })
}

export function getNextHeroButton() {
  return screen.getByRole('button', { name: 'Next hero' })
}

export function expectMovementPoints(current, max = 1500) {
  const movementBar = within(getHeroList()).getByRole('progressbar', { name: 'Movement points' })
  expect({
    value: movementBar.getAttribute('aria-valuenow'),
    max: movementBar.getAttribute('aria-valuemax')
  }).toEqual({ value: String(current), max: String(max) })
}

export function expectMonsterPresent(entityId = 'monster-1') {
  const monsterEntity = getMonsterEntity(entityId)
  expect(monsterEntity).toBeTruthy()
  return monsterEntity
}

export function expectMonsterAt(x, y, entityId = 'monster-1') {
  const monsterEntity = expectMonsterPresent(entityId)
  expect(monsterEntity?.dataset.tileX).toBe(String(x))
  expect(monsterEntity?.dataset.tileY).toBe(String(y))
  return monsterEntity
}

export function expectMonsterNotPresent(entityId = 'monster-1') {
  expect(getMonsterEntity(entityId)).toBeFalsy()
}

export function expectMonsterDefeating(entityId = 'monster-1') {
  expect(getMonsterEntity(entityId)?.className).toContain('entity--monster-defeating')
}

export function expectResourcePresent(entityId = 'resource-1') {
  const resourceEntity = getResourceEntity(entityId)
  expect(resourceEntity).toBeTruthy()
  return resourceEntity
}

export function expectResourceAt(x, y, entityId = 'resource-1') {
  const resourceEntity = expectResourcePresent(entityId)
  expect(resourceEntity?.dataset.tileX).toBe(String(x))
  expect(resourceEntity?.dataset.tileY).toBe(String(y))
  return resourceEntity
}

export function expectResourceNotPresent(entityId = 'resource-1') {
  expect(getResourceEntity(entityId)).toBeFalsy()
}

export function expectResourceCollecting(entityId = 'resource-1') {
  expect(getResourceEntity(entityId)?.className).toContain('entity--resource-collecting')
}

export function expectTownPresent(entityId = 'town-1') {
  const townEntity = getTownEntity(entityId)
  expect(townEntity).toBeTruthy()
  return townEntity
}

export function expectTownAt(x, y, entityId = 'town-1') {
  const townEntity = expectTownPresent(entityId)
  expect(townEntity?.dataset.tileX).toBe(String(x))
  expect(townEntity?.dataset.tileY).toBe(String(y))
  return townEntity
}

export function expectTownNotPresent(entityId = 'town-1') {
  expect(getTownEntity(entityId)).toBeFalsy()
}

export function expectMinePresent(entityId = 'mine-1') {
  const mineEntity = getMineEntity(entityId)
  expect(mineEntity).toBeTruthy()
  return mineEntity
}

export function expectMineAt(x, y, entityId = 'mine-1') {
  const mineEntity = expectMinePresent(entityId)
  expect(mineEntity?.dataset.tileX).toBe(String(x))
  expect(mineEntity?.dataset.tileY).toBe(String(y))
  return mineEntity
}

export function expectMineNotPresent(entityId = 'mine-1') {
  expect(getMineEntity(entityId)).toBeFalsy()
}

// Each resource bar entry as the player reads it, e.g. 'Gold 100'.
export function getResourceBarItems() {
  const resourceBar = screen.getByRole('list', { name: 'Resources' })
  return within(resourceBar)
    .getAllByRole('listitem')
    .map((item) => item.textContent.replace(/\s+/g, ' ').trim())
}

export function expectResourceTotal(resourceName, amount) {
  expect(getResourceBarItems()).toContain(`${resourceName} ${amount}`)
}

export function getInteractionModal() {
  return document.querySelector('interaction-modal, .interaction-modal')
}

export function getInteractionModalMessage() {
  return getInteractionModal()?.querySelector('.interaction-modal__message') ?? null
}

export function getInteractionModalOkButton() {
  return getInteractionModal()?.querySelector('.interaction-modal__ok-button') ?? null
}

export function expectInteractionModalOpen(messageIncludes = null) {
  const modal = getInteractionModal()
  expect(modal).toBeTruthy()

  if (messageIncludes !== null) {
    expect(getInteractionModalMessage()?.textContent ?? '').toContain(messageIncludes)
  }

  return modal
}

export function expectInteractionModalClosed() {
  expect(getInteractionModal()).toBeFalsy()
}

export async function closeInteractionModal(user) {
  const okButton = getInteractionModalOkButton()
  expect(okButton).toBeTruthy()
  await user.click(okButton)
}

export function expectHasOverLimitTargetMarker() {
  expect(document.querySelector('.path-preview-target-line-over-limit')).toBeTruthy()
}

export function getPreviewSvg() {
  return document.querySelector('.effects-layer .path-preview-svg')
}

export function getPreviewDashAt(x, y) {
  return document.querySelector(`.path-preview-dash[data-x="${x}"][data-y="${y}"]`)
}

export function getPreviewCornerAt(x, y) {
  return document.querySelector(`.path-preview-corner[data-x="${x}"][data-y="${y}"]`)
}

export function getPreviewTargetAt(x, y) {
  return document.querySelector(`.path-preview-target[data-x="${x}"][data-y="${y}"]`)
}

export function getPreviewOverLimitDashAt(x, y) {
  return document.querySelector(`.path-preview-dash-over-limit[data-x="${x}"][data-y="${y}"]`)
}

export function hasOverLimitTargetLineAt(x, y) {
  const target = getPreviewTargetAt(x, y)
  if (!target) {
    return false
  }
  return Boolean(target.querySelector('.path-preview-target-line-over-limit'))
}

export function expectPreviewDashAt(x, y) {
  expect(getPreviewDashAt(x, y)).toBeTruthy()
}

export function expectPreviewCornerAt(x, y) {
  expect(getPreviewCornerAt(x, y)).toBeTruthy()
}

export function expectPreviewTargetAt(x, y) {
  expect(getPreviewTargetAt(x, y)).toBeTruthy()
}

export function expectPreviewOverLimitDashAt(x, y) {
  expect(getPreviewOverLimitDashAt(x, y)).toBeTruthy()
}

export function expectPreviewOverLimitTargetAt(x, y) {
  expect(hasOverLimitTargetLineAt(x, y)).toBe(true)
}

export function expectPreviewNotOverLimitTargetAt(x, y) {
  expect(hasOverLimitTargetLineAt(x, y)).toBe(false)
}

export function expectNoPreview() {
  expect(document.querySelector('.path-preview-svg')).toBeFalsy()
  expect(document.querySelector('.path-preview-target')).toBeFalsy()
}

// Resolves once the move has played out (with no step delay, it settles in microtasks).
export async function confirmMove(user, x, y) {
  const tile = getTerrainTile(x, y)
  expect(tile).toBeTruthy()
  await user.click(tile)
  await user.click(tile)
  await flushMicrotasks()
}

export async function clickTile(user, x, y) {
  const tile = getTerrainTile(x, y)
  expect(tile).toBeTruthy()
  await user.click(tile)
}

export function dispatchTileClick(x, y) {
  const tile = getTerrainTile(x, y)
  expect(tile).toBeTruthy()
  tile?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
}

export function confirmTileClickByDispatch(x, y) {
  dispatchTileClick(x, y)
  dispatchTileClick(x, y)
}

export function getMoveButton() {
  return screen.getByRole('button', { name: 'Move hero' })
}

export function getEndTurnButton() {
  return screen.getByRole('button', { name: 'End turn' })
}

export async function clickEndTurn(user) {
  const endTurnButton = getEndTurnButton()
  expect(endTurnButton).toBeTruthy()
  await user.click(endTurnButton)
}

export function querySystemOptions() {
  return screen.queryByRole('dialog', { name: 'System options' })
}

export async function openSystemOptions(user) {
  await user.click(screen.getByRole('button', { name: 'System options' }))
  const systemOptions = querySystemOptions()
  expect(systemOptions).toBeTruthy()
  return systemOptions
}

export async function clickResetSession(user) {
  const systemOptions = await openSystemOptions(user)
  await user.click(within(systemOptions).getByRole('button', { name: 'Reset' }))
}

export async function getMusicToggleButton(user) {
  const systemOptions = await openSystemOptions(user)
  return within(systemOptions).getByRole('button', { name: /^Music:/ })
}

export function panCamera(arrowKey, times) {
  for (let press = 0; press < times; press += 1) {
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: arrowKey }))
  }
}

const TILE_SIZE = 32

// How far the camera has scrolled the map, in pixels.
function getWorldOffset() {
  const [, offsetX, offsetY] = document
    .querySelector('.world')
    .style.transform.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/)
  return { x: Number(offsetX), y: Number(offsetY) }
}

// The tile at the centre of what the map view shows.
export function getMapViewCentreTile() {
  const viewport = document.querySelector('.viewport')
  const offset = getWorldOffset()
  return {
    x: Math.floor((-offset.x + viewport.clientWidth / 2) / TILE_SIZE),
    y: Math.floor((-offset.y + viewport.clientHeight / 2) / TILE_SIZE)
  }
}

// Moves the mouse over the middle of a map tile. As in a browser, the pointer lands on the layer
// drawn on top of the tiles, not on the tile itself.
export async function hoverTile(user, x, y) {
  await user.pointer(pointerOverTile(x, y))
}

// Where a pointer over the middle of a map tile lands, for user.pointer().
export function pointerOverTile(x, y) {
  const offset = getWorldOffset()
  return {
    target: document.querySelector('.effects-layer'),
    coords: {
      clientX: offset.x + x * TILE_SIZE + TILE_SIZE / 2,
      clientY: offset.y + y * TILE_SIZE + TILE_SIZE / 2
    }
  }
}

export function expectCalendarDate({ month, week, day }) {
  expect(screen.getByText(`Month: ${month}, Week: ${week}, Day: ${day}`)).toBeTruthy()
}

export async function endTurns(user, count) {
  for (let turn = 0; turn < count; turn += 1) {
    await clickEndTurn(user)
    const okButton = getInteractionModalOkButton()
    if (okButton) {
      await user.click(okButton)
    }
  }
}

export function getTreasureChestEntity(entityId = 'chest-1') {
  return document.querySelector(`.entity--treasure-chest[data-entity-id="${entityId}"]`)
}

export function getTreasureChestDialog() {
  return screen.getByRole('dialog', { name: 'Chest' })
}

// The rewards the chest dialog offers, as the player reads them, e.g. ['1500 gold', '1000 experience'].
export function readTreasureChestChoices() {
  return within(getTreasureChestDialog())
    .getAllByRole('button', { name: /gold$|experience$/ })
    .map((button) => button.getAttribute('aria-label'))
}

// Walks the hero up to the chest, picks 'gold' or 'experience' and confirms with OK.
export async function takeFromTreasureChest(user, { x, y }, choice) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
  const dialog = getTreasureChestDialog()
  await user.click(within(dialog).getByRole('button', { name: new RegExp(`${choice}$`) }))
  await user.click(within(dialog).getByRole('button', { name: 'OK' }))
  await flushMicrotasks()
}

// Holds the right mouse button down over a map tile, which opens the info popup.
export async function holdRightButtonOn(user, x, y) {
  await user.pointer({ keys: '[MouseRight>]', ...pointerOverTile(x, y) })
}

// Each skill is an icon named for screen readers, with its value under it.
export function readPrimarySkills(container) {
  const list = within(container).getByRole('list', { name: 'Primary skills' })
  return within(list)
    .getAllByRole('listitem')
    .map(
      (item) =>
        `${within(item).getByRole('img').getAttribute('aria-label')} ${item.textContent.trim()}`
    )
}

export function expectStatusBarText(text) {
  expect(screen.getByRole('status', { name: 'Status bar' }).textContent).toBe(text)
}

// The Heroes 3 cursor the mouse shows over an element, by its picture in assets/cursors:
// 'arrow', 'hero', 'move', 'attack' or 'visit', with '-2' to '-4' for the day the hero gets there.
export function getCursorOver(element) {
  const cursor = window.getComputedStyle(element).cursor
  return cursor.match(/cursors\/([\w-]+)\.png/)?.[1] ?? cursor
}

// The cursor over the map, where the pointer lands on the layer drawn on top of the tiles.
export function getMapCursor() {
  return getCursorOver(document.querySelector('.effects-layer'))
}

// Keeps the mouse still over the map at screen point (x, y) for longer than edge scrolling
// waits before it starts.
// Moves the mouse onto a tile in one step: the tile's position is read and the mouse moved before
// the map can scroll any further, so it lands on the tile even while the map is scrolling.
export function moveMouseOntoTile(x, y) {
  const { target, coords } = pointerOverTile(x, y)
  target.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, ...coords }))
}

export async function holdMouseOverMap(x, y) {
  const viewport = document.querySelector('.viewport')
  const effectsLayer = document.querySelector('.effects-layer')
  viewport.dispatchEvent(new window.MouseEvent('mouseenter'))
  effectsLayer.dispatchEvent(
    new window.MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y })
  )
  await waitMs(360)
}

export function queryBattleScreen() {
  return screen.queryByRole('dialog', { name: 'Battle' })
}

export function getBattleScreen() {
  const battleScreen = queryBattleScreen()
  expect(battleScreen).toBeTruthy()
  return battleScreen
}

export function getBattlefield() {
  return within(getBattleScreen()).getByRole('grid', { name: 'Battlefield' })
}

// Every creature stack on the battlefield as "<name> <count>" with its hex, rows and columns
// counted from 1 as Heroes 3 players would: row 1 at the top, column 1 on the attacker's side.
// Columns 0 and 16 are the edge columns past each side, where only back halves stand.
// A dead stack reads "Dead <name>" with no count; a living stack may stand on it. The back half
// of a double-wide creature reads "<name> (back half)".
export function readBattleStacks() {
  return within(getBattlefield())
    .getAllByRole('gridcell')
    .flatMap((hex) =>
      within(hex)
        .queryAllByRole('img')
        .map((creature) => ({ stack: describeBattleStack(creature), ...readHexPosition(hex) }))
    )
}

function describeBattleStack(creature) {
  return `${creature.getAttribute('aria-label')} ${creature.parentElement.textContent.trim()}`.trim()
}

function readHexPosition(hex) {
  return {
    row: Number(hex.closest('[role="row"]').getAttribute('aria-rowindex')),
    column: Number(hex.getAttribute('aria-colindex')) - 1
  }
}

export function getBattleHex(row, column) {
  const rowElement = within(getBattlefield())
    .getAllByRole('row')
    .find((element) => element.getAttribute('aria-rowindex') === String(row))
  return within(rowElement)
    .getAllByRole('gridcell')
    .find((hex) => hex.getAttribute('aria-colindex') === String(column + 1))
}

export function readActiveStack() {
  const active = within(getBattlefield()).getAllByRole('img', { current: true })
  expect(active).toHaveLength(1)
  const [creature] = active
  return {
    stack: describeBattleStack(creature),
    ...readHexPosition(creature.closest('[role="gridcell"]'))
  }
}

export function readReachableHexes() {
  return within(getBattlefield())
    .getAllByRole('gridcell')
    .filter((hex) => hex.getAttribute('aria-disabled') !== 'true')
    .map(readHexPosition)
}

export function isBattleHexReachable(row, column) {
  return getBattleHex(row, column).getAttribute('aria-disabled') !== 'true'
}

export async function clickBattleHex(user, row, column) {
  await user.click(getBattleHex(row, column))
  await flushMicrotasks()
}

export async function moveActiveStackTo(user, row, column) {
  await clickBattleHex(user, row, column)
  await waitMs()
  await flushMicrotasks()
}

export async function hoverBattleHex(user, row, column) {
  await user.hover(getBattleHex(row, column))
}

export function getBattleStatusBarText() {
  return within(getBattleScreen()).getByRole('status', { name: 'Battle status bar' }).textContent
}

// jsdom lays nothing out, so the hex gets a size to point within.
const HEX_SIZE = { width: 40, height: 46 }
const POINTER_OFFSET_BY_SIDE = {
  right: { x: 15, y: 0 },
  left: { x: -15, y: 0 },
  'top-right': { x: 8, y: -14 },
  'top-left': { x: -8, y: -14 },
  'bottom-right': { x: 8, y: 14 },
  'bottom-left': { x: -8, y: 14 }
}

function pointerOnHexSide(row, column, side) {
  const hex = getBattleHex(row, column)
  hex.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: HEX_SIZE.width,
    bottom: HEX_SIZE.height,
    x: 0,
    y: 0,
    ...HEX_SIZE
  })
  const offset = POINTER_OFFSET_BY_SIDE[side]
  return {
    target: hex,
    coords: {
      clientX: HEX_SIZE.width / 2 + offset.x,
      clientY: HEX_SIZE.height / 2 + offset.y
    }
  }
}

export async function pointAtBattleHexSide(user, row, column, side) {
  await user.pointer(pointerOnHexSide(row, column, side))
}

export async function attackBattleHexFrom(user, row, column, side) {
  const pointer = pointerOnHexSide(row, column, side)
  await user.pointer([pointer, { ...pointer, keys: '[MouseLeft]' }])
  await flushMicrotasks()
  await waitMs()
  await flushMicrotasks()
}

export async function tapBattleHexSide(user, row, column, side) {
  await user.pointer({ ...pointerOnHexSide(row, column, side), keys: '[TouchA]' })
  await flushMicrotasks()
  await waitMs()
  await flushMicrotasks()
}

export function readCombatMessages() {
  return within(within(getBattleScreen()).getByRole('log', { name: 'Combat messages' }))
    .queryAllByRole('paragraph')
    .map((line) => line.textContent)
}

// Records the hexes the stack moves through, in order, until the returned function is called.
export function recordStackHexes(stackName) {
  const battlefield = getBattlefield()
  const hexes = []
  const note = () => {
    const creature = within(battlefield).queryByRole('img', { name: stackName })
    if (!creature) {
      return
    }

    const position = readHexPosition(creature.closest('[role="gridcell"]'))
    const last = hexes.at(-1)
    if (last?.row !== position.row || last?.column !== position.column) {
      hexes.push(position)
    }
  }
  const observer = new window.MutationObserver(note)
  observer.observe(battlefield, { childList: true, subtree: true })
  return () => {
    observer.disconnect()
    return hexes
  }
}

export async function attackMonsterAt(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
  await waitMs()
  await flushMicrotasks()
}

// Auto Combat stands in for the whole battle until stacks can act: the hero wins.
export async function winBattle(user) {
  await user.click(within(getBattleScreen()).getByRole('button', { name: 'Auto combat' }))
  await flushMicrotasks()
}
