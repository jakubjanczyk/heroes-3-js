import { screen, within } from '@testing-library/dom'
import { expect } from 'vitest'

import { getHeroInHeroList, readArmySlots } from './adventure-panels.utils.js'
import { shiftClick } from './app.utils.js'

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
}

export async function closeHeroScreen(user) {
  await user.click(within(getHeroScreen()).getByRole('button', { name: 'Close hero screen' }))
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
}

// Each slot as "<level> <skill>", the level written over the skill's name; '' when empty.
export function readHeroScreenSecondarySkills() {
  const list = within(getHeroScreen()).getByRole('list', { name: 'Secondary skills' })
  return within(list).getAllByRole('listitem').map(readText)
}

function getHeroScreenSkill(levelAndSkill) {
  const list = within(getHeroScreen()).getByRole('list', { name: 'Secondary skills' })
  return within(list)
    .getAllByRole('listitem')
    .find((item) => readText(item) === levelAndSkill)
}

export async function hoverOnHeroScreenSkill(user, levelAndSkill) {
  await user.hover(getHeroScreenSkill(levelAndSkill))
}

export async function holdRightButtonOnHeroScreenSkill(user, levelAndSkill) {
  await user.pointer({ keys: '[MouseRight>]', target: getHeroScreenSkill(levelAndSkill) })
}

function getHeroScreenBox(label) {
  return within(getHeroScreen()).getByRole('group', { name: label })
}

export async function hoverOnHeroScreenBox(user, label) {
  await user.hover(getHeroScreenBox(label))
}

export async function holdRightButtonOnHeroScreenBox(user, label) {
  await user.pointer({ keys: '[MouseRight>]', target: getHeroScreenBox(label) })
}

function readArtifactsIn(listName) {
  const list = within(getHeroScreen()).getByRole('list', { name: listName })
  return within(list)
    .getAllByRole('listitem')
    .map((frame) => [frame, frame.querySelector('[role="img"]')?.getAttribute('aria-label')])
    .filter(([, artifact]) => artifact)
}

// What the hero wears, as { '<slot>': '<artifact>' }, e.g. { Weapon: "Centaur's Axe" }.
export function readHeroScreenArtifacts() {
  return Object.fromEntries(
    readArtifactsIn('Artifacts').map(([frame, artifact]) => [
      frame.getAttribute('aria-label'),
      artifact
    ])
  )
}

// The artifacts in the backpack's frames, left to right.
export function readHeroScreenBackpack() {
  return readArtifactsIn('Backpack').map(([, artifact]) => artifact)
}

function getHeroScreenArtifactSlot(slot) {
  const list = within(getHeroScreen()).getByRole('list', { name: 'Artifacts' })
  return within(list).getByRole('listitem', { name: slot })
}

function getHeroScreenBackpackFrame(frame) {
  const list = within(getHeroScreen()).getByRole('list', { name: 'Backpack' })
  return within(list).getAllByRole('listitem')[frame - 1]
}

// A slot by its name, e.g. 'Weapon' or 'Left ring'.
export async function clickHeroScreenArtifactSlot(user, slot) {
  await user.click(getHeroScreenArtifactSlot(slot))
}

// Frames count from 1, as the player sees them from the left.
export async function clickHeroScreenBackpackFrame(user, frame) {
  await user.click(getHeroScreenBackpackFrame(frame))
}

export async function clickHeroScreenBackpackArrow(user, direction) {
  await user.click(
    within(getHeroScreen()).getByRole('button', { name: `Scroll backpack ${direction}` })
  )
}

export async function hoverHeroScreenArtifactSlot(user, slot) {
  await user.hover(getHeroScreenArtifactSlot(slot))
}

export async function holdRightButtonOnHeroScreenArtifactSlot(user, slot) {
  await user.pointer({ keys: '[MouseRight>]', target: getHeroScreenArtifactSlot(slot) })
}

export async function holdRightButtonOnHeroScreenBackpackFrame(user, frame) {
  await user.pointer({ keys: '[MouseRight>]', target: getHeroScreenBackpackFrame(frame) })
}

// The artifact on the pointer, or null when nothing is held.
export function readHeroScreenHeldArtifact() {
  return (
    within(getHeroScreen())
      .queryByRole('img', { name: /^Held: / })
      ?.getAttribute('aria-label')
      .replace(/^Held: /, '') ?? null
  )
}

// The worn slots lit up as places the held artifact can go, e.g. ['Right ring', 'Left ring'].
export function readHeroScreenHighlightedSlots() {
  const list = within(getHeroScreen()).getByRole('list', { name: 'Artifacts' })
  return within(list)
    .getAllByRole('listitem')
    .filter((slot) => slot.dataset.highlighted === 'true')
    .map((slot) => slot.getAttribute('aria-label'))
}
