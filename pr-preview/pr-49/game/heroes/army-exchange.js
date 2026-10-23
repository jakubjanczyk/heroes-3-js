import { ARMY_SLOT_COUNT } from './hero-army.js'

function toSlots(stacks) {
  return Array.from({ length: ARMY_SLOT_COUNT }, (_, index) => stacks?.[index] ?? null)
}

function placeStack(stack, target) {
  if (!target) {
    return { placed: stack, left: null }
  }
  if (target.creature === stack.creature) {
    return { placed: { ...target, count: target.count + stack.count }, left: null }
  }
  return { placed: stack, left: target }
}

// A stack moved onto another slot, as in Heroes 3: onto an empty slot it moves, onto a stack of the
// same creature it merges, onto another creature the two swap. `armies` holds the armies by name
// (the garrison, the visiting hero's); `from` and `to` are each `{ army, slot }`. Returns the armies
// after the move, or null when it isn't allowed: an army that isn't there, an empty slot to move,
// or a hero left with no creatures, which Heroes 3 never allows.
export function moveStack(armies, from, to) {
  const source = armies[from.army]
  const target = armies[to.army]
  const stack = source?.[from.slot]
  if (!stack || !target || (from.army === to.army && from.slot === to.slot)) {
    return null
  }

  const moved = { ...armies, [from.army]: toSlots(source) }
  moved[to.army] = from.army === to.army ? moved[from.army] : toSlots(target)
  const { placed, left } = placeStack(stack, moved[to.army][to.slot])
  moved[to.army][to.slot] = placed
  moved[from.army][from.slot] = left

  if (moved.hero && !moved.hero.some(Boolean)) {
    return null
  }
  return moved
}

const SELECT_TEXT = { garrison: 'Select %s (in garrison)', hero: 'Select %s (visiting)' }

function isLastStackLeaving(armies, selected, hovered) {
  return (
    selected.army === 'hero' && hovered.army !== 'hero' && armies.hero.filter(Boolean).length === 1
  )
}

// The status bar text for a slot under the mouse, as Heroes 3 words it with the creatures' singular
// names (VCMI's CGarrisonSlot::hover). `armies` holds the stacks as the town screen shows them,
// `selected` and `hovered` are each `{ army, slot }`, `selected` null when no stack is framed.
// Nothing for the framed stack itself: Heroes 3 offers to view it, and there is no creature window
// yet.
export function describeSlotHover(armies, selected, hovered) {
  const stack = armies[hovered.army]?.[hovered.slot]
  const selectedStack = selected && armies[selected.army]?.[selected.slot]
  if (!selectedStack) {
    return stack ? SELECT_TEXT[hovered.army].replace('%s', stack.singularName) : 'Empty'
  }
  if (selected.army === hovered.army && selected.slot === hovered.slot) {
    return ''
  }
  if (!stack) {
    return isLastStackLeaving(armies, selected, hovered)
      ? 'Cannot move last army to garrison'
      : `Move ${selectedStack.singularName}`
  }
  if (stack.creature === selectedStack.creature) {
    return `Combine ${stack.singularName} armies`
  }
  return `Exchange ${selectedStack.singularName} with ${stack.singularName}`
}
