import { fireEvent, screen, within } from '@testing-library/dom'
import { expect } from 'vitest'

// The recruit window, named "Recruit <plural>" after the creature chosen in it.
export function queryRecruitWindow(name = /^Recruit /) {
  return screen.queryByRole('dialog', { name })
}

export function getRecruitWindow() {
  const recruitWindow = queryRecruitWindow()
  expect(recruitWindow).toBeTruthy()
  return recruitWindow
}

// Each "<amount> <resource>".
function readCost(listName) {
  return within(within(getRecruitWindow()).getByRole('list', { name: listName }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

export function readCostPerTroop() {
  return readCost('Cost per troop')
}

export function readTotalCost() {
  return readCost('Total cost')
}

export function readAvailable() {
  return Number(within(getRecruitWindow()).getByLabelText('Available').textContent)
}

function getRecruitSlider() {
  return within(getRecruitWindow()).getByRole('slider', { name: 'Number to recruit' })
}

export function readRecruitCount() {
  return Number(getRecruitSlider().value)
}

export function dragRecruitSlider(count) {
  fireEvent.input(getRecruitSlider(), { target: { value: String(count) } })
}

function getRecruitCreatureChoices() {
  return within(within(getRecruitWindow()).getByRole('group', { name: 'Creatures' })).getAllByRole(
    'button'
  )
}

export function readRecruitCreatures() {
  return getRecruitCreatureChoices().map((choice) => choice.getAttribute('aria-label'))
}

export function readChosenRecruitCreature() {
  return getRecruitCreatureChoices()
    .find((choice) => choice.getAttribute('aria-pressed') === 'true')
    ?.getAttribute('aria-label')
}

async function clickInRecruitWindow(user, buttonName) {
  await user.click(within(getRecruitWindow()).getByRole('button', { name: buttonName }))
}

export async function chooseRecruitCreature(user, creaturePlural) {
  await clickInRecruitWindow(user, creaturePlural)
}

export async function clickRecruitMore(user) {
  await clickInRecruitWindow(user, 'More')
}

export async function clickRecruitFewer(user) {
  await clickInRecruitWindow(user, 'Fewer')
}

export async function clickRecruitMax(user) {
  await clickInRecruitWindow(user, 'Max')
}

export function getRecruitButton() {
  return within(getRecruitWindow()).getByRole('button', { name: 'Recruit' })
}

export async function recruit(user) {
  await user.click(getRecruitButton())
}

export async function cancelRecruiting(user) {
  await clickInRecruitWindow(user, 'Cancel')
}
