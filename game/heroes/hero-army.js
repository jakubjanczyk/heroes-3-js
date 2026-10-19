// A Heroes 3 hero carries up to seven creature stacks, each in its own slot.
export const ARMY_SLOT_COUNT = 7

// The hero's seven army slots in order: a stack ({ creature, count, name }) or null when empty.
// The name is the creature's, singular for a stack of one ("Skeleton") and plural otherwise.
export function getHeroArmy({ entity, definitions }) {
  return Array.from({ length: ARMY_SLOT_COUNT }, (_, index) => {
    const stack = entity?.army?.[index]
    if (!stack) {
      return null
    }

    const creature = definitions?.monsters?.[stack.creature]
    const name = stack.count === 1 ? creature?.name : (creature?.namePlural ?? creature?.name)
    return { creature: stack.creature, count: stack.count, name: name ?? stack.creature }
  })
}
