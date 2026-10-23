import { screen, within } from '@testing-library/dom'
import { expect } from 'vitest'

import { getHeroInHeroList, readArmySlots } from './adventure-panels.utils.js'
import { flushMicrotasks } from './app.utils.js'

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
