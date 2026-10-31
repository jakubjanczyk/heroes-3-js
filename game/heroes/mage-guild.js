const MAGE_GUILD_PREFIX = 'MAGE_GUILD_'

function guildLevelOf(buildingId) {
  return buildingId.startsWith(MAGE_GUILD_PREFIX)
    ? Number(buildingId.slice(MAGE_GUILD_PREFIX.length))
    : 0
}

export function isMageGuild(buildingId) {
  return guildLevelOf(buildingId) > 0
}

export function mageGuildLevel(built) {
  return Math.max(0, ...[...built].map(guildLevelOf))
}

// The town type's highest guild level is the last one its Hall offers.
export function highestMageGuildLevel(hall) {
  return Math.max(0, ...hall.flat(2).map(guildLevelOf))
}

export function spellPlacesAt(level) {
  return 6 - level
}

function pickWeighted(candidates, random) {
  const total = candidates.reduce((sum, { chance }) => sum + chance, 0)
  const roll = random() * total
  let threshold = 0
  return (
    candidates.find(({ chance }) => {
      threshold += chance
      return roll < threshold
    }) ?? candidates.at(-1)
  )
}

// Each place is drawn among the level's spells the town can have, by their chances, without
// repeats; places stay empty once no spell is left.
export function rollMageGuildSpells({ spells, townType, level, random }) {
  let candidates = Object.entries(spells ?? {})
    .filter(([, spell]) => spell.level === level && (spell.mageGuildChances?.[townType] ?? 0) > 0)
    .map(([spellId, spell]) => ({ spellId, chance: spell.mageGuildChances[townType] }))
  const rolled = []
  while (rolled.length < spellPlacesAt(level) && candidates.length > 0) {
    const picked = pickWeighted(candidates, random)
    rolled.push(picked.spellId)
    candidates = candidates.filter((candidate) => candidate !== picked)
  }
  return rolled
}

export const SPELL_BOOK_COST = Object.freeze({ GOLD_PILE: 500 })
export const BUY_SPELL_BOOK_QUESTION =
  'To cast spells, your hero must first buy a spell book for 500 gold.  Do you wish to buy one?'
export const SHORT_OF_CASH_FOR_SPELL_BOOK =
  'To cast spells, your hero must first buy a spell book for 500 gold.  Unfortunately, you seem to be a little short of cash at the moment.'

const ALWAYS_LEARNABLE_LEVEL = 2
const WISDOM_LEVELS = Object.freeze({ BASIC: 1, ADVANCED: 2, EXPERT: 3 })

function maxLearnableSpellLevel(hero) {
  const wisdom = (hero?.secondarySkills ?? []).find(({ skill }) => skill === 'WISDOM')
  return ALWAYS_LEARNABLE_LEVEL + (WISDOM_LEVELS[wisdom?.level] ?? 0)
}

// `rolled` holds the guild's spells by level; the hero learns those of the built levels Wisdom
// lets them, if they have a spell book.
export function spellsToLearn({ rolled, builtLevel, hero }) {
  if (!hero?.spellBook) {
    return []
  }
  const known = new Set(hero.spells ?? [])
  const highest = Math.min(builtLevel, maxLearnableSpellLevel(hero))
  return Array.from({ length: highest }, (_, index) => rolled[index + 1] ?? [])
    .flat()
    .filter((spellId) => !known.has(spellId))
}
