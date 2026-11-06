// Casting spells on the adventure map in behavior tests, and the windows they open.

import { screen, within } from '@testing-library/dom'

import { clickSpell, openSpellBookFromMap } from './spell-book.utils.js'

export async function castSpellFromMap(user, spellName) {
  await openSpellBookFromMap(user)
  await clickSpell(user, spellName)
}

function getTownPortalWindow() {
  return screen.getByRole('dialog', { name: 'Town Portal' })
}

export function readTownPortalWindowTowns() {
  return within(getTownPortalWindow())
    .getAllByRole('option')
    .map((town) => town.textContent)
}

export async function pickTownInTownPortalWindow(user, townName) {
  const window = getTownPortalWindow()
  await user.click(within(window).getByRole('option', { name: townName }))
  await user.click(within(window).getByRole('button', { name: 'OK' }))
}

export async function cancelTownPortalWindow(user) {
  await user.click(within(getTownPortalWindow()).getByRole('button', { name: 'Cancel' }))
}
