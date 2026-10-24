import { screen, within } from '@testing-library/dom'
import { expect } from 'vitest'

import { getHeroInHeroList, readArmySlots } from './adventure-panels.utils.js'
import { flushMicrotasks, shiftClick } from './app.utils.js'

export function queryHeroScreen() {
  return screen.queryByRole('dialog', { name: 'Hero screen' })
}

export function getHeroScreen() {
  const heroScreen = queryHeroScreen()
  expect(heroScreen).toBeTruthy()
  return heroScreen
}

export async function clickHeroInHeroList(user, heroName) {
  await user.click(getHeroInHeroList(heroName))
  await flushMicrotasks()
}

export async function closeHeroScreen(user) {
  await user.click(within(getHeroScreen()).getByRole('button', { name: 'Close hero screen' }))
  await flushMicrotasks()
}

// The hero's name and, under it, e.g. "Level 1 Knight".
export function readHeroScreenTitle() {
  const heroScreen = getHeroScreen()
  return [
    within(heroScreen).getByRole('heading', { level: 2 }).textContent,
    within(heroScreen).getByRole('heading', { level: 3 }).textContent
  ]
}

function readText(element) {
  return element.textContent.replace(/\s+/g, ' ').trim()
}

// Each "<skill> <value>", the skill's name written over its icon and the value under it.
export function readHeroScreenPrimarySkills() {
  const list = within(getHeroScreen()).getByRole('list', { name: 'Primary skills' })
  return within(list).getAllByRole('listitem').map(readText)
}

// A labelled box such as Experience, as "<label> <value>".
export function readHeroScreenBox(label) {
  return readText(within(getHeroScreen()).getByRole('group', { name: label }))
}

export function readHeroScreenArmy() {
  return readArmySlots(getHeroScreen())
}

export function readHeroScreenStatusBar() {
  return screen.getByRole('status', { name: 'Hero screen status bar' }).textContent
}

export async function hoverOnHeroScreen(user, text) {
  await user.hover(within(getHeroScreen()).getByText(text))
}

export async function unhoverOnHeroScreen(user, text) {
  await user.unhover(within(getHeroScreen()).getByText(text))
}

function getHeroScreenArmySlot(slot) {
  const army = within(getHeroScreen()).getByRole('list', { name: 'Army' })
  return within(army).getAllByRole('listitem')[slot - 1]
}

// Slots count from 1, as the player sees them from the left.
export async function clickHeroScreenArmySlot(user, slot) {
  await user.click(getHeroScreenArmySlot(slot))
  await flushMicrotasks()
}

export async function shiftClickHeroScreenArmySlot(user, slot) {
  await shiftClick(user, getHeroScreenArmySlot(slot))
}

export async function hoverHeroScreenArmySlot(user, slot) {
  await user.hover(getHeroScreenArmySlot(slot))
}

export async function unhoverHeroScreenArmySlot(user, slot) {
  await user.unhover(getHeroScreenArmySlot(slot))
}

// The framed slot, counting from 1, or null when no stack is framed.
export function readHeroScreenSelectedSlot() {
  const slots = within(getHeroScreen()).getByRole('list', { name: 'Army' }).children
  const index = [...slots].findIndex((slot) => slot.getAttribute('aria-current') === 'true')
  return index >= 0 ? index + 1 : null
}

export function getHeroScreenSplitButton() {
  return within(getHeroScreen()).getByRole('button', { name: 'Split' })
}

export async function clickHeroScreenSplitButton(user) {
  await user.click(getHeroScreenSplitButton())
  await flushMicrotasks()
}
