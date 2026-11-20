// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  attackMonsterAt,
  confirmTileClickByDispatch,
  expectHeroAt,
  getDwellingEntity,
  getHeroEntity,
  getMineEntity,
  readOwnerFlags
} from './adventure-map.utils.js'
import {
  answerMessage,
  clickEndTurn,
  expectCalendarDate,
  getHeroInfoBox,
  getTownInTownList,
  queryGameEndWindow,
  readGameEndScore,
  readKingdomOverviewFlags,
  readMessage,
  readMessagePictures,
  restartGame
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  createWindowWithReloadSpy,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  clickBattleButton,
  closeBattleResults,
  LOWEST_ROLLS,
  reloadBattle,
  startBattle,
  waitForBattleResults
} from './battle.utils.js'
import { ARMY_THAT_WINS, aDwelling, aHero, aMine, aMonster, aScenario, aTown } from './builders.js'
import {
  enterTownAt,
  openTavern,
  openThievesGuild,
  readThievesGuildPlaces
} from './town-screen.utils.js'

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  mines: readGameData('mines.json'),
  dwellings: readGameData('dwellings.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json'),
  scoreRanks: readGameData('score-ranks.json')
}

const VANQUISHED_BLUE = 'Blue has been vanquished!'
const VICTORY = 'Congratulations! All your enemies have been defeated! Victory is yours!'

const stack = (creature, count) => ({ creature, count })

// The red hero stands at the bottom left with blue's hero next to it. Beating its one Pikeman
// gives 510 experience, short of the next level, so no level-up window comes in between.
const aRedHero = () => aHero().withName('Lord Haart').withArmy(ARMY_THAT_WINS).at(0, 5)
const aBlueHero = () =>
  aHero()
    .withId('hero-2')
    .withName('Valeska')
    .ownedBy('blue')
    .withArmy([stack('PIKEMAN', 1)])
const aTanHero = () =>
  aHero()
    .withId('hero-3')
    .withName('Edric')
    .ownedBy('tan')
    .withArmy([stack('PIKEMAN', 1)])

// Towns stand with their gates in row 2, covering the two rows above and two tiles either side.
const aBlueTown = () => aTown().withId('blue-town').named('Kirkwall').ownedBy('blue').at(14, 2)
const aWhitemoon = () =>
  aTown().withId('red-town').named('Whitemoon').ownedByPlayer().withBuildings(['TAVERN']).at(4, 2)

const aGame = (...entities) =>
  aScenario()
    .withSize(20, 6)
    .withEntities(...entities)
    .withDefinitions(definitions)
    .withStandardVictoryAndLoss()

// Blue has only the hero next to the red hero.
const aLastBlueHero = (...others) => aGame(aRedHero(), aBlueHero().at(1, 5), ...others)

async function beatBlueHero(scenario, options) {
  const app = await startBattle(scenario, options)
  await clickBattleButton(app.user, 'Auto combat')
  await waitForBattleResults()
  await closeBattleResults(app.user)
  return app
}

async function beatTheLastEnemy(scenario, options) {
  const app = await beatBlueHero(scenario, options)
  await answerMessage(app.user, 'OK')
  await answerMessage(app.user, 'OK')
  return app
}

const readTheMessage = () => ({ message: readMessage(), pictures: readMessagePictures() })

