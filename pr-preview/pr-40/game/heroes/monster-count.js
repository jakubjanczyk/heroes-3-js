// Heroes 3 never shows how many monsters stand on the map, only a word for the size of the group.
const COUNT_BANDS = Object.freeze([
  { min: 1000, format: (name) => `Legion of ${name}` },
  { min: 500, format: (name) => `Zounds of ${name}` },
  { min: 250, format: (name) => `Swarm of ${name}` },
  { min: 100, format: (name) => `Throng of ${name}` },
  { min: 50, format: (name) => `Horde of ${name}` },
  { min: 20, format: (name) => `Lots of ${name}` },
  { min: 10, format: (name) => `Pack of ${name}` },
  { min: 5, format: (name) => `Several ${name}` },
  { min: 1, format: (name) => `Few ${name}` }
])

// "Pack of Skeletons" for 12 skeletons.
export function describeMonsterGroup(count, namePlural) {
  const band = COUNT_BANDS.find(({ min }) => count >= min)
  return band.format(namePlural)
}
