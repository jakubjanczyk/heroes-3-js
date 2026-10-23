import { fireEvent, screen, within } from '@testing-library/dom'
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

// The gold the town earns a day, as the panel shows it.
export function readTownIncome() {
  return within(getTownScreen()).getByLabelText('Daily income').textContent
}

// Seven slots, each "<creature> <count>" or '' when empty.
export function readGarrison() {
  return readArmySlots(getTownScreen(), 'Garrison')
}

// Seven slots, one per creature tier: "<creature plural> +<weekly growth>", or '' when the town
// has no dwelling of that tier.
export function readCreatureGrowth() {
  return readArmySlots(getTownScreen(), 'Creature growth')
}

export function readVisitingHeroArmy() {
  return readArmySlots(getTownScreen(), 'Visiting hero army')
}

export function getVisitingHero(heroName) {
  return within(getTownScreen()).getByRole('img', { name: heroName })
}

function getTownScreenTownList() {
  return within(getTownScreen()).getByRole('list', { name: 'Towns' })
}

export function readTownScreenTownList() {
  return within(getTownScreenTownList())
    .queryAllByRole('button')
    .map((town) => town.getAttribute('aria-label'))
}

export function getTownInTownScreenList(townName) {
  return within(getTownScreenTownList()).getByRole('button', { name: townName })
}

export async function leaveTown(user) {
  await user.click(within(getTownScreen()).getByRole('button', { name: 'Leave town' }))
  await flushMicrotasks()
}

export function queryHall() {
  return screen.queryByRole('dialog', { name: 'Hall' })
}

function getHall() {
  const hall = queryHall()
  expect(hall).toBeTruthy()
  return hall
}

export async function openHall(user) {
  await user.click(within(getTownScreen()).getByRole('button', { name: 'Hall' }))
  await flushMicrotasks()
  getHall()
}

export async function closeHall(user) {
  await user.click(within(getHall()).getByRole('button', { name: 'Close' }))
  await flushMicrotasks()
}

// The Hall's rows, each the names of the buildings its slots show.
export function readHall() {
  return within(getHall())
    .getAllByRole('list')
    .map((row) => within(row).getAllByRole('button').map(readAccessibleName))
}

function readAccessibleName(element) {
  return element.getAttribute('aria-label') ?? element.textContent.trim()
}

function getBuildingInHall(buildingName) {
  return within(getHall()).getByRole('button', { name: buildingName })
}

// What the Hall says about a building: built, can be built, or why it can't.
export function readHallStatus(buildingName) {
  const building = getBuildingInHall(buildingName)
  return document.getElementById(building.getAttribute('aria-describedby')).textContent
}

export async function openBuildingWindow(user, buildingName) {
  await user.click(getBuildingInHall(buildingName))
  await flushMicrotasks()
  return screen.getByRole('dialog', { name: buildingName })
}

// Each "<amount> <resource>", as the building window lists them.
export function readBuildingCost(buildingWindow) {
  return within(within(buildingWindow).getByRole('list', { name: 'Cost' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

export function readBuildingRequirements(buildingWindow) {
  return within(buildingWindow).queryByText(/^Requires/)?.textContent ?? null
}

export function getBuildButton(buildingWindow) {
  return within(buildingWindow).getByRole('button', { name: 'Build' })
}

// From the town screen: opens the Hall and builds the building there.
export async function buildInTown(user, buildingName) {
  await openHall(user)
  const buildingWindow = await openBuildingWindow(user, buildingName)
  await user.click(getBuildButton(buildingWindow))
  await flushMicrotasks()
}

function getCreatureGrowthPanel() {
  return within(getTownScreen()).getByRole('list', { name: 'Creature growth' })
}

// The creature panel's slot for a tier, 1 to 7, whether a creature shows in it or not.
export async function clickCreatureSlot(user, tier) {
  await user.click(within(getCreatureGrowthPanel()).getAllByRole('listitem')[tier - 1])
  await flushMicrotasks()
}

export async function openRecruitWindow(user, creaturePlural) {
  await user.click(
    within(getCreatureGrowthPanel()).getByRole('button', { name: `Recruit ${creaturePlural}` })
  )
  await flushMicrotasks()
  return getRecruitWindow()
}

// The recruit window, named "Recruit <plural>" after the creature chosen in it.
export function queryRecruitWindow(name = /^Recruit /) {
  return screen.queryByRole('dialog', { name })
}

function getRecruitWindow() {
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
  await flushMicrotasks()
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
  await flushMicrotasks()
}

export async function cancelRecruiting(user) {
  await clickInRecruitWindow(user, 'Cancel')
}

// From the town screen: recruits `count` of the creature, or as many as Max picks.
export async function recruitInTown(user, creaturePlural, { count, max = false }) {
  await openRecruitWindow(user, creaturePlural)
  if (max) {
    await clickRecruitMax(user)
  } else {
    dragRecruitSlider(count)
  }
  await recruit(user)
}

function getTownMessage() {
  return within(getTownScreen()).getByRole('alertdialog')
}

export function readTownMessage() {
  return within(getTownMessage()).getByRole('paragraph').textContent
}

export async function closeTownMessage(user) {
  await user.click(within(getTownMessage()).getByRole('button', { name: 'OK' }))
  await flushMicrotasks()
}

const FORT_NAMES = /^(Fort|Citadel|Castle)$/

// The town panel's Fort icon, named after the town's fort; null when the town has none.
export function queryFortIcon(fortName = FORT_NAMES) {
  return within(getTownScreen()).queryByRole('button', { name: fortName })
}

// The Fort window, titled after the town's fort (Fort, Citadel or Castle).
export function queryFortWindow(fortName = FORT_NAMES) {
  return screen.queryByRole('dialog', { name: fortName })
}

function getFortWindow() {
  const fortWindow = queryFortWindow()
  expect(fortWindow).toBeTruthy()
  return fortWindow
}

export async function openFortWindow(user, fortName) {
  await user.click(queryFortIcon(fortName))
  await flushMicrotasks()
  getFortWindow()
}

export async function closeFortWindow(user) {
  await user.click(within(getFortWindow()).getByRole('button', { name: 'Close' }))
  await flushMicrotasks()
}

function getFortCard(creaturePlural) {
  return within(getFortWindow()).getByRole('article', { name: creaturePlural })
}

// The creature named on each card, tier 1 to 7.
export function readFortCards() {
  return within(getFortWindow())
    .getAllByRole('article')
    .map((card) => card.getAttribute('aria-label'))
}

// A card's dwelling, "Available: N" and stats, each as shown: { Attack: '4', Damage: '1-3', ... }.
export function readFortCard(creaturePlural) {
  const card = within(getFortCard(creaturePlural))
  const [dwelling, available] = card.getAllByRole('paragraph').map((line) => line.textContent)
  const values = card.getAllByRole('definition')
  const stats = Object.fromEntries(
    card.getAllByRole('term').map((term, index) => [term.textContent, values[index].textContent])
  )
  return { dwelling, available, stats }
}

export async function clickFortCard(user, creaturePlural) {
  await user.click(getFortCard(creaturePlural))
  await flushMicrotasks()
}