describe('victory behavior', () => {
  describe('a player vanquished', () => {
    test('beating the last hero of a player with no town shows that player is vanquished, with their flag', async () => {
      await beatBlueHero(aLastBlueHero())

      expect(readTheMessage()).toEqual({
        message: VANQUISHED_BLUE,
        pictures: ['Blue player flag']
      })
    })

    test('taking the last town of a player with no hero shows that player is vanquished', async () => {
      await setupMovementBehaviorApp({
        loadGameOptions: aGame(aRedHero().at(14, 3), aBlueTown(), aTanHero().at(19, 5)).build()
      })

      await enterTownAt(14, 2)

      expect(readTheMessage()).toEqual({
        message: VANQUISHED_BLUE,
        pictures: ['Blue player flag']
      })
    })

    test('beating the last hero of a player who still has a town shows no message', async () => {
      await beatBlueHero(aLastBlueHero(aBlueTown()))

      await waitMs()

      expect({ message: readMessage(), window: queryGameEndWindow('Victorious') }).toEqual({
        message: null,
        window: null
      })
    })

    test('taking the last town of a player who still has a hero shows no message', async () => {
      await setupMovementBehaviorApp({
        loadGameOptions: aGame(aRedHero().at(14, 3), aBlueTown(), aBlueHero().at(19, 5)).build()
      })

      await enterTownAt(14, 2)

      expect(readMessage()).toBeNull()
    })

    test("a vanquished player's mines and dwellings lose their flag", async () => {
      const { user } = await beatBlueHero(
        aLastBlueHero(
          aMine().ownedBy('blue').at(8, 2),
          aDwelling().ownedBy('blue').at(12, 2),
          aTanHero().at(19, 5)
        )
      )

      await answerMessage(user, 'OK')

      expect({
        mine: readOwnerFlags(getMineEntity()),
        dwelling: readOwnerFlags(getDwellingEntity())
      }).toEqual({ mine: [], dwelling: [] })
    })

    test('a vanquished player is not shown under Enemies in the kingdom overview', async () => {
      const { user } = await beatBlueHero(aLastBlueHero(aTanHero().at(19, 5)))
      await answerMessage(user, 'OK')

      await user.click(getHeroInfoBox())

      expect(readKingdomOverviewFlags().enemies).toEqual(['Tan player flag'])
    })

    test("a vanquished player is not ranked in the Thieves' Guild", async () => {
      const { user } = await beatBlueHero(aLastBlueHero(aWhitemoon(), aTanHero().at(19, 5)))
      await answerMessage(user, 'OK')

      await user.dblClick(getTownInTownList('Whitemoon'))
      await openTavern(user)
      await openThievesGuild(user)

      expect(readThievesGuildPlaces()).toEqual(['1st', '2nd'])
    })
  })

  describe('the last enemy vanquished', () => {
    test('the player sees the victory message with their flag after the vanquished one', async () => {
      const { user } = await beatBlueHero(aLastBlueHero())

      await answerMessage(user, 'OK')

      expect(readTheMessage()).toEqual({ message: VICTORY, pictures: ['Red player flag'] })
    })

    test('after the victory message the Victorious window opens', async () => {
      await beatTheLastEnemy(aLastBlueHero())

      expect(queryGameEndWindow('Victorious')).not.toBeNull()
    })

    test("with tan still in the game, vanquishing blue doesn't end it", async () => {
      const { user } = await beatBlueHero(aLastBlueHero(aTanHero().at(19, 5)))

      await answerMessage(user, 'OK')

      expect({ message: readMessage(), window: queryGameEndWindow('Victorious') }).toEqual({
        message: null,
        window: null
      })
    })

    test('the map does nothing under the Victorious window: the hero stays and the day goes on', async () => {
      const { user } = await beatTheLastEnemy(aLastBlueHero())

      confirmTileClickByDispatch(3, 5)
      await waitMs()
      await clickEndTurn(user)

      expectHeroAt(0, 5)
      expectCalendarDate({ month: 1, week: 1, day: 1 })
    })

    test('Restart starts the scenario again', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aLastBlueHero()
      const { envWindow, reloadCalls } = createWindowWithReloadSpy()
      const { user } = await beatTheLastEnemy(scenario, { eventLog, envWindow })

      await restartGame(user, 'Victorious')
      await setupMovementBehaviorApp({ loadGameOptions: scenario.build(), eventLog })

      expect({
        reloads: reloadCalls.length,
        window: queryGameEndWindow('Victorious'),
        blueHero: getHeroEntity('hero-2') !== null
      }).toEqual({ reloads: 1, window: null, blueHero: true })
    })

    test('after a reload the Victorious window is open again, with no message', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aLastBlueHero()
      await beatTheLastEnemy(scenario, { eventLog })

      await reloadBattle(scenario, { eventLog })
      await waitMs()

      expect({ window: queryGameEndWindow('Victorious') !== null, message: readMessage() }).toEqual(
        { window: true, message: null }
      )
    })

    test('a scenario with no other player is not won when a monster is beaten', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aGame(aRedHero(), aMonster().at(1, 5)).build(),
        appConfig: { random: LOWEST_ROLLS }
      })

      await attackMonsterAt(1, 5)
      await clickBattleButton(user, 'Auto combat')
      await waitForBattleResults()
      await closeBattleResults(user)
      await waitMs()

      expect({ message: readMessage(), window: queryGameEndWindow('Victorious') }).toEqual({
        message: null,
        window: null
      })
    })
  })

  describe('the score', () => {
    const aRedTown = (id, x) => aTown().withId(id).ownedByPlayer().at(x, 2)
    // Red owns Whitemoon and the towns given; blue has only Kirkwall, next to the red hero.
    const aLastBlueTown = (...redTowns) =>
      aScenario()
        .withSize(36, 6)
        .withEntities(aRedHero().at(14, 3), aWhitemoon(), aBlueTown(), ...redTowns)
        .withDefinitions(definitions)
        .withStandardVictoryAndLoss()

    async function captureTheLastTown(scenario, { daysFirst = 0, eventLog } = {}) {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: scenario.build(),
        eventLog
      })
      for (let day = 1; day <= daysFirst; day++) {
        await clickEndTurn(user)
        await waitMs(2000)
      }
      await enterTownAt(14, 2)
      await answerMessage(user, 'OK')
      await answerMessage(user, 'OK')
    }

    // Base score: 200 − (day + 10) / (towns + 5), the remainder dropped, + 25 with every enemy out.
    test.each([
      { days: 1, towns: 2, extraTowns: [], score: '224', rank: 'Pegasus' },
      { days: 4, towns: 2, extraTowns: [], score: '223', rank: 'Medusa' },
      {
        days: 4,
        towns: 4,
        extraTowns: [aRedTown('red-3', 22), aRedTown('red-4', 30)],
        score: '224',
        rank: 'Pegasus'
      }
    ])('winning on day $days owning $towns towns scores $score', async ({
      days,
      extraTowns,
      score,
      rank
    }) => {
      await captureTheLastTown(aLastBlueTown(...extraTowns), { daysFirst: days - 1 })

      expect(readGameEndScore('Victorious')).toEqual({
        'Total Time': String(days),
        'Base Score': score,
        'Difficulty Level': 'Normal',
        'Final Score': score,
        'Your Rank': rank
      })
    })

    test('after a reload the Victorious window shows the same score', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aLastBlueTown()
      await captureTheLastTown(scenario, { eventLog })

      await setupMovementBehaviorApp({ loadGameOptions: scenario.build(), eventLog })
      await waitMs()

      expect(readGameEndScore('Victorious')).toEqual({
        'Total Time': '1',
        'Base Score': '224',
        'Difficulty Level': 'Normal',
        'Final Score': '224',
        'Your Rank': 'Pegasus'
      })
    })
  })
})
