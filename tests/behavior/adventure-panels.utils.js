// The adventure screen around the map in behavior tests: the hero box and list, the resource bar
// and calendar, the buttons, the status bar and the dialogs the map opens.

import { screen, within } from '@testing-library/dom'
import { expect } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import { flushMicrotasks } from './app.utils.js'

export function getHeroList() {
  return screen.getByRole('list', { name: 'Heroes' })
}

export function getHeroInHeroList(heroName) {
  return within(getHeroList()).getByRole('button', { name: heroName })
}

export function readArmySlots(container, listName = 'Army') {
  const army = within(container).getByRole('list', { name: listName })
  return within(army)
    .getAllByRole('listitem')
    .map((slot) => {
      const creature = within(slot).queryByRole('img')
      return creature ? `${creature.getAttribute('aria-label')} ${slot.textContent.trim()}` : ''
    })
}

function getAdventurePanel() {
  return screen.getByRole('complementary', { name: 'UI' })
}

function getTownList() {
  return within(getAdventurePanel()).getByRole('list', { name: 'Towns' })
}

export function getTownInTownList(townName) {
  return within(getTownList()).getByRole('button', { name: townName })
}

export function readTownList() {
  return within(getTownList())
    .queryAllByRole('button')
    .map((town) => town.getAttribute('aria-label'))
}

export function getTownInfoBox() {
  return screen.getByRole('region', { name: 'Town info' })
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

export function getTreasureChestDialog() {
  return screen.getByRole('dialog', { name: 'Chest' })
}

// The rewards the chest dialog offers, as the player reads them, e.g. ['1500 gold', '1000 experience'].
export function readTreasureChestChoices() {
  return within(getTreasureChestDialog())
    .getAllByRole('button', { name: /gold$|experience$/ })
    .map((button) => button.getAttribute('aria-label'))
}

// Picks 'gold' or 'experience' in the open chest dialog and confirms with OK.
export async function takeFromTreasureChestDialog(user, choice) {
  const dialog = getTreasureChestDialog()
  await user.click(within(dialog).getByRole('button', { name: new RegExp(`${choice}$`) }))
  await user.click(within(dialog).getByRole('button', { name: 'OK' }))
  await flushMicrotasks()
}

// Walks the hero up to the chest, picks 'gold' or 'experience' and confirms with OK.
export async function takeFromTreasureChest(user, { x, y }, choice) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
  await takeFromTreasureChestDialog(user, choice)
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
