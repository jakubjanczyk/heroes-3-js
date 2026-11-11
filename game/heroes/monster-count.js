// Heroes 3 never shows how many monsters stand on the map, only a word for the size of the group.
// `inArmySlot` is the word under a stack whose count is hidden, as in an enemy hero's army.
// `inText` is how a message words it, as in "the Monastery is guarded by several Monks".
const COUNT_BANDS = Object.freeze([
  { min: 1000, word: 'Legion of', inArmySlot: 'Legion', inText: 'a legion of' },
  { min: 500, word: 'Zounds of', inArmySlot: 'Zounds', inText: 'zounds of' },
  { min: 250, word: 'Swarm of', inArmySlot: 'Swarm', inText: 'a swarm of' },
  { min: 100, word: 'Throng of', inArmySlot: 'Throng', inText: 'a throng of' },
  { min: 50, word: 'Horde of', inArmySlot: 'Horde', inText: 'a horde of' },
  { min: 20, word: 'Lots of', inArmySlot: 'Lots', inText: 'lots of' },
  { min: 10, word: 'Pack of', inArmySlot: 'Pack', inText: 'a pack of' },
  { min: 5, word: 'Several', inArmySlot: 'Several', inText: 'several' },
  { min: 1, word: 'Few', inArmySlot: 'Few', inText: 'a few' }
])

const bandOf = (count) => COUNT_BANDS.find(({ min }) => count >= min)

// "Pack of Skeletons" for 12 skeletons.
export function describeMonsterGroup(count, namePlural) {
  return `${bandOf(count).word} ${namePlural}`
}

export function describeMonsterGroupInText(count, namePlural) {
  return `${bandOf(count).inText} ${namePlural}`
}

export function describeArmySize(count) {
  return bandOf(count).inArmySlot
}
