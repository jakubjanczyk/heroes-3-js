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
