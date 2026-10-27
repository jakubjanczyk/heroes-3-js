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

// Every army but a town's garrison is a hero's, and a hero always keeps at least one creature.
const GARRISON = 'garrison'

function isHeroArmy(armyName) {
  return armyName !== GARRISON
}

function stackCount(army) {
  return army.filter(Boolean).length
}

function isHeroLeftEmpty(armies) {
  return Object.entries(armies).some(
    ([name, army]) => isHeroArmy(name) && Array.isArray(army) && stackCount(army) === 0
  )
}

// A hero's only stack, about to go to another army.
function isLastHeroStackLeaving(armies, from, to) {
  return isHeroArmy(from.army) && to.army !== from.army && stackCount(armies[from.army]) === 1
}

// A stack moved onto another slot: onto an empty slot it moves, onto a stack of the same creature
// it merges, onto another creature the two swap. `armies` holds the armies by name (`garrison`
// for a town's, any other name for a hero's); `from` and `to` are each `{ army, slot }`. Returns
// the armies after the move, or null when it isn't allowed: an army that isn't there, an empty
// slot to move, or a hero left with no creatures. A hero's last stack moved onto an empty slot of
// another army leaves one creature behind instead.
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

// A hero's last stack doesn't merge whole into another army: the player is asked how many to move.
export function mustSplitStack(armies, from, to) {
  return (
    Boolean(armies[to.army]?.[to.slot]) &&
    canSplitStack(armies, from, to) &&
    isLastHeroStackLeaving(armies, from, to)
  )
}

// What the split window starts with and how far it goes: the framed stack's count on the left and the clicked slot's on the right, and the least
// each side may keep. Between two armies, the hero keeps at least one creature when its only stack
// is split away, or when the split is onto its only stack.
export function splitStackLimits(armies, from, to) {
  const stack = armies[from.army][from.slot]
  const target = armies[to.army][to.slot]
  const betweenArmies = from.army !== to.army
  const keepsOne = (armyName) =>
    betweenArmies && isHeroArmy(armyName) && stackCount(armies[armyName]) === 1
  return {
    leftCount: stack.count,
    rightCount: target?.count ?? 0,
    leftMin: keepsOne(from.army) ? 1 : 0,
    rightMin: keepsOne(to.army) ? 1 : 0
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

// Where a stack sent to `army` goes: onto the same creature, else into the first empty slot.
function slotTaking(army, creature) {
  const sameCreatureSlot = army.findIndex((stack) => stack?.creature === creature)
  return sameCreatureSlot >= 0 ? sameCreatureSlot : army.indexOf(null)
}

// `count` of the creatures at `from` sent into `toArmy` within `moved`, changing it in place.
// Returns whether there was room for them.
function sendCreatures(moved, from, toArmy, count) {
  const stack = moved[from.army][from.slot]
  const slot = slotTaking(moved[toArmy], stack.creature)
  if (count < 1 || slot < 0) {
    return false
  }

  const target = moved[toArmy][slot]
  moved[toArmy][slot] = { ...stack, count: (target?.count ?? 0) + count }
  moved[from.army][from.slot] =
    count === stack.count ? null : { ...stack, count: stack.count - count }
  return true
}

function copyBothArmies(armies, fromArmy, toArmy) {
  return { ...armies, [fromArmy]: toSlots(armies[fromArmy]), [toArmy]: toSlots(armies[toArmy]) }
}

// The stack at `from` sent to the army named `toArmy`, onto the same creature or into its first
// empty slot; a hero's last stack leaves one creature behind. Null when there is no room or
// nothing to send.
export function sendStack(armies, from, toArmy) {
  const stack = armies[from.army]?.[from.slot]
  if (!stack || !armies[toArmy] || toArmy === from.army) {
    return null
  }

  const moved = copyBothArmies(armies, from.army, toArmy)
  const keptCount = isLastHeroStackLeaving(armies, from, { army: toArmy }) ? 1 : 0
  return sendCreatures(moved, from, toArmy, stack.count - keptCount) ? moved : null
}

// Every stack of `fromArmy` sent to `toArmy` in slot order, one creature staying in its first
// stack; a stack with no room left for it stays. Null when nothing moves.
export function sendAllStacks(armies, fromArmy, toArmy) {
  if (!armies[fromArmy] || !armies[toArmy] || fromArmy === toArmy) {
    return null
  }

  const moved = copyBothArmies(armies, fromArmy, toArmy)
  const firstSlot = moved[fromArmy].findIndex(Boolean)
  let hasMoved = false
  moved[fromArmy].forEach((stack, slot) => {
    if (stack) {
      const count = slot === firstSlot ? stack.count - 1 : stack.count
      hasMoved = sendCreatures(moved, { army: fromArmy, slot }, toArmy, count) || hasMoved
    }
  })
  return hasMoved ? moved : null
}

// The two armies traded slot for slot.
export function swapArmies(armies, firstArmy, secondArmy) {
  if (!armies[firstArmy] || !armies[secondArmy] || firstArmy === secondArmy) {
    return null
  }

  return {
    ...armies,
    [firstArmy]: toSlots(armies[secondArmy]),
    [secondArmy]: toSlots(armies[firstArmy])
  }
}

export const TOWN_SELECT_TEXT = {
  garrison: 'Select %s (in garrison)',
  hero: 'Select %s (visiting)'
}

// The framed stack shows nothing until creatures have a
// window to view.
export function describeSlotHover(armies, selected, hovered, selectText = TOWN_SELECT_TEXT) {
  const stack = armies[hovered.army]?.[hovered.slot]
  const selectedStack = selected && armies[selected.army]?.[selected.slot]
  if (!selectedStack) {
    return stack ? selectText[hovered.army].replace('%s', stack.singularName) : 'Empty'
  }
  if (selected.army === hovered.army && selected.slot === hovered.slot) {
    return ''
  }
  if (!stack) {
    return hovered.army === GARRISON && isLastHeroStackLeaving(armies, selected, hovered)
      ? 'Cannot move last army to garrison'
      : `Move ${selectedStack.singularName}`
  }
  if (stack.creature === selectedStack.creature) {
    return `Combine ${stack.singularName} armies`
  }
  return `Exchange ${selectedStack.singularName} with ${stack.singularName}`
}
