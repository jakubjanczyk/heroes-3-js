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

const MAX_SECONDARY_SKILLS = 8
const NEXT_LEVEL = Object.freeze({ BASIC: 'ADVANCED', ADVANCED: 'EXPERT' })

function pickUpgrade({ secondarySkills, offered, random }) {
  const upgradable = secondarySkills.filter(
    ({ skill, level }) => NEXT_LEVEL[level] && !offered.includes(skill)
  )
  if (upgradable.length === 0) {
    return null
  }

  const { skill, level } = upgradable[Math.floor(random() * upgradable.length)]
  return { skill, level: NEXT_LEVEL[level] }
}

function pickNewSkill({ secondarySkills, weights, offered, random }) {
  if (secondarySkills.length >= MAX_SECONDARY_SKILLS) {
    return null
  }

  const known = new Set(secondarySkills.map(({ skill }) => skill))
  const candidates = Object.entries(weights ?? {}).filter(
    ([skill, weight]) => weight > 0 && !known.has(skill) && !offered.includes(skill)
  )
  const total = candidates.reduce((sum, [, weight]) => sum + weight, 0)
  if (total === 0) {
    return null
  }

  const roll = random() * total
  let threshold = 0
  for (const [skill, weight] of candidates) {
    threshold += weight
    if (roll < threshold) {
      return { skill, level: 'BASIC' }
    }
  }

  return { skill: candidates.at(-1)[0], level: 'BASIC' }
}

export function learnSecondarySkill(secondarySkills, learned) {
  const isKnown = secondarySkills.some(({ skill }) => skill === learned.skill)
  return isKnown
    ? secondarySkills.map((known) => (known.skill === learned.skill ? learned : known))
    : [...secondarySkills, learned]
}

// The skills a hero may learn on a level-up: an upgrade of one of theirs and a new one picked by
// the class's `weights`. With no skill to upgrade both are new; with no room for a new one, both
// are upgrades.
export function offerSecondarySkills({ secondarySkills, weights, random }) {
  const pick = (first, second, offered) =>
    first({ secondarySkills, weights, offered, random }) ??
    second({ secondarySkills, weights, offered, random })
  const firstOffer = pick(pickUpgrade, pickNewSkill, [])
  if (!firstOffer) {
    return []
  }

  const secondOffer = pick(pickNewSkill, pickUpgrade, [firstOffer.skill])
  return secondOffer ? [firstOffer, secondOffer] : [firstOffer]
}
