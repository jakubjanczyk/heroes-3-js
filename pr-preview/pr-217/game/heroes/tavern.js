import { countArtifacts } from './artifacts.js'
import { heroOfTheGame } from './secondary-skills.js'

export const HEROES_FOR_HIRE = 2
export const MAX_HEROES_PER_PLAYER = 8
const RUMOUR_OPENING = 'After a generous tip, the barkeep whispers:'

export const TAVERN_ROLE_RETREATED = 'retreated'
export const TAVERN_ROLE_SURRENDERED = 'surrendered'
const TAVERN_ROLE_REPLACEMENT = 'replacement'
const TAVERN_ROLE_WEEK_START = 'weekStart'

// A hero coming back to the tavern takes the slot of the hero least worth keeping, in this order.
const ROLE_RANKS = [
  TAVERN_ROLE_REPLACEMENT,
  TAVERN_ROLE_WEEK_START,
  TAVERN_ROLE_RETREATED,
  TAVERN_ROLE_SURRENDERED
]

// One roll from 1 to 100 decides how many stacks a hired hero brings: the first always, the second
// on 88 or less, the third on 25 or less.
const STARTING_STACK_CHANCES = [100, 88, 25]

function pick(items, random) {
  return items[Math.floor(random() * items.length)]
}

// A war machine keeps its stack's place in the roll but isn't brought until there are war machines.
const isCreatureStack = (stack) => Boolean(stack.creature)

function rollStartingArmy(startingArmy = [], random) {
  const roll = 1 + Math.floor(random() * 100)
  return startingArmy
    .filter((_stack, index) => roll <= (STARTING_STACK_CHANCES[index] ?? 0))
    .filter(isCreatureStack)
    .map(({ creature, min, max }) => ({
      creature,
      count: min + Math.floor(random() * (max - min + 1))
    }))
}

// A hero who takes a hired one's place brings a single creature of their first starting stack.
function rollReplacementArmy(startingArmy = []) {
  return startingArmy
    .filter(isCreatureStack)
    .slice(0, 1)
    .map(({ creature }) => ({ creature, count: 1 }))
}

// A hero may have a starting army of their own; otherwise they bring their class's.
function startingArmyOf({ startingArmy, heroClass }, heroClasses) {
  return startingArmy ?? heroClasses?.[heroClass]?.startingArmy
}

// A hero who retreated comes back with one creature of their first starting stack.
export function armyAfterRetreat({ name, heroClass }, { heroes, heroClasses } = {}) {
  const ownData = heroOfTheGame(heroes, name)
  return rollReplacementArmy(startingArmyOf({ heroClass, ...ownData }, heroClasses))
}

function rollHeroForHire({ pool, heroClasses, takenNames, isReplacement, random }) {
  const candidates = pool.filter((hero) => !takenNames.has(hero.name))
  if (candidates.length === 0) {
    return null
  }

  const hero = pick(candidates, random)
  const { name, heroClass, heroId } = hero
  const startingArmy = startingArmyOf(hero, heroClasses)
  return {
    ...(heroId ? { heroId } : {}),
    name,
    heroClass,
    role: isReplacement ? TAVERN_ROLE_REPLACEMENT : TAVERN_ROLE_WEEK_START,
    army: isReplacement ? rollReplacementArmy(startingArmy) : rollStartingArmy(startingArmy, random)
  }
}

// The game's heroes, then the ones the scenario started with: a hero who leaves the map can be
// hired again.
export function heroPool(heroes, startingHeroes) {
  const pool = Object.values(heroes ?? {})
  const names = new Set(pool.map(({ name }) => name))
  return [...pool, ...startingHeroes.filter(({ name }) => !names.has(name))]
}

// A hero who left the map is offered as the same hero: the pool's entry carries their id.
export function withHeroesWhoLeft(pool, heroesWhoLeft) {
  const idsByName = new Map(heroesWhoLeft.map(({ id, name }) => [name, id]))
  return pool.map((hero) =>
    idsByName.has(hero.name) ? { ...hero, heroId: idsByName.get(hero.name) } : hero
  )
}

export function isBackFromBattle({ role }) {
  return role === TAVERN_ROLE_RETREATED || role === TAVERN_ROLE_SURRENDERED
}

// A player started as the town type of their first town in the scenario, or with none, of their
// first hero's class.
export function startingTownTypes({ towns, heroes, heroClasses }) {
  const types = {}
  for (const { owner, type } of towns) {
    types[owner] ??= type
  }
  for (const { owner, heroClass } of heroes) {
    types[owner] ??= heroClasses?.[heroClass]?.town
  }
  return types
}

// The week's left-most hero is of the town type the player started as, while one is free.
function poolForSlot({ pool, heroClasses, takenNames, slot, isReplacement, startingTownType }) {
  if (slot > 0 || isReplacement || !startingTownType) {
    return pool
  }
  const ofStartingType = pool.filter(
    ({ name, heroClass }) =>
      !takenNames.has(name) && heroClasses?.[heroClass]?.town === startingTownType
  )
  return ofStartingType.length > 0 ? ofStartingType : pool
}

// Heroes on the map are never offered. `kept` holds the heroes still offered, null where a new one
// is needed; a hero filling the place of one just hired is a replacement.
export function rollHeroesForHire({
  pool,
  heroClasses,
  heroNamesOnMap,
  kept,
  isReplacement,
  startingTownType,
  random
}) {
  const takenNames = new Set([...heroNamesOnMap, ...kept.filter(Boolean).map(({ name }) => name)])
  return kept.map((hero, slot) => {
    if (hero) {
      return hero
    }

    const rolled = rollHeroForHire({
      pool: poolForSlot({ pool, heroClasses, takenNames, slot, isReplacement, startingTownType }),
      heroClasses,
      takenNames,
      isReplacement,
      random
    })
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

// An empty slot is taken first; offers saved before heroes had roles were rolled at the week's start.
function rankOf(hero) {
  if (!hero) {
    return -1
  }
  const rank = ROLE_RANKS.indexOf(hero.role)
  return rank === -1 ? ROLE_RANKS.indexOf(TAVERN_ROLE_WEEK_START) : rank
}

// Between two heroes worth the same, the roll picks the slot.
export function slotForReturningHero(heroes, roll) {
  const left = rankOf(heroes[0])
  const right = rankOf(heroes[1])
  if (left !== right) {
    return left < right ? 0 : 1
  }
  return roll < 0.5 ? 0 : 1
}

export function offerWithReturningHero(heroes, hero, roll) {
  const offered = Array.from({ length: HEROES_FOR_HIRE }, (_slot, index) => heroes?.[index] ?? null)
  const slot = slotForReturningHero(offered, roll)
  return offered.map((offeredHero, index) => (index === slot ? hero : offeredHero))
}

export function describeHeroForHire({ name, heroClass, level = 1, artifacts }, heroClasses) {
  const className = heroClasses?.[heroClass]?.name ?? heroClass
  return `${name} is a level ${level} ${className} with ${countArtifacts(artifacts)} artifacts.`
}

function canAfford(resources, cost) {
  return Object.entries(cost ?? {}).every(([type, amount]) => (resources[type] ?? 0) >= amount)
}

export function canHire({ resources, cost, heroCount, isHeroInTown }) {
  return canAfford(resources, cost) && heroCount < MAX_HEROES_PER_PLAYER && !isHeroInTown
}
