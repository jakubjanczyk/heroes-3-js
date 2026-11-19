// Experience needed for levels 2 to 12, as in Heroes 3. Each later level needs 20% more than the
// step before it, rounded down.
const EXPERIENCE_FOR_LEVEL = [
  0, 1000, 2000, 3200, 4600, 6200, 8000, 10000, 12200, 14700, 17500, 20600
]

export function experienceToNextLevel(experience) {
  return experienceForLevel(levelForExperience(experience) + 1) - experience
}

// Heroes 3 rolls level-up primary skills with one set of chances up to level 9 and another after.
const LAST_LOW_LEVEL = 9

function experienceForLevel(level) {
  while (EXPERIENCE_FOR_LEVEL.length < level) {
    const last = EXPERIENCE_FOR_LEVEL.at(-1)
    const step = last - EXPERIENCE_FOR_LEVEL.at(-2)
    EXPERIENCE_FOR_LEVEL.push(last + step + Math.floor(step / 5))
  }

  return EXPERIENCE_FOR_LEVEL[level - 1]
}

export function levelForExperience(experience) {
  let level = 1
  while (experience >= experienceForLevel(level + 1)) {
    level += 1
  }

  return level
}

// The primary skill a hero gains on reaching `level`, picked by the class's chances in percent
// (e.g. a Knight's Attack 35, Defense 45, Power 10, Knowledge 10) with `roll` in [0, 1).
export function rollPrimarySkill({ heroClass, level, roll }) {
  const { upToLevel9, fromLevel10 } = heroClass.primarySkillChances
  const chances = Object.entries(level <= LAST_LOW_LEVEL ? upToLevel9 : fromLevel10)
  let threshold = 0
  for (const [skill, chance] of chances) {
    threshold += chance
    if (roll * 100 < threshold) {
      return skill
    }
  }

  return chances.at(-1)[0]
}
