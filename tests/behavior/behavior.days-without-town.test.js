// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { getHeroEntity } from './adventure-map.utils.js'
import {
  answerMessage,
  clickEndTurn,
  endTurns,
  expectCalendarDate,
  getTownInTownList,
  queryGameEndWindow,
  readMessage,
  readMessagePictures
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  clickBattleButton,
  closeBattleResults,
  LOWEST_ROLLS,
  waitForBattleResults
} from './battle.utils.js'
import { ARMY_THAT_WINS, aHero, aScenario, aTown } from './builders.js'
import { enterTownAt, leaveTown, openTavern, readHeroesForHire } from './town-screen.utils.js'

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  // No other heroes, so a tavern offers only the scenario's heroes not on the map.
  heroes: {},
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const COMPUTER_TURN_MS = 2000
const daysLeft = (days) =>
  `Red, you only have ${days} days left to capture a town or you will be banished from this land.`
const LAST_DAY =
  'Red, this is your last day to capture a town or you will be banished from this land.'
const RED_BANISHED = 'Red, your heroes abandon you, and you are banished from this land.'
const BLUE_BANISHED = "Blue's heroes have abandoned him, and he is banished from this land."
const VICTORY = 'Congratulations! All your enemies have been defeated! Victory is yours!'

const stack = (creature, count) => ({ creature, count })

const aGame = (...entities) =>
  aScenario()
    .withSize(30, 6)
    .withEntities(...entities)
    .withDefinitions(definitions)
    .withStandardVictoryAndLoss()

const aRedHero = () => aHero().withName('Lord Haart').withArmy(ARMY_THAT_WINS).at(0, 5)
const aBlueHero = () =>
  aHero()
    .withId('hero-2')
    .withName('Valeska')
    .ownedBy('blue')
    .withArmy([stack('PIKEMAN', 1)])

// Towns stand with their gates in row 2, covering the two rows above and two tiles either side.
const aWhitemoon = () =>
  aTown().withId('red-town').named('Whitemoon').ownedByPlayer().withBuildings(['TAVERN']).at(4, 2)

const readTheMessage = () => ({ message: readMessage(), pictures: readMessagePictures() })

async function startGame(scenario, options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { random: LOWEST_ROLLS },
    ...options
  })
}

// Ends the player's turn and lets the computer players take theirs.
async function endDay(user) {
  await clickEndTurn(user)
  await waitMs(COMPUTER_TURN_MS)
}

