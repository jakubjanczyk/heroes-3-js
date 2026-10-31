// The adventure screen around the map in behavior tests: the hero box and list, the resource bar
// and calendar, the buttons, the status bar and the dialogs the map opens.

import { screen, within } from '@testing-library/dom'
import { expect } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import { flushMicrotasks, shiftClick } from './app.utils.js'

export function getHeroList() {
  return screen.getByRole('list', { name: 'Heroes' })
}

export function getHeroInHeroList(heroName) {
  return within(getHeroList()).getByRole('button', { name: heroName })
}

// Each hero in the list as "<name> <movement points left>".
export function readHeroList() {
  return within(getHeroList())
    .getAllByRole('listitem')
    .map((item) => {
      const name = within(item).getByRole('button').getAttribute('aria-label')
      const movementPoints = within(item)
        .getByRole('progressbar', { name: 'Movement points' })
        .getAttribute('aria-valuenow')
      return `${name} ${movementPoints}`
    })
}

export function readSelectedHeroInHeroList() {
  return within(getHeroList())
    .getAllByRole('button')
    .filter((portrait) => portrait.getAttribute('aria-current') === 'true')
    .map((portrait) => portrait.getAttribute('aria-label'))
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

// The town box's Hall and Fort icons, by the building each shows, and the gold the town earns a day.
export function readTownBox(container) {
  const buildings = within(container).getByRole('group', { name: 'Buildings' })
  return {
    buildings: within(buildings)
      .getAllByRole('img')
      .map((icon) => icon.getAttribute('aria-label')),
    income: within(container).getByLabelText('Daily income').textContent
  }
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

export function readMessage() {
  return getInteractionModalMessage()?.textContent ?? null
}

// The lines under the open message's text, such as the question it asks.
export function readMessageDetails() {
  return [...(getInteractionModal()?.querySelectorAll('.interaction-modal__detail') ?? [])].map(
    (line) => line.textContent
  )
}

// What the open message gives, as the player reads it under its pictures, e.g. ['3 Ore'] or
// ['+1 Attack'] or ['Basic Archery'].
export function readMessageRewards() {
  return within(getInteractionModal())
    .queryAllByRole('img', { name: /^([+-]?\d+|Basic) / })
    .map((picture) => picture.getAttribute('aria-label'))
}

// The pictures the open message shows under its text, by the names under them, e.g. ['Spell Book'].
export function readMessagePictures() {
  return within(getInteractionModal())
    .queryAllByRole('img')
    .map((picture) => picture.getAttribute('aria-label'))
}

// The bonuses the open message lets the player pick from, e.g. ['+2 Attack', '+2 Defense'].
export function readMessageChoices() {
  return within(getInteractionModal())
    .queryAllByRole('button', { name: /^\+\d+ / })
    .map((button) => button.getAttribute('aria-label'))
}

export function readMessageButtons() {
  return within(getInteractionModal())
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label'))
}

export async function pickInMessage(user, choice) {
  const modal = getInteractionModal()
  await user.click(within(modal).getByRole('button', { name: choice }))
  await user.click(within(modal).getByRole('button', { name: 'OK' }))
}

export async function answerMessage(user, answer) {
  await user.click(within(getInteractionModal()).getByRole('button', { name: answer }))
}

export async function cancelMessage(user) {
  await user.click(within(getInteractionModal()).getByRole('button', { name: 'Cancel' }))
}

export function expectInteractionModalClosed() {
  expect(getInteractionModal()).toBeFalsy()
}

// A hero the scenario leaves unnamed is called 'Hero'.
export function queryLevelUpPopup(heroName = 'Hero') {
  return screen.queryByRole('dialog', { name: `${heroName} has gained a level.` })
}

function levelUpSkillButtons(heroName) {
  const popup = queryLevelUpPopup(heroName)
  expect(popup).toBeTruthy()
  return within(popup)
    .queryAllByRole('button')
    .filter((button) => button.getAttribute('aria-label') !== 'OK')
}

export function readLevelUpSkillOffers(heroName) {
  return levelUpSkillButtons(heroName).map((button) => button.getAttribute('aria-label'))
}

export function readPickedLevelUpSkills(heroName) {
  return levelUpSkillButtons(heroName)
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.getAttribute('aria-label'))
}

export async function closeLevelUpPopup(user, heroName = 'Hero') {
  const [firstOffer] = readLevelUpSkillOffers(heroName)
  if (firstOffer && readPickedLevelUpSkills(heroName).length === 0) {
    await pickLevelUpSkill(user, heroName, firstOffer)
  }
  await closeInteractionModal(user)
}

export async function pickLevelUpSkill(user, heroName, levelAndSkill) {
  const popup = queryLevelUpPopup(heroName)
  await user.click(within(popup).getByRole('button', { name: levelAndSkill }))
}

export function queryQuestion(title) {
  return screen.queryByRole('dialog', { name: title })
}

export async function answerQuestion(user, title, answer) {
  const question = queryQuestion(title)
  expect(question).toBeTruthy()
  await user.click(within(question).getByRole('button', { name: answer }))
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

export async function takeFromTreasureChestDialog(user, choice) {
  const dialog = getTreasureChestDialog()
  await user.click(within(dialog).getByRole('button', { name: new RegExp(`${choice}$`) }))
  await user.click(within(dialog).getByRole('button', { name: 'OK' }))
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

export function queryFoundResourcesBox() {
  return screen.queryByRole('region', { name: 'Resources found' })
}

// Each resource the info box shows as found, e.g. 'Gold 100'.
export function readFoundResources() {
  const box = screen.getByRole('region', { name: 'Resources found' })
  return within(box)
    .getAllByRole('listitem')
    .map((item) => {
      const picture = within(item).getByRole('img')
      return `${picture.getAttribute('aria-label')} ${item.textContent.trim()}`
    })
}

export function queryCapturedMineBox() {
  return screen.queryByRole('region', { name: 'Mine captured' })
}

// The captured mine's name and its daily income, e.g. { name: 'Gold Mine', income: 'Gold 1000 per day' }.
export function readCapturedMine() {
  const box = screen.getByRole('region', { name: 'Mine captured' })
  const income = within(box).getByRole('listitem')
  const picture = within(income).getByRole('img')
  return {
    name: within(box).getByRole('heading').textContent,
    income: `${picture.getAttribute('aria-label')} ${income.textContent.trim()}`
  }
}

export function getDateBox() {
  return screen.getByRole('region', { name: 'Date' })
}

export function queryDateBox() {
  return screen.queryByRole('region', { name: 'Date' })
}

// The date the info box shows and the name of its picture, e.g. { text: 'Day 2', picture: 'Sunrise' }.
export function readDateBox() {
  const box = getDateBox()
  return {
    text: within(box).getByRole('heading').textContent,
    picture: within(box).getByRole('img').getAttribute('aria-label')
  }
}

export function getKingdomOverview() {
  return screen.getByRole('region', { name: 'Kingdom overview' })
}

export function queryKingdomOverview() {
  return screen.queryByRole('region', { name: 'Kingdom overview' })
}

// The number of the player's towns under each hall, e.g. { 'Village Hall': 1, 'Town Hall': 0, ... }.
export function readKingdomOverviewHalls() {
  const halls = within(getKingdomOverview()).getByRole('list', { name: 'Towns by hall' })
  return Object.fromEntries(
    within(halls)
      .getAllByRole('listitem')
      .map((item) => [
        within(item).getByRole('img').getAttribute('aria-label'),
        Number(item.textContent.trim())
      ])
  )
}

// The flags in the overview's Allies and Enemies rows, by the player each stands for.
export function readKingdomOverviewFlags() {
  const overview = getKingdomOverview()
  const flagsIn = (name) =>
    within(within(overview).getByRole('list', { name }))
      .queryAllByRole('img')
      .map((flag) => flag.getAttribute('aria-label'))
  return { allies: flagsIn('Allies'), enemies: flagsIn('Enemies') }
}

export function queryInfoBoxHelpPopup() {
  return screen.queryByRole('tooltip', { name: 'Status Window' })
}

// The popup's highlighted title and the text under it.
export function readInfoBoxHelpPopup() {
  const popup = screen.getByRole('tooltip', { name: 'Status Window' })
  return {
    title: within(popup).getByRole('heading').textContent,
    text: popup.querySelector('p').textContent
  }
}

// The point the popup is centred on, in screen pixels.
export function readInfoBoxHelpPopupPosition() {
  const popup = screen.getByRole('tooltip', { name: 'Status Window' })
  const { width, height } = popup.getBoundingClientRect()
  return {
    left: Number.parseFloat(popup.style.left) + width / 2,
    top: Number.parseFloat(popup.style.top) + height / 2
  }
}

function getInfoBoxArmySlots() {
  const infoBox = screen.getByRole('region', { name: /^(Hero|Town) info$/ })
  const army = within(infoBox).getByRole('list', { name: /^(Army|Garrison)$/ })
  return [...army.children]
}

// Slots count from 1, as the player sees them from the left.
export async function clickInfoBoxArmySlot(user, slot) {
  await user.click(getInfoBoxArmySlots()[slot - 1])
}

export async function shiftClickInfoBoxArmySlot(user, slot) {
  await shiftClick(user, getInfoBoxArmySlots()[slot - 1])
}

export async function hoverInfoBoxArmySlot(user, slot) {
  await user.hover(getInfoBoxArmySlots()[slot - 1])
}

export function readInfoBoxSelectedSlot() {
  const index = getInfoBoxArmySlots().findIndex(
    (slot) => slot.getAttribute('aria-current') === 'true'
  )
  return index >= 0 ? index + 1 : null
}

// Morale and luck as "<name> <value>", e.g. ['Morale +1', 'Luck 0'].
export function readMoraleAndLuck(container) {
  return ['Morale', 'Luck'].map((name) => {
    const box = within(container).getByRole('group', { name })
    return `${name} ${box.textContent.trim()}`
  })
}

// The hero's spell points as the box shows them, e.g. '20'.
export function readSpellPoints(container) {
  return within(container).getByRole('group', { name: 'Spell points' }).textContent.trim()
}

// The spell points bar beside the hero's portrait: how far it is filled, out of its full length.
export function readHeroListSpellPoints() {
  const bar = within(getHeroList()).getByRole('progressbar', { name: 'Spell points' })
  return { value: bar.getAttribute('aria-valuenow'), max: bar.getAttribute('aria-valuemax') }
}
