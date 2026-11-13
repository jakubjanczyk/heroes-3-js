import { describeArmySize } from './monster-count.js'

export const ARMY_SLOT_COUNT = 7

// A creature stack with the name the game shows for its count: "Skeleton" for one, else "Skeletons".
export function describeStack({ creature, count }, definitions) {
  const definition = definitions?.monsters?.[creature]
  const singularName = definition?.name ?? creature
  const pluralName = definition?.namePlural ?? singularName
  return {
    creature,
    count,
    name: count === 1 ? singularName : pluralName,
    singularName,
    pluralName
  }
}

function describeSlots(stacks, definitions) {
  return Array.from({ length: ARMY_SLOT_COUNT }, (_, index) => {
    const stack = stacks?.[index]
    return stack ? describeStack(stack, definitions) : null
  })
}

export function getHeroArmy({ entity, definitions }) {
  return describeSlots(entity?.army, definitions)
}

function withSizeWords(slots) {
  return slots.map((stack) => stack && { ...stack, count: describeArmySize(stack.count) })
}

export function getHeroArmyBySize({ entity, definitions }) {
  return withSizeWords(getHeroArmy({ entity, definitions }))
}

export function getTownGarrison({ entity, definitions }) {
  return describeSlots(entity?.garrison, definitions)
}

const TAVERNS_FOR_CREATURES = 1
const TAVERNS_FOR_SIZE_WORDS = 2

// What the player's Taverns show of a garrison that isn't theirs: with none it looks empty, with
// one its creatures without their sizes, with two or more each size as a word.
export function getTownGarrisonSeenWithTaverns({ entity, definitions, taverns }) {
  const garrison = getTownGarrison({ entity, definitions })
  if (taverns >= TAVERNS_FOR_SIZE_WORDS) {
    return withSizeWords(garrison)
  }
  if (taverns >= TAVERNS_FOR_CREATURES) {
    return garrison.map((stack) => stack && { ...stack, name: stack.pluralName, count: undefined })
  }
  return garrison.map(() => null)
}
