import { artifactPrimarySkills } from './artifacts.js'

// The four Heroes 3 primary skills, in the order the game shows them, with the lowest value a
// hero can have.
export const PRIMARY_SKILLS = Object.freeze([
  { key: 'attack', name: 'Attack', minimum: 0 },
  { key: 'defense', name: 'Defense', minimum: 0 },
  { key: 'power', name: 'Power', minimum: 1 },
  { key: 'knowledge', name: 'Knowledge', minimum: 1 }
])

// A hero starts with their class's primary skills; a scenario may set any of them instead, as
// the Heroes 3 map editor's "Customize primary skills" does. Each level-up adds 1 to the skill
// it rolled; the hero's `levelUpSkills` lists those skills (e.g. ['defense', 'attack']),
// `bonusPrimarySkills` counts what map objects added (e.g. { attack: 1 }), and worn artifacts
// add theirs, though never below the skill's minimum.
export function getHeroPrimarySkills({ entity, definitions }) {
  const heroClass = definitions?.heroClasses?.[entity?.heroClass]
  const levelUpSkills = entity?.levelUpSkills ?? []
  const fromArtifacts = artifactPrimarySkills(entity?.artifacts, definitions)
  return PRIMARY_SKILLS.map(({ key, name, minimum }) => ({
    key,
    name,
    value: Math.max(
      minimum,
      (entity?.primarySkills?.[key] ?? heroClass?.primarySkills?.[key] ?? 0) +
        levelUpSkills.filter((skill) => skill === key).length +
        (entity?.bonusPrimarySkills?.[key] ?? 0) +
        (fromArtifacts[key] ?? 0)
    )
  }))
}
