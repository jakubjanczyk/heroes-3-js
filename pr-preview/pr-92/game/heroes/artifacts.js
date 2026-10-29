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

export const NO_ARTIFACTS = Object.freeze({ worn: Object.freeze({}), backpack: Object.freeze([]) })

export function putOnArtifact(artifacts, artifactId, definitions) {
  const kind = definitions?.artifacts?.[artifactId]?.slot
  const freeSlot = ARTIFACT_SLOTS.find((slot) => slot.kind === kind && !artifacts.worn[slot.id])
  return freeSlot
    ? { ...artifacts, worn: { ...artifacts.worn, [freeSlot.id]: artifactId } }
    : { ...artifacts, backpack: [...artifacts.backpack, artifactId] }
}

export function startingArtifacts(artifactIds = [], definitions) {
  return artifactIds.reduce(
    (artifacts, artifactId) => putOnArtifact(artifacts, artifactId, definitions),
    NO_ARTIFACTS
  )
}

// Two of the same artifact count once, unless it is one that adds up.
function countedArtifacts(artifacts, definitions) {
  const worn = Object.values(artifacts?.worn ?? {})
  return worn.filter(
    (artifactId, index) =>
      definitions?.artifacts?.[artifactId]?.stacks || worn.indexOf(artifactId) === index
  )
}

export function artifactPrimarySkills(artifacts, definitions) {
  const skills = {}
  for (const artifactId of countedArtifacts(artifacts, definitions)) {
    for (const [key, value] of Object.entries(
      definitions?.artifacts?.[artifactId]?.primarySkills ?? {}
    )) {
      skills[key] = (skills[key] ?? 0) + value
    }
  }
  return skills
}

export function fitsSlot(artifactId, slotId, definitions) {
  const kind = definitions?.artifacts?.[artifactId]?.slot
  return ARTIFACT_SLOTS.some((slot) => slot.id === slotId && slot.kind === kind)
}

// A place is a worn slot, `{ slot: 'WEAPON' }`, or a backpack frame, `{ backpack: 0 }`.
export function takeArtifact(artifacts, place) {
  if (artifacts.held) {
    return null
  }
  if (place.slot) {
    const held = artifacts.worn[place.slot]
    if (!held) {
      return null
    }
    const { [place.slot]: _taken, ...worn } = artifacts.worn
    return { ...artifacts, worn, held }
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
  const { held } = artifacts
  if (!fitsSlot(held, slotId, definitions)) {
    return null
  }
  return {
    ...artifacts,
    worn: { ...artifacts.worn, [slotId]: held },
    held: artifacts.worn[slotId] ?? null
  }
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
