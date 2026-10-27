import { describeCreatureGrowth } from './creature-growth.js'
import { ARMY_SLOT_COUNT } from './hero-army.js'

// The creatures a town can recruit, by tier: each standing dwelling's creature, the plain one
// before the upgraded one, as the recruit window lists them.
function recruitableCreaturesByTier({ buildings, built, monsters }) {
  const tiers = Array.from({ length: ARMY_SLOT_COUNT }, () => [])
  const dwellings = [...built]
    .map((buildingId) => buildings[buildingId])
    .filter((building) => monsters?.[building?.creature])
    .sort((first, second) => Number(Boolean(first.upgrades)) - Number(Boolean(second.upgrades)))

  for (const { creature } of dwellings) {
    tiers[monsters[creature].tier - 1].push(creature)
  }

  return tiers
}

// How many creatures of the given cost the player's resources pay for.
export function affordableCount(totals, cost = {}) {
  const counts = Object.entries(cost)
    .filter(([, amount]) => amount > 0)
    .map(([resourceType, amount]) => Math.floor((totals?.[resourceType] ?? 0) / amount))
  return Math.max(0, Math.min(...counts))
}

function describeCost(cost = {}, resources = {}) {
  return Object.keys(resources)
    .filter((resourceType) => cost[resourceType] > 0)
    .map((resourceType) => ({
      resource: resources[resourceType].name ?? resourceType,
      amount: cost[resourceType]
    }))
}

export function describeRecruit({ creature, monsters, resources, available, treasury }) {
  const { cost, namePlural, name } = monsters[creature]
  return {
    creature,
    name: namePlural ?? name,
    cost: describeCost(cost, resources),
    maxCount: Math.min(available, affordableCount(treasury, cost))
  }
}

// The town screen's creature panel and recruit window: for each tier with a dwelling, its weekly
// growth, how many are available and the creatures to recruit them as.
export function describeTownCreatures({
  buildings,
  built,
  monsters,
  resources,
  available,
  treasury
}) {
  const recruitable = recruitableCreaturesByTier({ buildings, built, monsters })

  return describeCreatureGrowth({ buildings, built, monsters }).map((tier, index) => {
    if (!tier) {
      return null
    }

    const availableCount = available[index] ?? 0
    return {
      ...tier,
      available: availableCount,
      recruits: recruitable[index].map((creature) =>
        describeRecruit({ creature, monsters, resources, available: availableCount, treasury })
      )
    }
  })
}

// The week of creatures each tier's dwelling makes, 0 for a tier without one.
export function weeklyGrowthByTier({ buildings, built, monsters }) {
  return describeCreatureGrowth({ buildings, built, monsters }).map((tier) => tier?.growth ?? 0)
}

// Recruits join a stack of the same creature, else the first empty slot; null when neither is
// there.
export function addToArmy(army, creature, count) {
  const slots = Array.from({ length: ARMY_SLOT_COUNT }, (_, index) => army?.[index] ?? null)
  const sameCreature = slots.findIndex((stack) => stack?.creature === creature)
  const slot = sameCreature >= 0 ? sameCreature : slots.indexOf(null)
  if (slot < 0) {
    return null
  }

  slots[slot] = { creature, count: (slots[slot]?.count ?? 0) + count }
  return slots
}

export function describeAvailableCreatures({ available, name, singularName, growth }) {
  return `${available} ${available === 1 ? singularName : name} available, +${growth} growth`
}
