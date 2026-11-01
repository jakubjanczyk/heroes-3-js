import { hasSpellBook, maxLearnableSpellLevel, skillLevelOf } from './spell-book.js'

export const SCHOLAR = 'SCHOLAR'
export const SCHOLAR_LEVELS = Object.freeze(['', 'BASIC', 'ADVANCED', 'EXPERT'])
// Basic Scholar teaches up to level 2, each level of the skill one more.
const SCHOLAR_SPELL_LEVEL_OFFSET = 1
export const PICTURES_PER_SCHOLAR_WINDOW = 8

function spellsToTeach({ from, to, upToLevel, spells }) {
  const known = new Set(to.spells ?? [])
  const highest = Math.min(upToLevel, maxLearnableSpellLevel(to))
  return (from.spells ?? []).filter(
    (spellId) => !known.has(spellId) && (spells[spellId]?.level ?? Infinity) <= highest
  )
}

function byLevelThenName(spells) {
  return (first, second) =>
    (spells[second]?.level ?? 0) - (spells[first]?.level ?? 0) ||
    (spells[first]?.name ?? first).localeCompare(spells[second]?.name ?? second)
}

// The scholar is the hero with the higher Scholar, the walking hero on a tie; they learn the
// other's spells and teach them theirs, each up to the levels their own Wisdom allows.
export function scholarTeaching({ walker, met, spells = {} }) {
  const walkerLevel = skillLevelOf(walker, SCHOLAR)
  const metLevel = skillLevelOf(met, SCHOLAR)
  const scholarLevel = Math.max(walkerLevel, metLevel)
  if (scholarLevel === 0 || !hasSpellBook(walker) || !hasSpellBook(met)) {
    return null
  }
  const [scholar, other] = metLevel > walkerLevel ? [met, walker] : [walker, met]
  const upToLevel = scholarLevel + SCHOLAR_SPELL_LEVEL_OFFSET
  const order = byLevelThenName(spells)
  return {
    scholar,
    other,
    level: SCHOLAR_LEVELS[scholarLevel],
    learned: spellsToTeach({ from: other, to: scholar, upToLevel, spells }).sort(order),
    taught: spellsToTeach({ from: scholar, to: other, upToLevel, spells }).sort(order)
  }
}

function listOf(names) {
  if (names.length < 2) {
    return names.join('')
  }
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

export function scholarMessage({ scholarName, otherName, learnedNames, taughtNames }) {
  const parts = []
  if (learnedNames.length > 0) {
    parts.push(`learns ${listOf(learnedNames)} from ${otherName}`)
  }
  if (taughtNames.length > 0) {
    parts.push(`teaches ${listOf(taughtNames)} to ${otherName}`)
  }
  return `${scholarName}, who has studied magic extensively, ${parts.join(', and ')}.`
}
