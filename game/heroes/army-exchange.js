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

function copyArmies(armies, from, to) {
  const copied = { ...armies, [from.army]: toSlots(armies[from.army]) }
  copied[to.army] = from.army === to.army ? copied[from.army] : toSlots(armies[to.army])
  return copied
}

function isSameSlot(from, to) {
  return from.army === to.army && from.slot === to.slot
}

function isHeroLeftEmpty(armies) {
  return Boolean(armies.hero) && !armies.hero.some(Boolean)
}

// The hero's only stack, about to go to another army.
function isLastHeroStackLeaving(armies, from, to) {
  return from.army === 'hero' && to.army !== 'hero' && armies.hero.filter(Boolean).length === 1
}

// A stack moved onto another slot, as in Heroes 3: onto an empty slot it moves, onto a stack of the
// same creature it merges, onto another creature the two swap. `armies` holds the armies by name
// (the garrison, the visiting hero's); `from` and `to` are each `{ army, slot }`. Returns the armies
// after the move, or null when it isn't allowed: an army that isn't there, an empty slot to move,
// or a hero left with no creatures, which Heroes 3 never allows. The hero's last stack moved onto
// an empty slot leaves one creature behind instead (VCMI's CGarrisonSlot::clickPressed).
export function moveStack(armies, from, to) {
  const stack = armies[from.army]?.[from.slot]
  if (!stack || !armies[to.army] || isSameSlot(from, to)) {
    return null
  }
  if (!armies[to.army][to.slot] && isLastHeroStackLeaving(armies, from, to)) {
    return splitStack(armies, from, to, stack.count - 1)
  }

  const moved = copyArmies(armies, from, to)
  const { placed, left } = placeStack(stack, moved[to.army][to.slot])
  moved[to.army][to.slot] = placed
  moved[from.army][from.slot] = left
  return isHeroLeftEmpty(moved) ? null : moved
}

// Whether the stack at `from` can be split onto `to`: an empty slot or a stack of the same creature.
export function canSplitStack(armies, from, to) {
  const stack = armies[from.army]?.[from.slot]
  const target = armies[to.army]?.[to.slot]
  return (
    Boolean(stack) &&
    Boolean(armies[to.army]) &&
    !isSameSlot(from, to) &&
    (!target || target.creature === stack.creature)
  )
}

// Heroes 3 won't merge the hero's last stack whole into another army: it asks how many to move.
export function mustSplitStack(armies, from, to) {
  return (
    Boolean(armies[to.army]?.[to.slot]) &&
    canSplitStack(armies, from, to) &&
    isLastHeroStackLeaving(armies, from, to)
  )
}

// What the split window starts with and how far it goes, as VCMI's CGarrisonSlot::split works it
// out: the framed stack's count on the left and the clicked slot's on the right, and the least
// each side may keep. Between two armies, the hero keeps at least one creature when its only stack
// is split away, or when the split is onto its only stack.
export function splitStackLimits(armies, from, to) {
  const stack = armies[from.army][from.slot]
  const target = armies[to.army][to.slot]
  const betweenArmies = from.army !== to.army
  const heroStacks = armies.hero?.filter(Boolean).length
  return {
    leftCount: stack.count,
    rightCount: target?.count ?? 0,
    leftMin: betweenArmies && from.army === 'hero' && heroStacks === 1 ? 1 : 0,
    rightMin: betweenArmies && to.army === 'hero' && heroStacks === 1 ? 1 : 0
  }
}

// The stack at `from` split with the slot at `to`, which ends up with `rightCount` creatures and
// `from` with the rest of the two. Returns the armies after the split, or null when it isn't
// allowed or changes nothing.
export function splitStack(armies, from, to, rightCount) {
  if (!canSplitStack(armies, from, to)) {
    return null
  }

  const { leftCount, rightCount: currentRightCount } = splitStackLimits(armies, from, to)
  const total = leftCount + currentRightCount
  if (!Number.isInteger(rightCount) || rightCount < 0 || rightCount > total) {
    return null
  }
  if (rightCount === currentRightCount) {
    return null
  }

  const stack = armies[from.army][from.slot]
  const split = copyArmies(armies, from, to)
  split[from.army][from.slot] =
    rightCount === total ? null : { ...stack, count: total - rightCount }
  split[to.army][to.slot] = rightCount === 0 ? null : { ...stack, count: rightCount }
  return isHeroLeftEmpty(split) ? null : split
}

const SELECT_TEXT = { garrison: 'Select %s (in garrison)', hero: 'Select %s (visiting)' }

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
    return isLastHeroStackLeaving(armies, selected, hovered)
      ? 'Cannot move last army to garrison'
      : `Move ${selectedStack.singularName}`
  }
  if (stack.creature === selectedStack.creature) {
    return `Combine ${stack.singularName} armies`
  }
  return `Exchange ${selectedStack.singularName} with ${stack.singularName}`
}
