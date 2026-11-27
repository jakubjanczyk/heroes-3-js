import { getHexNeighbours, getOccupiedHexes, isSameHex } from './battlefield.js'

const BINDING_SPELL = 'BIND'

const bindingOf = (stack) => (stack.spells ?? []).find(({ spellId }) => spellId === BINDING_SPELL)

export const isBound = (stack) => Boolean(bindingOf(stack))

// Kept with the stack's spells, so Dispel and Anti-Magic take it off as they take off the others.
export function bindStack(stack, binderId) {
  const boundByIds = [...new Set([...(bindingOf(stack)?.boundByIds ?? []), binderId])]
  const others = (stack.spells ?? []).filter(({ spellId }) => spellId !== BINDING_SPELL)
  return {
    ...stack,
    spells: [
      ...others,
      {
        spellId: BINDING_SPELL,
        effects: {},
        roundsLeft: null,
        helpful: false,
        removable: true,
        boundByIds
      }
    ]
  }
}

export const describeBinding = (stack) => `Roots and vines bind the ${stack.name} to the ground!`

const hexesOf = (stack) => getOccupiedHexes(stack)

const areNextToEachOther = (stack, other) =>
  hexesOf(stack).some((hex) =>
    getHexNeighbours(hex).some((next) => hexesOf(other).some((part) => isSameHex(part, next)))
  )

// Once none of the stacks that bound it is still alive next to it, the binding is broken for good:
// coming back doesn't bind it again.
export function withoutBrokenBindings(stacks) {
  const holds = (stack, binderId) => {
    const binder = stacks.find(({ id }) => id === binderId)
    return Boolean(binder) && binder.count > 0 && areNextToEachOther(stack, binder)
  }
  return stacks.map((stack) => {
    const binding = bindingOf(stack)
    if (!binding || binding.boundByIds.some((binderId) => holds(stack, binderId))) {
      return stack
    }
    return { ...stack, spells: stack.spells.filter((spell) => spell !== binding) }
  })
}
