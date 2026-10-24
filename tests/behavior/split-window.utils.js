import { fireEvent, screen, within } from '@testing-library/dom'
import { expect } from 'vitest'

import { flushMicrotasks } from './app.utils.js'

// The split window, named "Split <plural>" after the creature being split.
export function querySplitWindow(name = /^Split /) {
  return screen.queryByRole('dialog', { name })
}

function getSplitWindow() {
  const splitWindow = querySplitWindow()
  expect(splitWindow).toBeTruthy()
  return splitWindow
}

function getSplitCountBox(side) {
  return within(getSplitWindow()).getByRole('textbox', { name: `${side} stack` })
}

// The two boxes under the creature: what stays in the framed stack, and what the clicked slot gets.
export function readSplitCounts() {
  return ['Left', 'Right'].map((side) => Number(getSplitCountBox(side).value))
}

// `side` is 'left' or 'right'.
export async function typeSplitCount(user, side, count) {
  const box = getSplitCountBox(side === 'left' ? 'Left' : 'Right')
  await user.tripleClick(box)
  await user.keyboard(String(count))
  await flushMicrotasks()
}

// To the number of creatures in the right-hand stack.
export function dragSplitSlider(rightCount) {
  const slider = within(getSplitWindow()).getByRole('slider', { name: 'Split' })
  fireEvent.input(slider, { target: { value: String(rightCount) } })
}

async function clickInSplitWindow(user, buttonName) {
  await user.click(within(getSplitWindow()).getByRole('button', { name: buttonName }))
  await flushMicrotasks()
}

export async function clickSplitMore(user) {
  await clickInSplitWindow(user, 'More')
}

export async function clickSplitFewer(user) {
  await clickInSplitWindow(user, 'Fewer')
}

export async function confirmSplit(user) {
  await clickInSplitWindow(user, 'OK')
}

export async function cancelSplit(user) {
  await clickInSplitWindow(user, 'Cancel')
}
