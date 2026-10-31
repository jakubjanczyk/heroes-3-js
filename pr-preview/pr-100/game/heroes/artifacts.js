// A ring or misc artifact goes to the first free slot of its kind, in this order.
export const ARTIFACT_SLOTS = Object.freeze([
  { id: 'HELMET', kind: 'HELMET' },
  { id: 'CAPE', kind: 'CAPE' },
  { id: 'NECKLACE', kind: 'NECKLACE' },
  { id: 'WEAPON', kind: 'WEAPON' },
  { id: 'SHIELD', kind: 'SHIELD' },
  { id: 'TORSO', kind: 'TORSO' },
  { id: 'RIGHT_RING', kind: 'RING' },
  { id: 'LEFT_RING', kind: 'RING' },
  { id: 'FEET', kind: 'FEET' },
  { id: 'MISC_1', kind: 'MISC' },
  { id: 'MISC_2', kind: 'MISC' },
  { id: 'MISC_3', kind: 'MISC' },
  { id: 'MISC_4', kind: 'MISC' },
  { id: 'MISC_5', kind: 'MISC' }
])

export const BATTLE_DEFENDER_ARTIFACT_GUARDS = 'ARTIFACT_GUARDS'

export const BACKPACK_CAPACITY = 64

export const hasFullBackpack = (artifacts) =>
  (artifacts?.backpack?.length ?? 0) >= BACKPACK_CAPACITY

export const NO_ARTIFACTS = Object.freeze({ worn: Object.freeze({}), backpack: Object.freeze([]) })

const definitionOf = (artifactId, definitions) => definitions?.artifacts?.[artifactId]

const kindOf = (artifactId, definitions) => definitionOf(artifactId, definitions)?.slot

export const kindOfSlot = (slotId) => ARTIFACT_SLOTS.find((slot) => slot.id === slotId)?.kind

export const partsOf = (artifactId, definitions) =>
  definitionOf(artifactId, definitions)?.parts ?? []

const isCombination = (artifactId, definitions) => partsOf(artifactId, definitions).length > 0

// Where each part of a worn combination was put on, by the slot the combination is worn in.
const layoutsOf = (artifacts) => artifacts.combined ?? {}

export const layoutOf = (artifacts, slotId) => layoutsOf(artifacts)[slotId] ?? null

// The combination locking each slot its parts take besides its own.
export function lockedSlots(artifacts) {
  const locked = {}
  for (const [slotId, layout] of Object.entries(layoutsOf(artifacts ?? {}))) {
    for (const partSlotId of Object.keys(layout)) {
      if (partSlotId !== slotId) {
        locked[partSlotId] = artifacts.worn[slotId]
      }
    }
  }
  return locked
}

const isSlotFree = (artifacts, slotId) => !artifacts.worn[slotId] && !lockedSlots(artifacts)[slotId]

// The combination's own slot goes to a part of its kind; the other parts need free slots.
function layoutAt(artifacts, combinationId, slotId, definitions) {
  const parts = [...partsOf(combinationId, definitions)]
  const ownPart = parts.findIndex((part) => kindOf(part, definitions) === kindOfSlot(slotId))
  if (ownPart < 0) {
    return null
  }
  const layout = { [slotId]: parts.splice(ownPart, 1)[0] }
  for (const part of parts) {
    const slot = ARTIFACT_SLOTS.find(
      ({ id, kind }) =>
        kind === kindOf(part, definitions) && !layout[id] && isSlotFree(artifacts, id)
    )
    if (!slot) {
      return null
    }
    layout[slot.id] = part
  }
  return layout
}

function wearAt(artifacts, artifactId, slotId, definitions) {
  const worn = { ...artifacts.worn, [slotId]: artifactId }
  if (!isCombination(artifactId, definitions)) {
    return { ...artifacts, worn }
  }
  const layout = layoutAt(artifacts, artifactId, slotId, definitions)
  return layout && { ...artifacts, worn, combined: { ...layoutsOf(artifacts), [slotId]: layout } }
}

function takeOff(artifacts, slotId) {
  const { [slotId]: _taken, ...worn } = artifacts.worn
  const { [slotId]: _layout, ...combined } = layoutsOf(artifacts)
  return { ...artifacts, worn, combined }
}

export function fitsSlot(artifactId, slotId, definitions) {
  const kind = kindOf(artifactId, definitions)
  return Boolean(kind) && kindOfSlot(slotId) === kind
}

// An empty slot the artifact can be put on, its parts' slots free too for a combination.
export function canPutOn(artifacts, artifactId, slotId, definitions) {
  return (
    fitsSlot(artifactId, slotId, definitions) &&
    isSlotFree(artifacts, slotId) &&
    Boolean(wearAt(artifacts, artifactId, slotId, definitions))
  )
}

function wearInFirstFreeSlot(artifacts, artifactId, definitions) {
  for (const { id } of ARTIFACT_SLOTS) {
    if (canPutOn(artifacts, artifactId, id, definitions)) {
      return wearAt(artifacts, artifactId, id, definitions)
    }
  }
  return null
}

