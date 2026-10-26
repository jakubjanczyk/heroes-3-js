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

export function getTownGarrison({ entity, definitions }) {
  return describeSlots(entity?.garrison, definitions)
}
