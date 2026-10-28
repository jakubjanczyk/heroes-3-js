import { screen, within } from '@testing-library/dom'
import { expect } from 'vitest'

import { confirmMove } from './adventure-map.utils.js'
import { readArmySlots, readMoraleAndLuck } from './adventure-panels.utils.js'
import { shiftClick } from './app.utils.js'

export function queryHeroExchange() {
  return screen.queryByRole('dialog', { name: 'Hero exchange' })
}

export function getHeroExchange() {
  const exchange = queryHeroExchange()
  expect(exchange).toBeTruthy()
  return exchange
}

// The selected hero walks to the other hero standing on (x, y).
export async function meetHeroAt(user, x, y) {
  await confirmMove(user, x, y)
}

function getHeroSide(heroName) {
  return within(getHeroExchange()).getByRole('region', { name: heroName })
}

// The banner over each hero, e.g. "Sir Christian, Level 1 Knight", left hero first.
export function readHeroExchangeTitles() {
  return within(getHeroExchange())
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent)
}

export function readHeroExchangePortraits() {
  return within(getHeroExchange())
    .getAllByRole('img', { name: /portrait$/ })
    .map((portrait) => portrait.getAttribute('aria-label'))
}

// Each row as "<left hero's value> <skill> <right hero's value>".
export function readHeroExchangePrimarySkills() {
  const list = within(getHeroExchange()).getByRole('list', { name: 'Primary skills' })
  return within(list)
    .getAllByRole('listitem')
    .map((row) => row.textContent.replace(/\s+/g, ' ').trim())
}

// The small skill icons under a hero's primary skills, each named "<level> <skill>"; '' when empty.
export function readHeroExchangeSecondarySkills(heroName) {
  const list = within(getHeroSide(heroName)).getByRole('list', {
    name: `${heroName}'s secondary skills`
  })
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.querySelector('[role="img"]')?.getAttribute('aria-label') ?? '')
}

export function readHeroExchangeArmy(heroName) {
  return readArmySlots(getHeroSide(heroName), `${heroName}'s army`)
}

function getArmySlot(heroName, slot) {
  const army = within(getHeroSide(heroName)).getByRole('list', { name: `${heroName}'s army` })
  return within(army).getAllByRole('listitem')[slot - 1]
}

// Slots count from 1, as the player sees them from the left.
export async function clickHeroExchangeSlot(user, heroName, slot) {
  await user.click(getArmySlot(heroName, slot))
}

export async function shiftClickHeroExchangeSlot(user, heroName, slot) {
  await shiftClick(user, getArmySlot(heroName, slot))
}

export async function hoverHeroExchangeSlot(user, heroName, slot) {
  await user.hover(getArmySlot(heroName, slot))
}

// The arrow under a slot of `heroName`'s army, which sends that stack to `otherHeroName`.
export async function clickSlotArrow(user, heroName, slot, otherHeroName) {
  await user.click(
    within(getHeroSide(heroName)).getByRole('button', {
      name: `Move slot ${slot} to ${otherHeroName}`
    })
  )
}

export async function clickHeroExchangeButton(user, name) {
  await user.click(within(getHeroExchange()).getByRole('button', { name }))
}

export async function closeHeroExchange(user) {
  await clickHeroExchangeButton(user, 'Close hero exchange')
}

export function readHeroExchangeStatusBar() {
  return screen.getByRole('status', { name: 'Hero exchange status bar' }).textContent
}

export function readHeroExchangeMoraleAndLuck(heroName) {
  return readMoraleAndLuck(getHeroSide(heroName))
}
