import { screen, within } from '@testing-library/dom'
import { expect } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import { readArmySlots } from './adventure-panels.utils.js'
import { flushMicrotasks } from './app.utils.js'

export function queryTownScreen() {
  return screen.queryByRole('dialog', { name: 'Town' })
}

export function getTownScreen() {
  const townScreen = queryTownScreen()
  expect(townScreen).toBeTruthy()
  return townScreen
}

export async function enterTownAt(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
  getTownScreen()
}

export function readTownName() {
  return within(getTownScreen()).getByRole('heading').textContent
}

// Seven slots, each "<creature> <count>" or '' when empty.
export function readGarrison() {
  return readArmySlots(getTownScreen(), 'Garrison')
}

export function readVisitingHeroArmy() {
  return readArmySlots(getTownScreen(), 'Visiting hero army')
}

export function getVisitingHero(heroName) {
  return within(getTownScreen()).getByRole('img', { name: heroName })
}

export async function leaveTown(user) {
  await user.click(within(getTownScreen()).getByRole('button', { name: 'Leave town' }))
  await flushMicrotasks()
}
