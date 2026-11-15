import { calendarDateOfTurn } from '../calendar.js'
import { offerWithReturningHero } from '../tavern.js'

// A hero who comes back before any tavern was opened this week waits beside an empty slot, which
// the first tavern opened fills with a hero of the week.
function returnToTavern(tavern, { player, roll, ...hero }) {
  const offer = tavern[player]
  return {
    ...tavern,
    [player]: {
      heroes: offerWithReturningHero(offer?.heroes, hero, roll),
      rumour: offer?.rumour ?? null,
      ...(offer && !offer.unrolled ? {} : { unrolled: true })
    }
  }
}

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
    'fact.hero.wentToTavern': returnToTavern,
    'fact.turn.ended': (tavern, { turnNumber }) =>
      calendarDateOfTurn(turnNumber).day === 1 ? {} : tavern
  }
}

export function tavernOf(state, player) {
  return state.tavern[player] ?? null
}
