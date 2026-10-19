export const ARMY_SLOT_COUNT = 7

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
