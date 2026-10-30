import { calendarDateOfTurn } from '../calendar.js'

// What each player's taverns offer: { [player]: { heroes, rumour } }. A new week sends the heroes
// away; the next tavern opened rolls new ones.
export const tavernSlice = {
  key: 'tavern',
  initial: () => ({}),
  on: {
    'fact.tavern.heroesOffered': (tavern, { player, heroes, rumour }) => ({
      ...tavern,
      [player]: { heroes, rumour }
    }),
    'fact.turn.ended': (tavern, { turnNumber }) =>
      calendarDateOfTurn(turnNumber).day === 1 ? {} : tavern
  }
}

export function tavernOf(state, player) {
  return state.tavern[player] ?? null
}
