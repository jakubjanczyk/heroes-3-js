// The adventure map in behavior tests: tiles, the objects on them, the hero moving and the path
// preview, the camera and the cursor over the map.

import { screen } from '@testing-library/dom'
import { expect } from 'vitest'

import { flushMicrotasks, getCursorOver, waitMs } from './app.utils.js'

export function getTerrainTile(x, y) {
  return document.querySelector(`.terrain-tile[data-x="${x}"][data-y="${y}"]`)
}

export function getFogOver(x, y) {
  return document.querySelector(`.fog-tile[data-x="${x}"][data-y="${y}"]`)
}

export function isTileExplored(x, y) {
  expect(document.querySelector('.fog-layer')).toBeTruthy()
  return getFogOver(x, y) === null
}

export function getRoadOn(x, y) {
  return document.querySelector(`.road[data-x="${x}"][data-y="${y}"]`)
}

export function getHeroEntity(heroId = 'hero-1') {
  return document.querySelector(`.entity--hero[data-entity-id="${heroId}"]`)
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

export function getTownFlag(entityId = 'town-1') {
  return (
    getTownEntity(entityId)?.querySelector('[role="img"][aria-label="Red player flag"]') ?? null
  )
}

export function getMineEntity(entityId = 'mine-1') {
  return document.querySelector(`.entity--mine[data-entity-id="${entityId}"]`)
}

export function getDwellingEntity(entityId = 'dwelling-1') {
  return document.querySelector(`.entity--dwelling[data-entity-id="${entityId}"]`)
}

function getResourceGeneratorEntity(entityId = 'generator-1') {
  return document.querySelector(`.entity--resource-generator[data-entity-id="${entityId}"]`)
}

// The name written on a windmill, water wheel or garden while it has no picture.
export function readResourceGeneratorName(entityId = 'generator-1') {
  return getResourceGeneratorEntity(entityId)?.textContent ?? null
}

function getBonusObjectEntity(entityId = 'bonus-1') {
  return document.querySelector(`.entity--bonus-object[data-entity-id="${entityId}"]`)
}

// The name written on a Learning Stone, Mercenary Camp and the like while it has no picture.
export function readBonusObjectName(entityId = 'bonus-1') {
  return getBonusObjectEntity(entityId)?.textContent ?? null
}

// Each line of the right-click popup, e.g. ['Mercenary Camp', '+1 Attack', '(Not visited)'].
export function readInfoPopupLines() {
  const popup = screen.queryByRole('tooltip')
  expect(popup).not.toBeNull()
  return [...popup.querySelectorAll('p')].map((line) => line.textContent)
}

export function expectResourceGeneratorAt(x, y, entityId = 'generator-1') {
  const entity = getResourceGeneratorEntity(entityId)
  expect(entity?.dataset.tileX).toBe(String(x))
  expect(entity?.dataset.tileY).toBe(String(y))
}

export function expectDwellingAt(x, y, entityId = 'dwelling-1') {
  const dwellingEntity = getDwellingEntity(entityId)
  expect(dwellingEntity?.dataset.tileX).toBe(String(x))
  expect(dwellingEntity?.dataset.tileY).toBe(String(y))
}

export function expectHeroAt(x, y, heroId = 'hero-1') {
  const heroEntity = getHeroEntity(heroId)
  expect(heroEntity).toBeTruthy()
  expect(heroEntity?.dataset.tileX).toBe(String(x))
  expect(heroEntity?.dataset.tileY).toBe(String(y))
  return heroEntity
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

// The tiles the previewed route goes through, from the first step up to the target.
export function readPreviewPathTiles() {
  return [...document.querySelectorAll('.path-preview-svg [data-x]')].map((node) => ({
    x: Number(node.getAttribute('data-x')),
    y: Number(node.getAttribute('data-y'))
  }))
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

export function getTreasureChestEntity(entityId = 'chest-1') {
  return document.querySelector(`.entity--treasure-chest[data-entity-id="${entityId}"]`)
}

// Holds the right mouse button down over a map tile, which opens the info popup.
export async function holdRightButtonOn(user, x, y) {
  await user.pointer({ keys: '[MouseRight>]', ...pointerOverTile(x, y) })
}

// The cursor over the map, where the pointer lands on the layer drawn on top of the tiles.
export function getMapCursor() {
  return getCursorOver(document.querySelector('.effects-layer'))
}

// Moves the mouse onto a tile in one step: the tile's position is read and the mouse moved before
// the map can scroll any further, so it lands on the tile even while the map is scrolling.
export function moveMouseOntoTile(x, y) {
  const { target, coords } = pointerOverTile(x, y)
  target.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, ...coords }))
}

// Keeps the mouse still over the map at screen point (x, y) for longer than edge scrolling
// waits before it starts.
export async function holdMouseOverMap(x, y) {
  const viewport = document.querySelector('.viewport')
  const effectsLayer = document.querySelector('.effects-layer')
  viewport.dispatchEvent(new window.MouseEvent('mouseenter'))
  effectsLayer.dispatchEvent(
    new window.MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y })
  )
  await waitMs(360)
}

export async function attackMonsterAt(x, y) {
  confirmTileClickByDispatch(x, y)
  await waitMs()
}
