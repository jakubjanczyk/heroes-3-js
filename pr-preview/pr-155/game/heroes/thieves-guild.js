import { countArtifacts } from './artifacts.js'

const PLACES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']

const sumOf = (resources, types) =>
  types.reduce((total, type) => total + (resources?.[type] ?? 0), 0)

const armyStrength = (army, monsters) =>
  (army ?? [])
    .filter(Boolean)
    .reduce((total, { creature, count }) => total + count * (monsters?.[creature]?.aiValue ?? 0), 0)

const RANKED_ROWS = [
  { name: 'Number of Towns', taverns: 0, value: (kingdom) => kingdom.towns },
  { name: 'Number of Heroes', taverns: 0, value: (kingdom) => kingdom.heroes.length },
  { name: 'Gold', taverns: 2, value: (kingdom) => sumOf(kingdom.resources, ['GOLD_PILE']) },
  {
    name: 'Wood & Ore',
    taverns: 2,
    value: (kingdom) => sumOf(kingdom.resources, ['WOOD_PILE', 'ORE_PILE'])
  },
  {
    name: 'Merc, Sulf, Cryst & Gems',
    taverns: 3,
    value: (kingdom) =>
      sumOf(kingdom.resources, ['MERCURY_PILE', 'SULFUR_PILE', 'CRYSTAL_PILE', 'GEMS_PILE'])
  },
  // No obelisks are on the map yet, so every player has found none.
  { name: 'Obelisks Found', taverns: 3, value: () => 0 },
  {
    name: 'Artifacts',
    taverns: 4,
    value: (kingdom) =>
      kingdom.heroes.reduce((total, hero) => total + countArtifacts(hero.artifacts), 0)
  },
  {
    name: 'Kingdom Army Strength',
    taverns: 4,
    value: (kingdom, monsters) =>
      kingdom.heroes.reduce((total, hero) => total + armyStrength(hero.army, monsters), 0)
  },
  { name: 'Income', taverns: 5, value: (kingdom) => kingdom.income }
]

const BEST_HERO_TAVERNS = 1
const BEST_HERO_SKILLS_TAVERNS = 2
const PERSONALITY_TAVERNS = 3
const BEST_MONSTER_TAVERNS = 4
const HUMAN_PERSONALITY = 'Human'

// Players with the same value share a place; the next value takes the next place.
export function rankPlayers(values) {
  const distinct = [...new Set(values.map(({ value }) => value))].sort((a, b) => b - a)
  return distinct.map((value) =>
    values.filter((entry) => entry.value === value).map(({ player }) => player)
  )
}

function bestHeroOf(heroes) {
  return heroes.reduce(
    (best, hero) =>
      !best ||
      hero.level > best.level ||
      (hero.level === best.level && hero.experience > best.experience)
        ? hero
        : best,
    null
  )
}

function bestMonsterOf(heroes, monsters) {
  const creatures = heroes.flatMap((hero) => (hero.army ?? []).filter(Boolean))
  const best = creatures.reduce(
    (strongest, { creature }) =>
      !strongest || (monsters?.[creature]?.aiValue ?? 0) > (monsters?.[strongest]?.aiValue ?? 0)
        ? creature
        : strongest,
    null
  )
  return best && (monsters?.[best]?.name ?? best)
}

function describeBestHero(hero, taverns) {
  if (!hero) {
    return null
  }
  return {
    name: hero.name,
    skills: taverns >= BEST_HERO_SKILLS_TAVERNS ? hero.skills : []
  }
}

function playerBoxes(kingdoms, taverns, needed, describe) {
  return taverns >= needed
    ? kingdoms.map((kingdom) => ({ player: kingdom.player, ...describe(kingdom) }))
    : null
}

export function thievesGuildReport({ kingdoms, taverns, monsters }) {
  return {
    places: PLACES.slice(0, kingdoms.length),
    rankings: RANKED_ROWS.map(({ name, taverns: needed, value }) => ({
      name,
      places:
        taverns >= needed
          ? rankPlayers(
              kingdoms.map((kingdom) => ({
                player: kingdom.player,
                value: value(kingdom, monsters)
              }))
            )
          : null
    })),
    bestHeroes: playerBoxes(kingdoms, taverns, BEST_HERO_TAVERNS, (kingdom) => ({
      hero: describeBestHero(bestHeroOf(kingdom.heroes), taverns)
    })),
    personalities: playerBoxes(kingdoms, taverns, PERSONALITY_TAVERNS, (kingdom) => ({
      personality: kingdom.isHuman ? HUMAN_PERSONALITY : ''
    })),
    bestMonsters: playerBoxes(kingdoms, taverns, BEST_MONSTER_TAVERNS, (kingdom) => ({
      monster: bestMonsterOf(kingdom.heroes, monsters)
    }))
  }
}
