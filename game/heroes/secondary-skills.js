const LEVEL_NAMES = Object.freeze({ BASIC: 'Basic', ADVANCED: 'Advanced', EXPERT: 'Expert' })

function heroOfTheGame(heroes, name) {
  return Object.values(heroes ?? {}).find((hero) => hero.name === name)
}

// A scenario may list a hero's skills; otherwise the game's hero of that name brings their own.
export function startingSecondarySkills({ name, secondarySkills }, definitions) {
  return secondarySkills ?? heroOfTheGame(definitions?.heroes, name)?.secondarySkills ?? []
}

export function describeSecondarySkill({ skill, level }, definitions) {
  const skillDefinition = definitions?.secondarySkills?.[skill]
  const name = skillDefinition?.name ?? skill
  const levelName = LEVEL_NAMES[level] ?? level
  return {
    name,
    levelName,
    title: `${levelName} ${name}`,
    description: skillDefinition?.descriptions?.[level] ?? ''
  }
}
