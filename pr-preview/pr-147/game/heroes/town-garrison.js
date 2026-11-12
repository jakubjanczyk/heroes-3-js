import { fortLevelOf } from './town-buildings.js'

export const BATTLE_DEFENDER_TOWN_GARRISON = 'TOWN_GARRISON'

// Taking a town with walls is a siege, which is worth this much more experience to the winner.
const SIEGE_EXPERIENCE = 500

export const hasCreatures = (garrison) => (garrison ?? []).some(Boolean)

export function townCaptureExperience(built) {
  return fortLevelOf(built) > 0 ? SIEGE_EXPERIENCE : 0
}
