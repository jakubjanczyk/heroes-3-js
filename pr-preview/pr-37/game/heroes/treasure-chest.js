export const TREASURE_CHEST_NAME = 'Treasure Chest'

// The gold goes to this resource in the resource bar.
export const TREASURE_CHEST_GOLD_RESOURCE = 'GOLD_PILE'

// What a Heroes 3 Treasure Chest offers: its gold, or less experience instead. The scenario sets
// the tier until chests roll one; artifact chests come with artifacts.
const REWARDS_BY_TIER = Object.freeze({
  1: Object.freeze({ gold: 1000, experience: 500 }),
  2: Object.freeze({ gold: 1500, experience: 1000 }),
  3: Object.freeze({ gold: 2000, experience: 1500 })
})

export function treasureChestRewards(chest) {
  return REWARDS_BY_TIER[chest.tier]
}
