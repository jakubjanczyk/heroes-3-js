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
