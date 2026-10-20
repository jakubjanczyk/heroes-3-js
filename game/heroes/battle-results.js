import { describeStack } from './hero-army.js'

export const BATTLE_OUTCOME_WON = 'won'
export const BATTLE_OUTCOME_LOST = 'lost'
export const BATTLE_OUTCOME_RETREATED = 'retreated'

// Wording as remembered from the game, not checked against its text files.
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

// What the results window shows: each side with its outcome, the message and the casualties.
export function describeBattleResults({ battle, outcome, heroName, monster, experience }) {
  const won = outcome === BATTLE_OUTCOME_WON
  return {
    attacker: { name: heroName, outcome: won ? 'Victorious' : 'Defeated' },
    defender: {
      name: describeStack(monster, battle.definitions).name,
      outcome: won ? 'Defeated' : 'Victorious'
    },
    messages: describeOutcome({ outcome, heroName, experience }),
    casualties: {
      attacker: getCasualties(battle, 'attacker'),
      defender: getCasualties(battle, 'defender')
    }
  }
}
