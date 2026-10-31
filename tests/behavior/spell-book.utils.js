// The spell book window in behavior tests: opening it, its pages and bookmarks, and its spells.

import { screen, within } from '@testing-library/dom'
import { expect } from 'vitest'

export function querySpellBook() {
  return screen.queryByRole('dialog', { name: 'Spell book' })
}

export function getSpellBook() {
  const spellBook = querySpellBook()
  expect(spellBook).toBeTruthy()
  return spellBook
}

export function getCastSpellButton() {
  return screen.getByRole('button', { name: 'Cast spell' })
}

export async function openSpellBookFromMap(user) {
  await user.click(getCastSpellButton())
}

function readText(element) {
  return element.textContent.replace(/\s+/g, ' ').trim()
}

function getSpellBookPage(page) {
  return within(getSpellBook()).getByRole('list', { name: `${page} page` })
}

function spellsOn(page) {
  return within(getSpellBookPage(page)).queryAllByRole('button')
}

// Each spell as "<name> <level> Spell Points: <cost>", left page first, e.g.
// "Magic Arrow 1st lev Spell Points: 5".
export function readSpellBookSpells() {
  return [...spellsOn('Left'), ...spellsOn('Right')].map((spell) =>
    [...spell.children]
      .filter((line) => line.getAttribute('aria-hidden') !== 'true')
      .map(readText)
      .join(' ')
  )
}

export function readSpellBookSpellNames() {
  return [...spellsOn('Left'), ...spellsOn('Right')].map((spell) =>
    spell.getAttribute('aria-label')
  )
}

export function readSpellBookPages() {
  return {
    left: spellsOn('Left').map((spell) => spell.getAttribute('aria-label')),
    right: spellsOn('Right').map((spell) => spell.getAttribute('aria-label'))
  }
}

// The heading the first spread of a school's bookmark shows in the place of two spells.
export function readSpellBookSchoolHeading() {
  return within(getSpellBook()).queryByRole('heading', { level: 3 })?.textContent ?? null
}

export function readUnaffordableSpells() {
  return [...spellsOn('Left'), ...spellsOn('Right')]
    .filter((spell) => spell.getAttribute('aria-description') === 'Not enough spell points')
    .map((spell) => spell.getAttribute('aria-label'))
}

function getSpell(name) {
  return within(getSpellBook()).getByRole('button', { name })
}

export async function clickSpell(user, name) {
  await user.click(getSpell(name))
}

export async function hoverSpell(user, name) {
  await user.hover(getSpell(name))
}

export async function holdRightButtonOnSpell(user, name) {
  await user.pointer({ keys: '[MouseRight>]', target: getSpell(name) })
}

// A bookmark or button by its name: Air, Earth, Fire, Water, All, Combat spells, Adventure spells,
// Previous page, Next page or Close.
function getSpellBookControl(name) {
  return within(getSpellBook()).getByRole('button', { name, exact: true })
}

export async function clickSpellBookControl(user, name) {
  await user.click(getSpellBookControl(name))
}

export async function hoverSpellBookControl(user, name) {
  await user.hover(getSpellBookControl(name))
}

export function querySpellBookControl(name) {
  return within(getSpellBook()).queryByRole('button', { name, exact: true })
}

export function readSelectedSpellBookTabs() {
  return within(getSpellBook())
    .getAllByRole('button', { pressed: true })
    .map((tab) => tab.getAttribute('aria-label'))
}

export function readSpellBookSpellPoints() {
  return within(getSpellBook()).getByRole('group', { name: 'Spell points' }).textContent.trim()
}

export function readSpellBookStatusBar() {
  return within(getSpellBook()).getByRole('status', { name: 'Spell book status bar' }).textContent
}

// What the book says on clicking a spell, as [title, text]; the title is empty for a plain message.
export function readSpellBookMessage() {
  const message = within(getSpellBook()).getByRole('alertdialog')
  return [
    within(message).queryByRole('heading')?.textContent ?? '',
    message.querySelector('p').textContent
  ]
}

export function readSpellPopup() {
  const popup = screen.getByRole('tooltip')
  return [within(popup).getByRole('heading').textContent, popup.querySelector('p').textContent]
}