export const canWear = (artifacts, artifactId, definitions) =>
  Boolean(wearInFirstFreeSlot(artifacts, artifactId, definitions))

export function putOnArtifact(artifacts, artifactId, definitions) {
  return (
    wearInFirstFreeSlot(artifacts, artifactId, definitions) ?? {
      ...artifacts,
      backpack: [...artifacts.backpack, artifactId]
    }
  )
}

// Puts the artifact on that slot, swapping out what is worn there; null when it can't go there.
export function swapIntoSlot(artifacts, artifactId, slotId, definitions) {
  if (!fitsSlot(artifactId, slotId, definitions) || lockedSlots(artifacts)[slotId]) {
    return null
  }
  const wearing = wearAt(takeOff(artifacts, slotId), artifactId, slotId, definitions)
  return wearing && { artifacts: wearing, swappedOut: artifacts.worn[slotId] ?? null }
}

export function startingArtifacts(artifactIds = [], definitions) {
  return artifactIds.reduce(
    (artifacts, artifactId) => putOnArtifact(artifacts, artifactId, definitions),
    NO_ARTIFACTS
  )
}

// A combination counts with its parts. Two of the same artifact count once, unless it is one that
// adds up.
function countedArtifacts(artifacts, definitions) {
  const worn = Object.values(artifacts?.worn ?? {}).flatMap((artifactId) => [
    artifactId,
    ...partsOf(artifactId, definitions)
  ])
  return worn.filter(
    (artifactId, index) =>
      definitions?.artifacts?.[artifactId]?.stacks || worn.indexOf(artifactId) === index
  )
}

const countedDefinitions = (artifacts, definitions) =>
  countedArtifacts(artifacts, definitions).map(
    (artifactId) => definitions?.artifacts?.[artifactId] ?? {}
  )

export function artifactPrimarySkills(artifacts, definitions) {
  const skills = {}
  for (const artifact of countedDefinitions(artifacts, definitions)) {
    for (const [key, value] of Object.entries(artifact.primarySkills ?? {})) {
      skills[key] = (skills[key] ?? 0) + value
    }
  }
  return skills
}

// What each worn artifact gives to one value, such as `morale` or `landMovementPoints`.
export function artifactBonuses(artifacts, key, definitions) {
  return countedDefinitions(artifacts, definitions)
    .filter((artifact) => artifact[key])
    .map((artifact) => ({ name: artifact.name, value: artifact[key] }))
}

export function artifactBonusTotal(artifacts, key, definitions) {
  return artifactBonuses(artifacts, key, definitions).reduce((sum, { value }) => sum + value, 0)
}

export function artifactTownsCountingAsOne(artifacts, definitions) {
  return new Set(
    countedDefinitions(artifacts, definitions).flatMap((artifact) => artifact.townsCountAsOne ?? [])
  )
}

export const artifactLandMovementPoints = (artifacts, definitions) =>
  artifactBonusTotal(artifacts, 'landMovementPoints', definitions)

// `kind` is morale or luck.
export function artifactsCancelInBattle(artifacts, kind, definitions) {
  return countedDefinitions(artifacts, definitions).some((artifact) =>
    (artifact.cancelsInBattle ?? []).includes(kind)
  )
}

// A place is a worn slot, `{ slot: 'WEAPON' }`, or a backpack frame, `{ backpack: 0 }`.
export function takeArtifact(artifacts, place) {
  if (artifacts.held) {
    return null
  }
  if (place.slot) {
    const held = artifacts.worn[place.slot]
    return held ? { ...takeOff(artifacts, place.slot), held } : null
  }
  const held = artifacts.backpack[place.backpack]
  if (!held) {
    return null
  }
  return {
    ...artifacts,
    backpack: artifacts.backpack.filter((_artifact, index) => index !== place.backpack),
    held
  }
}

function putOnSlot(artifacts, slotId, definitions) {
  const swapped = swapIntoSlot({ ...artifacts, held: null }, artifacts.held, slotId, definitions)
  return swapped && { ...swapped.artifacts, held: swapped.swappedOut }
}

function putInBackpack(artifacts, frame) {
  const backpack = [...artifacts.backpack]
  backpack.splice(frame, 0, artifacts.held)
  return { ...artifacts, backpack, held: null }
}

export function putHeldArtifact(artifacts, place, definitions) {
  if (!artifacts.held) {
    return null
  }
  return place.slot
    ? putOnSlot(artifacts, place.slot, definitions)
    : putInBackpack(artifacts, place.backpack)
}

export function putBackHeldArtifact(artifacts, definitions) {
  if (!artifacts.held) {
    return null
  }
  return putOnArtifact({ ...artifacts, held: null }, artifacts.held, definitions)
}

export const BACKPACK_FRAMES = 5

export function scrollBackpack(artifacts, direction) {
  const { backpack } = artifacts
  if (backpack.length <= BACKPACK_FRAMES) {
    return null
  }
  return {
    ...artifacts,
    backpack:
      direction === 'left'
        ? [backpack.at(-1), ...backpack.slice(0, -1)]
        : [...backpack.slice(1), backpack[0]]
  }
}
