import { hasFullBackpack } from './artifacts.js'

export const TREASURE_CHEST_NAME = 'Treasure Chest'

// The gold goes to this resource in the resource bar.
export const TREASURE_CHEST_GOLD_RESOURCE = 'GOLD_PILE'

export const ARTIFACT_CHEST_TIER = 'artifact'

// What a chest offers: its gold, or less experience instead.
const REWARDS_BY_TIER = Object.freeze({
  1: Object.freeze({ gold: 1000, experience: 500 }),
  2: Object.freeze({ gold: 1500, experience: 1000 }),
  3: Object.freeze({ gold: 2000, experience: 1500 })
})

const GOLD_TIERS = Object.freeze([1, 2, 3])

const TIER_CHANCES = Object.freeze([
  { chance: 32, tier: 1 },
  { chance: 32, tier: 2 },
  { chance: 31, tier: 3 },
  { chance: 5, tier: ARTIFACT_CHEST_TIER }
])

const ARTIFACT_CHEST_CLASS = 'TREASURE'

function rollTier(random) {
  const roll = random() * 100
  let threshold = 0
  return (
    TIER_CHANCES.find(({ chance }) => {
      threshold += chance
      return roll < threshold
    }) ?? TIER_CHANCES.at(-1)
  ).tier
}

const pick = (items, random) => items[Math.floor(random() * items.length)]

function rollArtifact(definitions, random) {
  const artifacts = Object.entries(definitions?.artifacts ?? {})
    .filter(([, artifact]) => artifact.class === ARTIFACT_CHEST_CLASS)
    .map(([artifactId]) => artifactId)
  return pick(artifacts, random) ?? null
}

export const isGoldChestTier = (tier) => GOLD_TIERS.includes(tier)

// What the scenario says the chest holds, or nothing when the game is to roll it.
export function scenarioChestContents(chest) {
  return isGoldChestTier(chest.tier) || chest.tier === ARTIFACT_CHEST_TIER
    ? { tier: chest.tier }
    : null
}

export function isChestRolled(contents) {
  return isGoldChestTier(contents?.tier) || Boolean(contents?.artifact)
}

// An artifact chest also rolls the gold or experience it offers a hero with a full backpack.
export function rollChestContents(contents, definitions, random) {
  const tier = contents?.tier ?? rollTier(random)
  if (tier !== ARTIFACT_CHEST_TIER) {
    return { tier }
  }
  return {
    tier,
    artifact: rollArtifact(definitions, random),
    fullBackpackTier: pick(GOLD_TIERS, random)
  }
}

// The artifact the hero finds, or the gold or experience to choose from.
export function openChest(contents, heroArtifacts) {
  if (contents?.tier !== ARTIFACT_CHEST_TIER) {
    return { rewards: REWARDS_BY_TIER[contents?.tier] ?? null }
  }
  if (contents.artifact && !hasFullBackpack(heroArtifacts)) {
    return { artifact: contents.artifact }
  }
  return { rewards: REWARDS_BY_TIER[contents.fullBackpackTier] ?? null }
}
