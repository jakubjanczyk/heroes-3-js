// The battle screen in behavior tests: the hexes and the stacks on them, moving and attacking,
// the combat bar, the results window and the retreat dialog.

import { screen, within } from '@testing-library/dom'
import { expect } from 'vitest'

import { attackMonsterAt } from './adventure-map.utils.js'
import { flushMicrotasks, setupMovementBehaviorApp, waitMs } from './app.utils.js'
import { loadAppStyles } from './app-styles.js'

// Every damage roll comes out at the bottom of its range.
export const LOWEST_ROLLS = () => 0

function battleAppConfig({ random, battleStepDelayMs, appConfig }) {
  return {
    random,
    fadeOutMsByKind: { MONSTER: 0 },
    ...(battleStepDelayMs === undefined ? {} : { battleStepDelayMs }),
    ...appConfig
  }
}

// Starts the app on `scenario` and attacks its monster, so the battle screen is open. Damage
// rolls are the lowest unless `random` says otherwise, and a beaten monster leaves the map at once.
export async function startBattle(
  scenario,
  { random = LOWEST_ROLLS, battleStepDelayMs, appConfig = {}, eventLog, envWindow, withStyles } = {}
) {
  const loadGameOptions = scenario.build()
  const app = await setupMovementBehaviorApp({
    loadGameOptions,
    eventLog,
    envWindow,
    appConfig: battleAppConfig({ random, battleStepDelayMs, appConfig })
  })
  if (withStyles) {
    await loadAppStyles()
  }

  const { tile } = loadGameOptions.entities.find(({ kind }) => kind === 'MONSTER')
  await attackMonsterAt(tile.x, tile.y)
  return app
}

// For tests that read the battle screen's layout or cursors, which need the app's styles.
export const startBattleWithStyles = (scenario, options) =>
  startBattle(scenario, { ...options, withStyles: true })

// Opens the app again on the same saved session, as a page reload does.
export async function reloadBattle(scenario, { random = LOWEST_ROLLS, eventLog } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    eventLog,
    appConfig: battleAppConfig({ random, appConfig: {} })
  })
  await flushMicrotasks()
  return app
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

// The hexes drawn lit up as under the mouse, with the bright outline of the app's stylesheet;
// needs `loadAppStyles()`.
const HIGHLIGHT_OUTLINE = "stroke='rgba(255,236,120,0.95)'"

export function readHighlightedBattleHexes() {
  return within(getBattlefield())
    .getAllByRole('gridcell')
    .filter((hex) => window.getComputedStyle(hex).backgroundImage.includes(HIGHLIGHT_OUTLINE))
    .map(readHexPosition)
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

export function getBattleButton(name) {
  return within(getBattleScreen()).getByRole('button', { name })
}

export async function clickBattleButton(user, name) {
  await user.click(getBattleButton(name))
  await flushMicrotasks()
  await waitMs()
  await flushMicrotasks()
}

export function queryBattleResults() {
  return screen.queryByRole('dialog', { name: 'Battle results' })
}

export function getBattleResults() {
  const results = queryBattleResults()
  expect(results).toBeTruthy()
  return results
}

export async function waitForBattleResults() {
  for (let attempt = 0; attempt < 200 && !queryBattleResults(); attempt += 1) {
    await flushMicrotasks()
    await waitMs()
  }
  await flushMicrotasks()
}

// A side of the results window as it reads, e.g. ['Sir Christian', 'Victorious'].
export function readBattleResultsSide(side) {
  const group = within(getBattleResults()).getByRole('group', { name: side })
  return [...group.children].map((line) => line.textContent.trim())
}

export function readBattleResultsMessage() {
  const message = within(getBattleResults()).getByRole('group', { name: 'Battle outcome' })
  return within(message)
    .getAllByRole('paragraph')
    .map((line) => line.textContent.trim())
}

// The creatures a side lost, e.g. ['Skeletons 2'], or ['None'].
export function readBattleCasualties(side) {
  const group = within(getBattleResults()).getByRole('group', { name: `${side} casualties` })
  const creatures = within(group).queryAllByRole('listitem')
  if (creatures.length === 0) {
    return [within(group).getByRole('paragraph').textContent.trim()]
  }

  return creatures.map(
    (slot) =>
      `${within(slot).getByRole('img').getAttribute('aria-label')} ${slot.lastElementChild.textContent.trim()}`
  )
}

export async function closeBattleResults(user) {
  await user.click(within(getBattleResults()).getByRole('button', { name: 'OK' }))
  await flushMicrotasks()
}

// Waits for the battle to be over and closes the results window, back to the adventure map.
export async function waitForBattleToEnd() {
  await waitForBattleResults()
  within(getBattleResults()).getByRole('button', { name: 'OK' }).click()
  await flushMicrotasks()
}

export function queryRetreatDialog() {
  return screen.queryByRole('dialog', { name: 'Retreat' })
}

export async function retreat(user, { confirm = true } = {}) {
  await clickBattleButton(user, 'Retreat')
  await user.click(
    within(queryRetreatDialog()).getByRole('button', { name: confirm ? 'OK' : 'Cancel' })
  )
  await flushMicrotasks()
}

// Auto combat plays the battle out; the hero wins with an army that beats the monster, such as
// `ARMY_THAT_WINS` against monsters of the game's data.
export async function winBattle(user) {
  await user.click(getBattleButton('Auto combat'))
  await waitForBattleToEnd()
}
