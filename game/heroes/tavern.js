export const HEROES_FOR_HIRE = 2
export const MAX_HEROES_PER_PLAYER = 8
const RUMOUR_OPENING = 'After a generous tip, the barkeep whispers:'

// One roll from 1 to 100 decides how many stacks a hired hero brings: the first always, the second
// on 88 or less, the third on 25 or less.
const STARTING_STACK_CHANCES = [100, 88, 25]

function pick(items, random) {
  return items[Math.floor(random() * items.length)]
}

function rollStartingArmy(startingArmy = [], random) {
  const roll = 1 + Math.floor(random() * 100)
  return startingArmy
    .filter((_stack, index) => roll <= (STARTING_STACK_CHANCES[index] ?? 0))
    .map(({ creature, min, max }) => ({
      creature,
      count: min + Math.floor(random() * (max - min + 1))
    }))
}

// A hero who takes a hired one's place brings a single creature of their faction's first level.
function rollReplacementArmy(startingArmy = []) {
  return startingArmy.slice(0, 1).map(({ creature }) => ({ creature, count: 1 }))
}

function rollHeroForHire({ pool, heroClasses, takenNames, isReplacement, random }) {
  const candidates = pool.filter((hero) => !takenNames.has(hero.name))
  if (candidates.length === 0) {
    return null
  }

  const { name, heroClass } = pick(candidates, random)
  const startingArmy = heroClasses?.[heroClass]?.startingArmy
  return {
    name,
    heroClass,
    army: isReplacement ? rollReplacementArmy(startingArmy) : rollStartingArmy(startingArmy, random)
  }
}

// The tavern's own heroes, then the ones the scenario started with: a hero who leaves the map can
// be hired again.
export function heroPool(tavern, startingHeroes) {
  const pool = Object.values(tavern?.heroes ?? {})
  const names = new Set(pool.map(({ name }) => name))
  return [...pool, ...startingHeroes.filter(({ name }) => !names.has(name))]
}

// Heroes on the map are never offered. `kept` holds the heroes still offered, null where a new one
// is needed; a hero filling the place of one just hired is a replacement.
export function rollHeroesForHire({
  pool,
  heroClasses,
  heroNamesOnMap,
  kept,
  isReplacement,
  random
}) {
  const takenNames = new Set([...heroNamesOnMap, ...kept.filter(Boolean).map(({ name }) => name)])
  return kept.map((hero) => {
    if (hero) {
      return hero
    }

    const rolled = rollHeroForHire({ pool, heroClasses, takenNames, isReplacement, random })
    if (rolled) {
      takenNames.add(rolled.name)
    }
    return rolled
  })
}

export function rollRumour(tavern, random) {
  const rumours = tavern?.rumours ?? []
  return rumours.length > 0 ? Math.floor(random() * rumours.length) : null
}

export function rumourText(tavern, rumour) {
  const text = tavern?.rumours?.[rumour]
  return text ? `${RUMOUR_OPENING} ${text}` : RUMOUR_OPENING
}

export function describeHeroForHire({ name, heroClass }, heroClasses) {
  const className = heroClasses?.[heroClass]?.name ?? heroClass
  return `${name} is a level 1 ${className} with 0 artifacts.`
}

function canAfford(resources, cost) {
  return Object.entries(cost ?? {}).every(([type, amount]) => (resources[type] ?? 0) >= amount)
}

export function canHire({ resources, cost, heroCount, isHeroInTown }) {
  return canAfford(resources, cost) && heroCount < MAX_HEROES_PER_PLAYER && !isHeroInTown
}
