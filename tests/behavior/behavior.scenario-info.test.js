// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  answerMessage,
  clickBackInScenarioInfo,
  closeAdventureOptions,
  openAdventureOptions,
  openScenarioInfo,
  queryAdventureOptions,
  queryScenarioInfo,
  readAdventureOptionsButtons,
  readScenarioInfo,
  readScenarioInfoPlayers
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  pressKey,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  clickBattleButton,
  closeBattleResults,
  LOWEST_ROLLS,
  startBattle,
  waitForBattleResults
} from './battle.utils.js'
import { ARMY_THAT_WINS, aHero, aMine, anArtifactDefinition, aScenario, aTown } from './builders.js'

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  mines: readGameData('mines.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json'),
  artifacts: { AXE: anArtifactDefinition().withName("Centaur's Axe").build() }
}

const aRedHero = () => aHero().withName('Lord Haart').at(0, 0)
const aBlueHero = () => aHero().withId('hero-2').withName('Valeska').ownedBy('blue').at(5, 0)
const aRedTown = () => aTown().withId('red-town').named('Steadwick').ownedByPlayer().at(2, 3)
const aBlueTown = () => aTown().withId('blue-town').named('Kirkwall').ownedBy('blue').at(8, 3)

const aGame = (...entities) =>
  aScenario()
    .withSize(20, 4)
    .withName('Island of Fire')
    .withEntities(...entities)
    .withDefinitions(definitions)

const setupApp = (scenario, options = {}) =>
  setupMovementBehaviorApp({ loadGameOptions: scenario.build(), ...options })

async function conditionsOf(scenario) {
  const { user } = await setupApp(scenario)
  await openScenarioInfo(user)
  const { victory, loss } = readScenarioInfo()
  return { victory, loss }
}

