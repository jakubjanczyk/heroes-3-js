const LEVEL_NAMES = Object.freeze({ BASIC: 'Basic', ADVANCED: 'Advanced', EXPERT: 'Expert' })

export function heroOfTheGame(heroes, name) {
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

export const MAX_SECONDARY_SKILLS = 8
const NEXT_LEVEL = Object.freeze({ BASIC: 'ADVANCED', ADVANCED: 'EXPERT' })

function drawWeighted(candidates, random) {
  const total = candidates.reduce((sum, { weight }) => sum + weight, 0)
  if (total === 0) {
    return null
  }

  const roll = random() * total
  let threshold = 0
  for (const candidate of candidates) {
    threshold += candidate.weight
    if (roll < threshold) {
      return candidate
    }
  }

  return candidates.at(-1)
}

function narrowToGuaranteed(candidates, guaranteed) {
  for (const skills of guaranteed) {
    const due = candidates.filter(({ skill }) => skills.includes(skill))
    if (due.length > 0) {
      return due
    }
  }

  return candidates
}

// A skill the class can't learn but the hero already has is still upgraded now and then.
function upgradeCandidates({ secondarySkills, weights, offered }) {
  return secondarySkills
    .filter(({ skill, level }) => NEXT_LEVEL[level] && !offered.includes(skill))
    .map(({ skill, level }) => ({
      skill,
      level: NEXT_LEVEL[level],
      weight: Math.max(1, weights?.[skill] ?? 0)
    }))
}

function newSkillCandidates({ secondarySkills, weights, offered }) {
  if (secondarySkills.length >= MAX_SECONDARY_SKILLS) {
    return []
  }

  const known = new Set(secondarySkills.map(({ skill }) => skill))
  return Object.entries(weights ?? {})
    .filter(([skill, weight]) => weight > 0 && !known.has(skill) && !offered.includes(skill))
    .map(([skill, weight]) => ({ skill, level: 'BASIC', weight }))
}

function pickFrom(candidatesOf) {
  return ({ guaranteed, random, ...hero }) => {
    const candidates = narrowToGuaranteed(candidatesOf(hero), guaranteed)
    const picked = drawWeighted(candidates, random)
    return picked && { skill: picked.skill, level: picked.level }
  }
}

const pickUpgrade = pickFrom(upgradeCandidates)
const pickNewSkill = pickFrom(newSkillCandidates)

export const WISDOM = 'WISDOM'
export const MAGIC_SCHOOLS = Object.freeze([
  'FIRE_MAGIC',
  'AIR_MAGIC',
  'WATER_MAGIC',
  'EARTH_MAGIC'
])

const GUARANTEE_INTERVALS = Object.freeze({
  MIGHT: Object.freeze({ wisdom: 6, magicSchool: 4 }),
  MAGIC: Object.freeze({ wisdom: 3, magicSchool: 3 })
})

// Wisdom comes before the magic schools when both are due.
export function dueSkillGuarantees({ heroClass, level, lastOfferedLevels = {} }) {
  const intervals = GUARANTEE_INTERVALS[heroClass?.kind]
  if (!intervals) {
    return []
  }

  const lastOffered = (skills) =>
    Math.max(0, ...skills.map((skill) => lastOfferedLevels[skill] ?? 0))
  return [
    { skills: [WISDOM], interval: intervals.wisdom },
    { skills: [...MAGIC_SCHOOLS], interval: intervals.magicSchool }
  ]
    .filter(({ skills, interval }) => level - lastOffered(skills) >= interval)
    .map(({ skills }) => skills)
}

export function lastOfferedLevelsAfter(lastOfferedLevels, { level, skillOffers }) {
  return {
    ...lastOfferedLevels,
    ...Object.fromEntries(skillOffers.map(({ skill }) => [skill, level]))
  }
}

export function learnSecondarySkill(secondarySkills, learned) {
  const isKnown = secondarySkills.some(({ skill }) => skill === learned.skill)
  return isKnown
    ? secondarySkills.map((known) => (known.skill === learned.skill ? learned : known))
    : [...secondarySkills, learned]
}

export function offerSecondarySkills({ secondarySkills, weights, random, guaranteed = [] }) {
  const pick = (first, second, offered, due) =>
    first({ secondarySkills, weights, offered, random, guaranteed: due }) ??
    second({ secondarySkills, weights, offered, random, guaranteed: due })
  const firstOffer = pick(pickUpgrade, pickNewSkill, [], guaranteed)
  if (!firstOffer) {
    return []
  }

  const stillDue = guaranteed.filter((skills) => !skills.includes(firstOffer.skill))
  const secondOffer = pick(pickNewSkill, pickUpgrade, [firstOffer.skill], stillDue)
  return secondOffer ? [firstOffer, secondOffer] : [firstOffer]
}
