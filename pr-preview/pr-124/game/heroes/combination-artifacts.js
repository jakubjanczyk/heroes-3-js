import { ARTIFACT_SLOTS, BACKPACK_CAPACITY, kindOfSlot, layoutOf, partsOf } from './artifacts.js'

// The worn slot of each part, or null when a part isn't worn.
function wornLayout(artifacts, combinationId, definitions) {
  const layout = {}
  for (const part of partsOf(combinationId, definitions)) {
    const slot = ARTIFACT_SLOTS.find(({ id }) => artifacts.worn[id] === part && !layout[id])
    if (!slot) {
      return null
    }
    layout[slot.id] = part
  }
  return layout
}

export function combinationToAssemble(artifacts, artifactId, definitions) {
  return (
    Object.keys(definitions?.artifacts ?? {}).find(
      (combinationId) =>
        partsOf(combinationId, definitions).includes(artifactId) &&
        wornLayout(artifacts, combinationId, definitions)
    ) ?? null
  )
}

export function assembleCombination(artifacts, combinationId, definitions) {
  const layout = wornLayout(artifacts, combinationId, definitions)
  const kind = definitions?.artifacts?.[combinationId]?.slot
  const slotId = layout && Object.keys(layout).find((partSlotId) => kindOfSlot(partSlotId) === kind)
  if (!slotId) {
    return null
  }
  const worn = Object.fromEntries(
    Object.entries(artifacts.worn).filter(([partSlotId]) => !layout[partSlotId])
  )
  return {
    ...artifacts,
    worn: { ...worn, [slotId]: combinationId },
    combined: { ...artifacts.combined, [slotId]: layout }
  }
}

// Worn, the parts go back where they were worn; in the backpack, they take its place there.
export function disassembleCombination(artifacts, place, definitions) {
  if (place.slot) {
    const layout = layoutOf(artifacts, place.slot)
    if (!layout) {
      return null
    }
    const { [place.slot]: _layout, ...combined } = artifacts.combined
    return { ...artifacts, worn: { ...artifacts.worn, ...layout }, combined }
  }
  const parts = partsOf(artifacts.backpack[place.backpack], definitions)
  if (parts.length === 0 || artifacts.backpack.length - 1 + parts.length > BACKPACK_CAPACITY) {
    return null
  }
  const backpack = [...artifacts.backpack]
  backpack.splice(place.backpack, 1, ...parts)
  return { ...artifacts, backpack }
}

// What right-clicking the artifact at that place asks, if anything.
export function combinationQuestionAt(artifacts, place, definitions) {
  if (!artifacts || artifacts.held) {
    return null
  }
  const artifactId = place.slot ? artifacts.worn[place.slot] : artifacts.backpack[place.backpack]
  if (artifactId && disassembleCombination(artifacts, place, definitions)) {
    return { action: 'disassemble', artifact: artifactId }
  }
  const combination = place.slot && combinationToAssemble(artifacts, artifactId, definitions)
  return combination ? { action: 'assemble', artifact: combination } : null
}