describe('scenario info behavior', () => {
  describe('adventure options', () => {
    test('the Adventure options button opens Adventure Options with only View Scenario Info and Okay working', async () => {
      const { user } = await setupApp(aGame(aRedHero()))

      await openAdventureOptions(user)

      expect(readAdventureOptionsButtons()).toEqual([
        { name: 'View World', disabled: true },
        { name: 'View Puzzle', disabled: true },
        { name: 'Dig', disabled: true },
        { name: 'View Scenario Info', disabled: false },
        { name: 'Replay Opponent Turn', disabled: true },
        { name: 'Okay', disabled: false }
      ])
    })

    test('Okay closes Adventure Options', async () => {
      const { user } = await setupApp(aGame(aRedHero()))
      await openAdventureOptions(user)

      await closeAdventureOptions(user)

      expect(queryAdventureOptions()).toBeNull()
    })

    test('Escape closes Adventure Options', async () => {
      const { user } = await setupApp(aGame(aRedHero()))
      await openAdventureOptions(user)

      await pressKey(user, '{Escape}')

      expect(queryAdventureOptions()).toBeNull()
    })
  })

  describe('the scenario', () => {
    test("View Scenario Info shows the scenario's name, map size and description", async () => {
      const { user } = await setupApp(
        aGame(aRedHero()).withDescription('An island wakes up to an earthquake.')
      )

      await openScenarioInfo(user)

      expect(readScenarioInfo()).toMatchObject({
        name: 'Island of Fire',
        mapSize: '20x4',
        mapSizeLetter: '',
        description: 'An island wakes up to an earthquake.'
      })
    })

    test('a scenario without a description shows an empty description', async () => {
      const { user } = await setupApp(aGame(aRedHero()))

      await openScenarioInfo(user)

      expect(readScenarioInfo().description).toBe('')
    })

    test('a small map, 36 tiles wide, shows the letter S', async () => {
      const { user } = await setupApp(aGame(aRedHero()).withSize(36, 36))

      await openScenarioInfo(user)

      expect(readScenarioInfo()).toMatchObject({ mapSize: '36x36', mapSizeLetter: 'S' })
    })

    test('Back returns to Adventure Options', async () => {
      const { user } = await setupApp(aGame(aRedHero()))
      await openScenarioInfo(user)

      await clickBackInScenarioInfo(user)

      expect({ info: queryScenarioInfo(), options: queryAdventureOptions() !== null }).toEqual({
        info: null,
        options: true
      })
    })

    test('Escape returns to Adventure Options', async () => {
      const { user } = await setupApp(aGame(aRedHero()))
      await openScenarioInfo(user)

      await pressKey(user, '{Escape}')

      expect({ info: queryScenarioInfo(), options: queryAdventureOptions() !== null }).toEqual({
        info: null,
        options: true
      })
    })

    test('shows Normal difficulty and a 100% rating', async () => {
      const { user } = await setupApp(aGame(aRedHero()))

      await openScenarioInfo(user)

      expect(readScenarioInfo()).toMatchObject({
        mapDifficulty: 'Normal',
        playerDifficulty: 'Normal',
        rating: '100%'
      })
    })
  })

  describe('the players', () => {
    test('lists each player in colour order with its flag, Player or Computer, starting town and hero', async () => {
      const { user } = await setupApp(
        aGame(
          aBlueHero(),
          aBlueTown(),
          aRedHero(),
          aRedTown(),
          aTown().withId('tan-town').ownedBy('tan').at(14, 3)
        )
      )

      await openScenarioInfo(user)

      expect(readScenarioInfoPlayers()).toEqual([
        { flag: 'Red player flag', name: 'Player', town: 'Castle', hero: 'Lord Haart' },
        { flag: 'Blue player flag', name: 'Computer', town: 'Castle', hero: 'Valeska' },
        { flag: 'Tan player flag', name: 'Computer', town: 'Castle', hero: '' }
      ])
    })

    test('a player with no town or hero shows those cells empty', async () => {
      const { user } = await setupApp(aGame(aRedHero(), aMine().ownedBy('blue').at(6, 2)))

      await openScenarioInfo(user)

      expect(readScenarioInfoPlayers()[1]).toEqual({
        flag: 'Blue player flag',
        name: 'Computer',
        town: '',
        hero: ''
      })
    })

    test("Allies shows the player's flag, Enemies the other players' flags", async () => {
      const { user } = await setupApp(
        aGame(aRedHero(), aBlueHero(), aTown().withId('tan-town').ownedBy('tan').at(14, 3))
      )

      await openScenarioInfo(user)

      expect(readScenarioInfo()).toMatchObject({
        allies: ['Red player flag'],
        enemies: ['Blue player flag', 'Tan player flag']
      })
    })

    describe('a player who is out', () => {
      // Red's hero beats blue's only hero next to it; blue has no town, so it is out, and tan's
      // town keeps the game going.
      const aGameBlueLoses = () =>
        aScenario()
          .withSize(30, 6)
          .withEntities(
            aHero().withName('Lord Haart').withArmy(ARMY_THAT_WINS).at(0, 5),
            aHero()
              .withId('hero-2')
              .withName('Valeska')
              .ownedBy('blue')
              .withArmy([{ creature: 'PIKEMAN', count: 1 }])
              .at(1, 5),
            aTown().withId('red-town').ownedByPlayer().at(4, 2),
            aTown().withId('tan-town').ownedBy('tan').at(26, 2)
          )
          .withDefinitions(definitions)
          .withStandardVictoryAndLoss()

      async function beatBlue(eventLog) {
        const app = await startBattle(aGameBlueLoses(), { random: LOWEST_ROLLS, eventLog })
        await clickBattleButton(app.user, 'Auto combat')
        await waitForBattleResults()
        await closeBattleResults(app.user)
        await answerMessage(app.user, 'OK')
        await waitMs()
        return app
      }

      const shownPlayers = () => ({
        players: readScenarioInfoPlayers().map(({ flag }) => flag),
        enemies: readScenarioInfo().enemies
      })

      test('is left off the players and Enemies', async () => {
        const { user } = await beatBlue()

        await openScenarioInfo(user)

        expect(shownPlayers()).toEqual({
          players: ['Red player flag', 'Tan player flag'],
          enemies: ['Tan player flag']
        })
      })

      test('stays off them after a reload', async () => {
        const eventLog = createMemoryEventLog()
        await beatBlue(eventLog)

        const { user } = await setupMovementBehaviorApp({
          loadGameOptions: aGameBlueLoses().build(),
          eventLog
        })
        await waitMs()
        await openScenarioInfo(user)

        expect(shownPlayers()).toEqual({
          players: ['Red player flag', 'Tan player flag'],
          enemies: ['Tan player flag']
        })
      })
    })
  })

  describe('the conditions', () => {
    const aGoal = (goal, standardVictory = false) => ({
      ...goal,
      standardVictory,
      computerCanWin: false
    })
    const withTowns = () => aGame(aRedHero(), aRedTown(), aBlueHero(), aBlueTown())

    test('with none, the standard victory and loss', async () => {
      expect(await conditionsOf(withTowns())).toEqual({
        victory: 'Defeat all enemy heroes and capture all enemy towns.',
        loss: 'Lose all your heroes and towns.'
      })
    })

    test.each([
      [{ type: 'captureTown', town: 'blue-town' }, "Capture the town 'Kirkwall'."],
      [{ type: 'defeatHero', hero: 'hero-2' }, "Defeat the hero 'Valeska'."],
      [
        { type: 'gatherResource', resource: 'GOLD_PILE', amount: 100000 },
        'Accumulate 100000 Gold.'
      ],
      [{ type: 'findArtifact', artifact: 'AXE' }, "Find the Centaur's Axe."]
    ])('the goal %o reads "%s"', async (goal, text) => {
      const { victory } = await conditionsOf(withTowns().withVictoryCondition(aGoal(goal)))

      expect(victory).toBe(text)
    })

    test('a goal that also lets the standard victory count says so', async () => {
      const { victory } = await conditionsOf(
        withTowns().withVictoryCondition(aGoal({ type: 'captureTown', town: 'blue-town' }, true))
      )

      expect(victory).toBe("Capture the town 'Kirkwall'. You may also defeat all heroes and towns.")
    })

    // Day 90 is the 6th day of the 1st week of the 4th month: 3 months of 28 days, then 6 days.
    test.each([
      [{ type: 'loseTown', town: 'red-town' }, "Lose the town 'Steadwick'."],
      [{ type: 'loseHero', hero: 'hero-1' }, "Lose the hero 'Lord Haart'."],
      [{ type: 'timeExpires', days: 90 }, 'Fail to win by month 4, week 1, day 6.']
    ])('the loss condition %o reads "%s"', async (lossCondition, text) => {
      const { loss } = await conditionsOf(withTowns().withLossCondition(lossCondition))

      expect(loss).toBe(text)
    })
  })
})
