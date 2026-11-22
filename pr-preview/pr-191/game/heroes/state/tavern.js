import { calendarDateOfTurn, DAYS_PER_WEEK } from '../calendar.js'
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

// A hero who left a battle in another player's turn on the week's last day waits on into the new
// week; the other slot is rolled when the first tavern is opened.
function startNewWeek(tavern) {
  return Object.entries(tavern).reduce(
    (week, [player, { stayingHero }]) =>
      stayingHero ? returnToTavern(week, { player, ...stayingHero }) : week,
    {}
  )
}

function goToTavern(tavern, { afterOwnTurn, ...detail }) {
  const returned = returnToTavern(tavern, detail)
  if (!afterOwnTurn || calendarDateOfTurn(detail.turnNumber).day !== DAYS_PER_WEEK) {
    return returned
  }
  const { player, ...stayingHero } = detail
  return { ...returned, [player]: { ...returned[player], stayingHero } }
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
    'fact.hero.wentToTavern': goToTavern,
    'fact.turn.ended': (tavern, { turnNumber }) =>
      calendarDateOfTurn(turnNumber).day === 1 ? startNewWeek(tavern) : tavern
  }
}

export function tavernOf(state, player) {
  return state.tavern[player] ?? null
}
