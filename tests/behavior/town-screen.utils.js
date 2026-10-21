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
