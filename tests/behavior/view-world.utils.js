// The View World screen and the Adventure Options window that opens it, in behavior tests.

import { screen, within } from '@testing-library/dom'
import { expect } from 'vitest'

export function queryViewWorld() {
  return screen.queryByRole('dialog', { name: 'View World' })
}

function getViewWorld() {
  const viewWorld = queryViewWorld()
  expect(viewWorld).toBeTruthy()
  return viewWorld
}

function getViewWorldMap() {
  return within(getViewWorld()).getByRole('group', { name: 'World map' })
}

export function getViewWorldTile(x, y) {
  return getViewWorldMap().querySelector(`[data-x="${x}"][data-y="${y}"]`)
}

// Each icon on the map with the tile it marks, e.g. 'Artifact at 20,3'.
export function readViewWorldIcons() {
  return within(getViewWorldMap())
    .queryAllByRole('img')
    .map((icon) => {
      const tile = icon.closest('[data-x]')
      return `${icon.getAttribute('aria-label')} at ${tile.dataset.x},${tile.dataset.y}`
    })
}

export function getViewWorldIcon(name, x, y) {
  return within(getViewWorldTile(x, y)).getByRole('img', { name })
}

export function readViewWorldLegend() {
  return within(getViewWorld())
    .getAllByRole('listitem')
    .map((item) => item.textContent.trim())
}

export async function clickViewWorldButton(user, name) {
  await user.click(within(getViewWorld()).getByRole('button', { name }))
}

export function readPressedViewWorldZoom() {
  return within(getViewWorld())
    .getAllByRole('button', { pressed: true })
    .map((button) => button.getAttribute('aria-label'))
}

// jsdom does no layout: the map's size and position are read from the styles that set them.
function pixelStyle(property) {
  return Number.parseFloat(getViewWorldMap().style.getPropertyValue(property))
}

export function readViewWorldTileSize() {
  return pixelStyle('--view-world-tile-size')
}

// The tile at the top-left corner of the part of the map the screen shows.
export function readViewWorldTopLeftTile() {
  const tileSize = readViewWorldTileSize()
  return {
    x: -pixelStyle('--view-world-offset-x') / tileSize,
    y: -pixelStyle('--view-world-offset-y') / tileSize
  }
}

function getViewWorldViewport() {
  return getViewWorld().querySelector('.view-world__viewport')
}

// The screen's map area has no size in jsdom; this gives it one before the screen opens.
export function setViewWorldViewportSize(width, height) {
  const viewport = document.querySelector('.view-world__viewport')
  Object.defineProperty(viewport, 'clientWidth', { value: width, configurable: true })
  Object.defineProperty(viewport, 'clientHeight', { value: height, configurable: true })
}

function dispatchPointer(type, clientX, clientY, buttons) {
  getViewWorldViewport().dispatchEvent(
    new window.PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      buttons,
      pointerId: 1,
      isPrimary: true,
      pointerType: 'mouse',
      clientX,
      clientY
    })
  )
}

export function dragViewWorld(from, to) {
  dispatchPointer('pointerdown', from.x, from.y, 1)
  dispatchPointer('pointermove', to.x, to.y, 1)
  dispatchPointer('pointerup', to.x, to.y, 0)
}

export function queryAdventureOptions() {
  return screen.queryByRole('dialog', { name: 'Adventure Options' })
}

export async function openAdventureOptions(user) {
  await user.click(screen.getByRole('button', { name: 'Adventure options' }))
  const adventureOptions = queryAdventureOptions()
  expect(adventureOptions).toBeTruthy()
  return adventureOptions
}

export function readAdventureOptions() {
  return within(queryAdventureOptions())
    .getAllByRole('button')
    .map((button) => `${button.getAttribute('aria-label')}${button.disabled ? ' (disabled)' : ''}`)
}

export async function clickAdventureOption(user, name) {
  await user.click(within(queryAdventureOptions()).getByRole('button', { name }))
}
