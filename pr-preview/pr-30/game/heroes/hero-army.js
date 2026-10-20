export const ARMY_SLOT_COUNT = 7

// A creature stack with the name the game shows for its count: "Skeleton" for one, else "Skeletons".
export function describeStack({ creature, count }, definitions) {
  const definition = definitions?.monsters?.[creature]
  const name = count === 1 ? definition?.name : (definition?.namePlural ?? definition?.name)
  return { creature, count, name: name ?? creature }
}

export function getHeroArmy({ entity, definitions }) {
  return Array.from({ length: ARMY_SLOT_COUNT }, (_, index) => {
    const stack = entity?.army?.[index]
    return stack ? describeStack(stack, definitions) : null
  })
}
