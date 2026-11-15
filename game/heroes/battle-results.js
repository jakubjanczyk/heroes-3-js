import { describeStack } from './hero-army.js'

export const BATTLE_OUTCOME_WON = 'won'
export const BATTLE_OUTCOME_LOST = 'lost'
export const BATTLE_OUTCOME_RETREATED = 'retreated'
export const BATTLE_OUTCOME_SURRENDERED = 'surrendered'

function describeOutcome({ outcome, heroName, experience }) {
  if (outcome === BATTLE_OUTCOME_WON) {
    return [
      'A glorious victory!',
      `For valor in combat, ${heroName} receives ${experience} experience`
    ]
  }

  if (outcome === BATTLE_OUTCOME_RETREATED) {
    return [`The cowardly ${heroName} flees from battle.`]
  }

  if (outcome === BATTLE_OUTCOME_SURRENDERED) {
    return [`${heroName} surrenders to the enemy, and departs in shame.`]
  }

  return [`Your forces suffer a bitter defeat, and ${heroName} abandons your cause.`]
}

// The creatures a side lost, one entry per creature however many stacks it fought in, as Heroes 3
// counts them.
export function getCasualties(battle, side) {
  const lostByCreature = new Map()
  for (const stack of battle.stacks.filter((option) => option.side === side)) {
    const lost = stack.initialCount - stack.count
    if (lost > 0) {
      lostByCreature.set(stack.creature, (lostByCreature.get(stack.creature) ?? 0) + lost)
    }
  }

  return [...lostByCreature].map(([creature, count]) =>
    describeStack({ creature, count }, battle.definitions)
  )
}

// The defender wins whenever the attacker doesn't, retreating or surrendering included.
const defenderOutcome = (outcome) =>
  outcome === BATTLE_OUTCOME_WON ? BATTLE_OUTCOME_LOST : BATTLE_OUTCOME_WON

// What the results window shows: each side with its outcome, the message to the player, who
// plays `playerSide`, and the casualties. The outcome is the attacker's.
export function describeBattleResults({
  battle,
  outcome,
  heroName,
  defenderName,
  experience,
  playerSide = 'attacker'
}) {
  const won = outcome === BATTLE_OUTCOME_WON
  const message =
    playerSide === 'defender'
      ? { outcome: defenderOutcome(outcome), heroName: defenderName, experience }
      : { outcome, heroName, experience }
  return {
    attacker: { name: heroName, outcome: won ? 'Victorious' : 'Defeated' },
    defender: {
      name: defenderName,
      outcome: won ? 'Defeated' : 'Victorious'
    },
    messages: describeOutcome(message),
    casualties: {
      attacker: getCasualties(battle, 'attacker'),
      defender: getCasualties(battle, 'defender')
    }
  }
}
