import { getExperienceForKills } from './battle.js'
import { BATTLE_OUTCOME_LOST } from './battle-results.js'

export const BATTLE_DEFENDER_ENEMY_HERO = 'ENEMY_HERO'

export const DEFEATED_HERO_EXPERIENCE = 500

// The defending hero earns the health of the attacker's creatures it killed, and 500 more only
// for a beaten attacker, not one who retreated or surrendered.
export const defendingHeroExperience = (battle, attackerOutcome) =>
  getExperienceForKills(battle, 'defender') +
  (attackerOutcome === BATTLE_OUTCOME_LOST ? DEFEATED_HERO_EXPERIENCE : 0)