describe('days without a town behavior', () => {
  describe('the days left', () => {
    test("after blue's hero takes the player's last town, the player's next turn starts with 7 days left and the red flag", async () => {
      const { user } = await startGame(
        aGame(
          aRedHero(),
          aTown().withId('red-town').named('Whitemoon').ownedByPlayer().at(20, 2),
          aBlueHero().at(20, 5)
        )
      )

      await endDay(user)

      expect(readTheMessage()).toEqual({ message: daysLeft(7), pictures: ['Red player flag'] })
    })

    test('a player starting with no town sees no message on day 1', async () => {
      await startGame(aGame(aRedHero()))
      await waitMs()

      expect(readMessage()).toBeNull()
    })

    test('a player starting with no town sees 6 days left on day 2', async () => {
      const { user } = await startGame(aGame(aRedHero()))

      await endDay(user)

      expect(readMessage()).toBe(daysLeft(6))
    })

    test('the days left go down by one each day', async () => {
      const { user } = await startGame(aGame(aRedHero()))
      await endDay(user)
      await answerMessage(user, 'OK')

      await endDay(user)

      expect(readMessage()).toBe(daysLeft(5))
    })

    test('on the seventh day the message says it is the last day to capture a town', async () => {
      const { user } = await startGame(aGame(aRedHero()))
      await endTurns(user, 5)

      await endDay(user)

      expect(readMessage()).toBe(LAST_DAY)
    })

    test('a player who owns a town sees no message at the start of the day', async () => {
      const { user } = await startGame(aGame(aRedHero(), aWhitemoon()))

      await endDay(user)

      expect(readMessage()).toBeNull()
    })

    test('capturing a town stops the messages', async () => {
      const { user } = await startGame(
        aGame(aRedHero().at(4, 3), aTown().withId('town-1').named('Whitemoon').at(4, 2))
      )
      await endDay(user)
      await answerMessage(user, 'OK')
      await enterTownAt(4, 2)
      await leaveTown(user)

      await endDay(user)

      expect(readMessage()).toBeNull()
    })

    // Red's Lord Haart captures the neutral town on day 2 and stays in it. Blue's Pikemen, too
    // slow to reach it on day 1, beat him there on day 2 and take the town. Red's Sir Mullich,
    // walled in by rock, keeps red in the game.
    test('after capturing a town and losing it again, the count starts again from 7 days', async () => {
      const { user } = await startGame(
        aGame(
          aHero()
            .withName('Lord Haart')
            .withArmy([stack('PIKEMAN', 1)])
            .at(4, 3),
          aHero().withId('hero-3').withName('Sir Mullich').at(28, 0),
          aTown().withId('town-1').named('Whitemoon').at(4, 2),
          aBlueHero()
            .withArmy([stack('PIKEMAN', 50)])
            .at(29, 5)
        ).withRockAround(28, 0)
      )
      await endDay(user)
      await answerMessage(user, 'OK')
      await enterTownAt(4, 2)
      await leaveTown(user)

      await endDay(user)
      await clickBattleButton(user, 'Auto combat')
      await waitForBattleResults()
      await closeBattleResults(user)
      await waitMs(COMPUTER_TURN_MS)

      expect(readMessage()).toBe(daysLeft(7))
    })

    test('after a reload the next day goes on counting from where it was', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aGame(aRedHero())
      const { user: firstUser } = await startGame(scenario, { eventLog })
      await endDay(firstUser)
      await answerMessage(firstUser, 'OK')

      const { user } = await startGame(scenario, { eventLog })
      await endDay(user)

      expect(readMessage()).toBe(daysLeft(5))
    })

    test('after a reload at the start of a turn the message is not shown again', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aGame(aRedHero())
      const { user } = await startGame(scenario, { eventLog })
      await endDay(user)

      await startGame(scenario, { eventLog })
      await waitMs()

      expect(readMessage()).toBeNull()
    })
  })

  describe('the player banished', () => {
    async function liveTheLastDay() {
      const app = await startGame(aGame(aRedHero()))
      await endTurns(app.user, 6)
      return app
    }

    test('ending the last day without a town shows that the heroes abandon the player, with the red flag', async () => {
      const { user } = await liveTheLastDay()

      await endDay(user)

      expect(readTheMessage()).toEqual({ message: RED_BANISHED, pictures: ['Red player flag'] })
    })

    test("after that message the Defeated window opens, with the player's hero still on the map", async () => {
      const { user } = await liveTheLastDay()
      await endDay(user)

      await answerMessage(user, 'OK')

      expect({
        window: queryGameEndWindow('Defeated') !== null,
        hero: getHeroEntity('hero-1') !== null
      }).toEqual({ window: true, hero: true })
    })

    test('the day does not move on to a new week once the player is banished', async () => {
      const { user } = await liveTheLastDay()
      await endDay(user)

      await answerMessage(user, 'OK')

      expect(readMessage()).toBeNull()
      expectCalendarDate({ month: 1, week: 1, day: 7 })
    })
  })

  describe('a computer player banished', () => {
    // Blue's hero is walled in by rock, so it takes its turns without going anywhere. Tan keeps a
    // town, so blue going out doesn't end the game.
    const aBlueWithoutTown = (...others) =>
      aGame(aWhitemoon(), aBlueHero().at(20, 5), ...others).withRockAround(20, 5)
    const aTanTown = () => aTown().withId('tan-town').named('Kirkwall').ownedBy('tan').at(12, 2)

    async function liveSevenDays(scenario) {
      const app = await startGame(scenario)
      for (let day = 1; day < 7; day += 1) {
        await endDay(app.user)
      }
      await endDay(app.user)
      return app
    }

    test('blue ending its seventh turn without a town shows that blue is banished, with the blue flag', async () => {
      await liveSevenDays(aBlueWithoutTown(aTanTown()))

      expect(readTheMessage()).toEqual({ message: BLUE_BANISHED, pictures: ['Blue player flag'] })
    })

    test("a banished blue's heroes leave the map", async () => {
      const { user } = await liveSevenDays(aBlueWithoutTown(aTanTown()))

      await answerMessage(user, 'OK')

      expect(getHeroEntity('hero-2')).toBeNull()
    })

    test("a banished blue's hero can be offered in the player's tavern", async () => {
      const { user } = await liveSevenDays(aBlueWithoutTown(aTanTown()))
      await answerMessage(user, 'OK')
      await waitMs(COMPUTER_TURN_MS)

      await user.dblClick(getTownInTownList('Whitemoon'))
      await openTavern(user)

      expect(readHeroesForHire()).toContain('Valeska')
    })

    test('banishing the last enemy shows the victory message after it', async () => {
      const { user } = await liveSevenDays(aBlueWithoutTown())

      await answerMessage(user, 'OK')

      expect(readTheMessage()).toEqual({ message: VICTORY, pictures: ['Red player flag'] })
    })
  })
})
