// Heroes 3 never shows how many monsters stand on the map, only a word for the size of the group.
// `inText` is how a message words it, as in "the Monastery is guarded by several Monks".
const COUNT_BANDS = Object.freeze([
  { min: 1000, word: 'Legion of', inText: 'a legion of' },
  { min: 500, word: 'Zounds of', inText: 'zounds of' },
  { min: 250, word: 'Swarm of', inText: 'a swarm of' },
  { min: 100, word: 'Throng of', inText: 'a throng of' },
  { min: 50, word: 'Horde of', inText: 'a horde of' },
  { min: 20, word: 'Lots of', inText: 'lots of' },
  { min: 10, word: 'Pack of', inText: 'a pack of' },
  { min: 5, word: 'Several', inText: 'several' },
  { min: 1, word: 'Few', inText: 'a few' }
])

const bandOf = (count) => COUNT_BANDS.find(({ min }) => count >= min)

// "Pack of Skeletons" for 12 skeletons.
export function describeMonsterGroup(count, namePlural) {
  return `${bandOf(count).word} ${namePlural}`
}

export function describeMonsterGroupInText(count, namePlural) {
  return `${bandOf(count).inText} ${namePlural}`
}
