import { describeCreatureGrowth, growthWithFortBonus } from './creature-growth.js'
import { ARMY_SLOT_COUNT } from './hero-army.js'
import { fortLevelOf, fortNameOf } from './town-buildings.js'
import { buildingsInEffect } from './town-income.js'

function findDwellingOfTier(dwellings, monsters, tier) {
  return dwellings.find((building) => monsters?.[building?.creature]?.tier === tier) ?? null
}

function describeCard({ tier, dwelling, creature, available, growth, canRecruit }) {
  const { namePlural, name, attack, defense, damage, health, speed } = creature
  return {
    tier,
    name: namePlural ?? name,
    dwelling: dwelling.name,
    available,
    stats: { attack, defense, damage, health, speed, growth },
    canRecruit
  }
}

// The Fort window, as in Heroes 3: titled after the town's fort, with a card for each tier, the
// standing dwelling's creature (the upgraded one once its upgrade stands) with how many are
// available. A tier with no dwelling shows the plain dwelling and creature, none to recruit, and
// the growth it would have once built. null when the town has no Fort.
export function describeFort({ buildings, built, monsters, available, flaggedDwellings = {} }) {
  const name = fortNameOf({ buildings, built })
  if (!name) {
    return null
  }

  const growthByTier = describeCreatureGrowth({ buildings, built, monsters, flaggedDwellings })
  const standing = buildingsInEffect({ buildings, built }).map(
    (buildingId) => buildings[buildingId]
  )
  const plainDwellings = Object.values(buildings).filter((building) => !building?.upgrades)

  const cards = Array.from({ length: ARMY_SLOT_COUNT }, (_, index) => {
    const tier = index + 1
    const dwelling = findDwellingOfTier(standing, monsters, tier)
    if (dwelling) {
      return describeCard({
        tier,
        dwelling,
        creature: monsters[dwelling.creature],
        available: available[index] ?? 0,
        growth: growthByTier[index].growth,
        canRecruit: true
      })
    }

    const plainDwelling = findDwellingOfTier(plainDwellings, monsters, tier)
    if (!plainDwelling) {
      return null
    }

    const creature = monsters[plainDwelling.creature]
    return describeCard({
      tier,
      dwelling: plainDwelling,
      creature,
      available: 0,
      growth:
        growthWithFortBonus({ buildings, built, creature }) +
        (flaggedDwellings[plainDwelling.creature] ?? 0),
      canRecruit: false
    })
  })

  return { name, level: fortLevelOf(built), cards: cards.filter(Boolean) }
}
