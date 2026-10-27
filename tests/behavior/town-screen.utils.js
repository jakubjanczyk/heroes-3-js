import { screen, within } from '@testing-library/dom'
import { expect } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import { readArmySlots } from './adventure-panels.utils.js'
import { flushMicrotasks, shiftClick } from './app.utils.js'
import {
  clickRecruitMax,
  dragRecruitSlider,
  getRecruitWindow,
  recruit
} from './recruit-window.utils.js'

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
  return within(getTownScreen()).getByRole('button', { name: heroName })
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
  getHall()
}

export async function closeHall(user) {
  await user.click(within(getHall()).getByRole('button', { name: 'Close' }))
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
}

function getCreatureGrowthPanel() {
  return within(getTownScreen()).getByRole('list', { name: 'Creature growth' })
}

// The creature panel's slot for a tier, 1 to 7, whether a creature shows in it or not.
export async function clickCreatureSlot(user, tier) {
  await user.click(within(getCreatureGrowthPanel()).getAllByRole('listitem')[tier - 1])
}

export async function openRecruitWindow(user, creaturePlural) {
  await user.click(
    within(getCreatureGrowthPanel()).getByRole('button', { name: `Recruit ${creaturePlural}` })
  )
  return getRecruitWindow()
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
}

const FORT_NAMES = /^(Fort|Citadel|Castle)$/

// The town panel's Fort icon, named after the town's fort; null when the town has none. The fort
// on the town picture has the same name.
export function queryFortIcon(fortName = FORT_NAMES) {
  return (
    within(getTownScreen())
      .queryAllByRole('button', { name: fortName })
      .find((button) => !getTownPicture().contains(button)) ?? null
  )
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
  getFortWindow()
}

export async function closeFortWindow(user) {
  await user.click(within(getFortWindow()).getByRole('button', { name: 'Close' }))
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
}

function getTownPicture() {
  return within(getTownScreen()).getByRole('group', { name: 'Town picture' })
}

// The names of the buildings drawn on the town picture, in alphabetical order.
export function readTownPicture() {
  return within(getTownPicture())
    .queryAllByRole('button')
    .map((building) => building.getAttribute('aria-label'))
    .sort()
}

function getBuildingOnPicture(buildingName) {
  return within(getTownPicture()).getByRole('button', { name: buildingName })
}

export async function hoverBuildingOnPicture(user, buildingName) {
  await user.hover(getBuildingOnPicture(buildingName))
}

export async function unhoverBuildingOnPicture(user, buildingName) {
  await user.unhover(getBuildingOnPicture(buildingName))
}

export async function clickBuildingOnPicture(user, buildingName) {
  await user.click(getBuildingOnPicture(buildingName))
}

export function readTownStatusBar() {
  return within(getTownScreen()).getByRole('status', { name: 'Town status bar' }).textContent
}

function getArmySlotInTown(listName, slot) {
  const army = within(getTownScreen()).getByRole('list', { name: listName })
  return within(army).getAllByRole('listitem')[slot - 1]
}

// Slots count from 1, as the player sees them from the left.
export async function clickGarrisonSlot(user, slot) {
  await user.click(getArmySlotInTown('Garrison', slot))
}

export async function clickVisitingHeroSlot(user, slot) {
  await user.click(getArmySlotInTown('Visiting hero army', slot))
}

// The framed stack, as "<row> <slot>" ("Garrison 2"), or null when none is.
export function readSelectedStack() {
  const selected = ['Garrison', 'Visiting hero army'].flatMap((listName) => {
    const slots = within(getTownScreen()).getByRole('list', { name: listName }).children
    const index = [...slots].findIndex((slot) => slot.getAttribute('aria-current') === 'true')
    return index >= 0 ? [`${listName} ${index + 1}`] : []
  })
  return selected[0] ?? null
}

export async function hoverGarrisonSlot(user, slot) {
  await user.hover(getArmySlotInTown('Garrison', slot))
}

export async function hoverVisitingHeroSlot(user, slot) {
  await user.hover(getArmySlotInTown('Visiting hero army', slot))
}

export async function unhoverGarrisonSlot(user, slot) {
  await user.unhover(getArmySlotInTown('Garrison', slot))
}

export function getHallIcon() {
  return within(getTownScreen()).getByRole('button', { name: 'Hall' })
}

export function getLeaveTownButton() {
  return within(getTownScreen()).getByRole('button', { name: 'Leave town' })
}

// The creature panel's slot for a tier, 1 to 7.
export function getCreatureSlot(tier) {
  return within(getCreatureGrowthPanel()).getAllByRole('listitem')[tier - 1]
}

// The frame left of the visiting hero's army, with the hero's portrait or empty without a hero.
export function getVisitingHeroFrame() {
  return within(getTownScreen()).getByRole('list', { name: 'Visiting hero army' })
    .previousElementSibling
}

export async function shiftClickGarrisonSlot(user, slot) {
  await shiftClick(user, getArmySlotInTown('Garrison', slot))
}

export async function shiftClickVisitingHeroSlot(user, slot) {
  await shiftClick(user, getArmySlotInTown('Visiting hero army', slot))
}

export function getSplitButton() {
  return within(getTownScreen()).getByRole('button', { name: 'Split' })
}

export async function clickSplitButton(user) {
  await user.click(getSplitButton())
}

export function queryTavern() {
  return screen.queryByRole('dialog', { name: 'Tavern' })
}

function getTavern() {
  const tavern = queryTavern()
  expect(tavern).toBeTruthy()
  return tavern
}

export async function openTavern(user) {
  await clickBuildingOnPicture(user, 'Tavern')
  getTavern()
}

export async function closeTavern(user) {
  await user.click(within(getTavern()).getByRole('button', { name: 'Close' }))
}

export function readTavernRumour() {
  return within(getTavern()).getByRole('paragraph', { name: 'Rumour' }).textContent
}

function getHeroesForHire() {
  return within(within(getTavern()).getByRole('group', { name: 'Heroes for hire' })).getAllByRole(
    'button'
  )
}

function getHeroForHire(heroName) {
  return within(within(getTavern()).getByRole('group', { name: 'Heroes for hire' })).getByRole(
    'button',
    { name: heroName }
  )
}

export function readHeroesForHire() {
  return getHeroesForHire().map((hero) => hero.getAttribute('aria-label'))
}

export function readSelectedHeroForHire() {
  return getHeroesForHire()
    .find((hero) => hero.getAttribute('aria-pressed') === 'true')
    ?.getAttribute('aria-label')
}

export function readHeroForHireDescription() {
  return within(getTavern()).getByRole('paragraph', { name: 'Hero for hire' }).textContent
}

export async function selectHeroForHire(user, heroName) {
  await user.click(getHeroForHire(heroName))
}

export async function hoverHeroForHire(user, heroName) {
  await user.hover(getHeroForHire(heroName))
}

// Holds the right mouse button down on a hero's portrait, which opens their hero box.
export async function holdRightButtonOnHeroForHire(user, heroName) {
  await user.pointer({ keys: '[MouseRight>]', target: getHeroForHire(heroName) })
}

export async function releaseRightButton(user) {
  await user.pointer({ keys: '[/MouseRight]' })
}

export function readHiringCost() {
  return within(getTavern()).getByLabelText('Cost').textContent
}

export function getHireButton() {
  return within(getTavern()).getByRole('button', { name: 'Recruit' })
}

export async function hireHero(user, heroName) {
  await selectHeroForHire(user, heroName)
  await user.click(getHireButton())
}

export function readTavernStatusBar() {
  return within(getTavern()).getByRole('status', { name: 'Tavern status bar' }).textContent
}
