import { ARMY_SLOT_COUNT } from './hero-army.js'
import { buildingsInEffect } from './town-income.js'

// A town's creatures by tier, as the town screen's panel shows them: for each tier with a dwelling,
// the creature it makes (the upgraded one once the upgrade stands) and how many arrive a week;
// null for a tier without one. The Citadel's and Castle's bonus is a share of the
// dwelling's own growth, rounded down, and a horde building (Griffin Bastion) adds a flat number.
export function describeCreatureGrowth({ buildings, built, monsters }) {
  const inEffect = buildingsInEffect({ buildings, built }).map(
    (buildingId) => buildings[buildingId]
  )
  const fortBonusPercent = fortBonusPercentOf(inEffect)
  const tiers = Array.from({ length: ARMY_SLOT_COUNT }, () => null)

  for (const building of inEffect) {
    const creature = monsters?.[building?.creature]
    if (creature) {
      tiers[creature.tier - 1] = {
        creature: building.creature,
        name: creature.namePlural ?? creature.name,
        singularName: creature.name,
        growth: withFortBonus(creature.growth, fortBonusPercent)
      }
    }
  }

  for (const building of inEffect) {
    const tier = tiers[(building?.horde?.tier ?? 0) - 1]
    if (tier) {
      tier.growth += building.horde.amount
    }
  }

  return tiers
}

function fortBonusPercentOf(buildingsStanding) {
  return Math.max(0, ...buildingsStanding.map((building) => building?.creatureGrowthPercent ?? 0))
}

function withFortBonus(growth, fortBonusPercent) {
  return Math.floor((growth * (100 + fortBonusPercent)) / 100)
}

// A creature's weekly growth with the town's Citadel or Castle bonus, as if its dwelling stood.
export function growthWithFortBonus({ buildings, built, creature }) {
  const inEffect = buildingsInEffect({ buildings, built }).map(
    (buildingId) => buildings[buildingId]
  )
  return withFortBonus(creature.growth, fortBonusPercentOf(inEffect))
}
