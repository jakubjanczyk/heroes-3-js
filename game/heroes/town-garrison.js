import { ARMY_SLOT_COUNT } from './hero-army.js'
import { fortLevelOf } from './town-buildings.js'

export const BATTLE_DEFENDER_TOWN_GARRISON = 'TOWN_GARRISON'

// Taking a town with walls is a siege, which is worth this much more experience to the winner.
const SIEGE_EXPERIENCE = 500

export const hasCreatures = (garrison) => (garrison ?? []).some(Boolean)

export function townCaptureExperience(built) {
  return fortLevelOf(built) > 0 ? SIEGE_EXPERIENCE : 0
}

// The garrison fights beside the hero defending its town, each stack in one of the hero's free
// slots; the stacks that find none stay out of the battle. `fromGarrison` maps an army slot to
// the garrison slot its stack came from.
export function joinGarrison(heroArmy, garrison) {
  const army = Array.from({ length: ARMY_SLOT_COUNT }, (_, index) => heroArmy?.[index] ?? null)
  const fromGarrison = {}
  ;(garrison ?? []).forEach((stack, garrisonSlot) => {
    const freeSlot = army.indexOf(null)
    if (stack && freeSlot >= 0) {
      army[freeSlot] = stack
      fromGarrison[freeSlot] = garrisonSlot
    }
  })
  return { army, fromGarrison }
}

// After the battle each survivor goes back where it came from.
export function splitGarrison({ armyAfter, heroArmy, garrison, fromGarrison }) {
  const garrisonAfter = [...(garrison ?? [])]
  for (const [armySlot, garrisonSlot] of Object.entries(fromGarrison)) {
    garrisonAfter[garrisonSlot] = armyAfter[armySlot]
  }
  const hero = armyAfter
    .map((stack, slot) => (slot in fromGarrison ? null : stack))
    .slice(0, heroArmy.length)
  return { heroArmy: hero, garrison: garrisonAfter }
}
