// The four Heroes 3 primary skills, in the order the game shows them, with the lowest value a
// hero can have.
export const PRIMARY_SKILLS = Object.freeze([
  { key: 'attack', name: 'Attack', minimum: 0 },
  { key: 'defense', name: 'Defense', minimum: 0 },
  { key: 'power', name: 'Power', minimum: 1 },
  { key: 'knowledge', name: 'Knowledge', minimum: 1 }
])

// A hero starts with their class's primary skills; a scenario may set any of them instead, as
// the Heroes 3 map editor's "Customize primary skills" does.
export function getHeroPrimarySkills({ entity, definitions }) {
  const heroClass = definitions?.heroClasses?.[definitions?.hero?.heroClass]
  return PRIMARY_SKILLS.map(({ key, name }) => ({
    key,
    name,
    value: entity?.primarySkills?.[key] ?? heroClass?.primarySkills?.[key] ?? 0
  }))
}
