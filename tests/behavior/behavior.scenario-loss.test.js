// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import {
  answerMessage,
  clickEndTurn,
  queryGameEndWindow,
  readGameEndWindowText,
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
  retreat,
  startBattle,
  waitForBattleResults
} from './battle.utils.js'
import {
  ARMY_THAT_WINS,
  aCreatureDefinition,
  aHero,
  aMine,
  aMonster,
  aScenario,
  aTown
} from './builders.js'
import { enterTownAt } from './town-screen.utils.js'

// Strikes before anything else, but dies to any blow.
const STINGER = aCreatureDefinition()
  .withName('Stinger')
  .withNamePlural('Stingers')
  .withAttack(0)
  .withDefense(0)
  .withDamage({ min: 6, max: 6 })
  .withHealth(1)
  .withSpeed(20)
  .withAiValue(60)
  .build()

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: { ...readGameData('monsters.json'), STINGER },
  resources: readGameData('resources.json'),
  mines: readGameData('mines.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const COMPUTER_TURN_MS = 2000
const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }
const DEFEAT = 'All your forces have been defeated, and you are banished from this land!'
const TIME_RAN_OUT = 'Alas, time has run out on your quest. All is lost.'
const HAART_DEFEATED = 'The hero, Lord Haart, has suffered defeat - your quest is over!'

const stack = (creature, count) => ({ creature, count })

const loseTown = (town) => ({ type: 'loseTown', town })
const loseHero = (hero) => ({ type: 'loseHero', hero })
const timeExpires = (days) => ({ type: 'timeExpires', days })

const aGameWithoutRedTown = (lossCondition, ...entities) =>
  aScenario()
    .withSize(30, 6)
    .withEntities(...entities)
    .withDefinitions(definitions)
    .withStandardVictoryAndLoss()
    .withLossCondition(lossCondition)

const aRedHero = () =>
  aHero().withId('hero-1').withName('Lord Haart').withArmy(ARMY_THAT_WINS).at(0, 5)
const aWeakRedHero = () =>
  aRedHero()
    .withPrimarySkills(NO_SKILLS)
    .withArmy([stack('PIKEMAN', 1)])
const aBlueHero = () =>
  aHero()
    .withId('hero-2')
    .withName('Valeska')
    .ownedBy('blue')
    .withPrimarySkills(NO_SKILLS)
    .withArmy([stack('PIKEMAN', 1)])

// Towns stand with their gates in row 2, covering the two rows above and two tiles either side.
const aKirkwall = () => aTown().withId('blue-town').named('Kirkwall').ownedBy('blue').at(14, 2)
const aWhitemoon = () => aTown().withId('red-town').named('Whitemoon').ownedByPlayer().at(20, 2)
// Keeps the player from the days-without-town messages, out of every hero's way.
const aRedHome = () => aTown().withId('red-home').named('Bracada').ownedByPlayer().at(4, 2)
// Keeps the player in the game, too far for blue's hero to go for it first.
const aFarRedTown = () => aTown().withId('far-red-town').named('Bracada').ownedByPlayer().at(26, 2)
// Keeps blue in the game, out of every hero's way.
const aFarBlueTown = () => aTown().withId('far-town').named('Rockland').ownedBy('blue').at(26, 2)

const aGame = (lossCondition, ...entities) =>
  aGameWithoutRedTown(lossCondition, aRedHome(), ...entities)

const setupApp = (scenario, options = {}) =>
  setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { random: LOWEST_ROLLS },
    ...options
  })

async function endTurn(user) {
  await clickEndTurn(user)
  await waitMs(COMPUTER_TURN_MS)
}

async function endTurns(user, count) {
  for (let turn = 0; turn < count; turn += 1) {
    await endTurn(user)
  }
}

async function autoCombat(user) {
  await clickBattleButton(user, 'Auto combat')
  await waitForBattleResults()
  await closeBattleResults(user)
  await waitMs()
}

const readTheMessage = () => ({ message: readMessage(), pictures: readMessagePictures() })
const readTheEnd = () => ({
  message: readMessage(),
  victorious: queryGameEndWindow('Victorious') !== null,
  defeated: queryGameEndWindow('Defeated') !== null
})
const NO_END = { message: null, victorious: false, defeated: false }

describe("the scenario's loss condition behavior", () => {
  describe('lose a town', () => {
    // Blue's hero walks three tiles north into Whitemoon, which has no garrison.
    const aBlueCapture = (lossCondition, town = aWhitemoon()) =>
      aGame(lossCondition, aRedHero(), town, aBlueHero().at(20, 5))

    test("blue's hero taking the town shows that the town has fallen, with the red flag", async () => {
      const { user } = await setupApp(aBlueCapture(loseTown('red-town')))

      await endTurn(user)

      expect(readTheMessage()).toEqual({
        message: 'The town of Whitemoon has fallen - all is lost!',
        pictures: ['Red player flag']
      })
    })

    test('after that message the Defeated window opens with the same message', async () => {
      const { user } = await setupApp(aBlueCapture(loseTown('red-town')))
      await endTurn(user)

      await answerMessage(user, 'OK')

      expect(readGameEndWindowText('Defeated')).toBe(
        'The town of Whitemoon has fallen - all is lost!'
      )
    })

    test('a town the scenario leaves unnamed is named by its type in the message', async () => {
      const { user } = await setupApp(
        aBlueCapture(loseTown('red-town'), aTown().withId('red-town').ownedByPlayer().at(20, 2))
      )

      await endTurn(user)

      expect(readMessage()).toBe('The town of Castle has fallen - all is lost!')
    })

    test("blue taking another of the player's towns doesn't end the game", async () => {
      const { user } = await setupApp(aBlueCapture(loseTown('red-home')))

      await endTurn(user)

      expect(readTheEnd()).toEqual(NO_END)
    })

    test("the town being blue's when the player never owned it doesn't end the game", async () => {
      const { user } = await setupApp(
        aGame(loseTown('blue-town'), aRedHero(), aKirkwall(), aBlueHero().at(29, 5))
      )

      await endTurn(user)

      expect(readTheEnd()).toEqual(NO_END)
    })

    test("blue losing its own town doesn't lose blue the game", async () => {
      await setupApp(
        aGame(
          loseTown('blue-town'),
          aRedHero().at(14, 3),
          aKirkwall(),
          aBlueHero().at(29, 5),
          aFarBlueTown()
        )
      )

      await enterTownAt(14, 2)
      await waitMs()

      expect(readTheEnd()).toEqual(NO_END)
    })
  })

  describe('lose a hero', () => {
    // Blue's hero is stronger by its AI value, attacks the red hero next to it, and wins.
    test("the hero beaten by blue's hero shows that the hero has suffered defeat, with the red flag", async () => {
      const { user } = await setupApp(
        aGameWithoutRedTown(
          loseHero('hero-1'),
          aWeakRedHero(),
          aBlueHero()
            .withArmy([stack('SKELETON', 10)])
            .at(3, 5),
          aFarRedTown()
        )
      )
      await endTurn(user)

      await autoCombat(user)

      expect(readTheMessage()).toEqual({
        message: HAART_DEFEATED,
        pictures: ['Red player flag']
      })
    })

    test('the hero beaten by monsters loses the game', async () => {
      const { user } = await startBattle(
        aGame(
          loseHero('hero-1'),
          aWeakRedHero(),
          aMonster().withType('STINGER').withCount(10).at(1, 5)
        )
      )

      await autoCombat(user)

      expect(readMessage()).toBe(HAART_DEFEATED)
    })

    // An Angel (speed 12) goes before the Swordsmen (speed 5), so the hero can retreat at once.
    test('the hero retreating from a battle loses the game', async () => {
      const { user } = await startBattle(
        aGame(
          loseHero('hero-1'),
          aRedHero().withArmy([stack('ANGEL', 1)]),
          aMonster().withType('SWORDSMAN').withCount(20).withStacks(1).at(1, 5)
        )
      )

      await retreat(user)
      await closeBattleResults(user)
      await waitMs()

      expect(readMessage()).toBe(HAART_DEFEATED)
    })

    test("another of the player's heroes beaten doesn't end the game", async () => {
      const { user } = await startBattle(
        aGame(
          loseHero('hero-3'),
          aWeakRedHero(),
          aHero().withId('hero-3').withName('Sorsha').at(10, 5),
          aMonster().withType('STINGER').withCount(10).at(1, 5)
        )
      )

      await autoCombat(user)

      expect(readTheEnd()).toEqual(NO_END)
    })
  })

  describe('time runs out', () => {
    const aTimeLimit = (days) => aGame(timeExpires(days), aRedHero())

    test('on the last day of the limit the game goes on', async () => {
      const { user } = await setupApp(aTimeLimit(2))

      await endTurn(user)

      expect(readTheEnd()).toEqual(NO_END)
    })

    test("the next day's turn starts with the message that time has run out, with the red flag", async () => {
      const { user } = await setupApp(aTimeLimit(2))

      await endTurns(user, 2)

      expect(readTheMessage()).toEqual({ message: TIME_RAN_OUT, pictures: ['Red player flag'] })
    })

    test('after that message the Defeated window opens with the same message', async () => {
      const { user } = await setupApp(aTimeLimit(2))
      await endTurns(user, 2)

      await answerMessage(user, 'OK')

      expect(readGameEndWindowText('Defeated')).toBe(TIME_RAN_OUT)
    })

    // The gold mine brings in 1000 a day.
    test("the gold goal reached by that day's income still wins", async () => {
      const { user } = await setupApp(
        aGame(timeExpires(1), aRedHero(), aMine().ownedByPlayer().at(8, 2))
          .withVictoryCondition({
            type: 'gatherResource',
            resource: 'GOLD_PILE',
            amount: 100000,
            standardVictory: true,
            computerCanWin: false
          })
          .withStartingResources({ GOLD_PILE: 99000 })
      )

      await endTurn(user)

      expect(readMessage()).toBe(
        'Congratulations! You have collected over 100000 Gold in your treasury. Victory is yours!'
      )
    })
  })

  describe('alongside the standard rules', () => {
    test('with the standard victory and loss off, the loss condition still loses the game', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(30, 6)
          .withEntities(aRedHero(), aRedHome())
          .withDefinitions(definitions)
          .withLossCondition(timeExpires(1))
      )

      await endTurn(user)

      expect(readMessage()).toBe(TIME_RAN_OUT)
    })

    test('with a loss condition, losing the last hero with no town still loses the game', async () => {
      const { user } = await startBattle(
        aGameWithoutRedTown(
          timeExpires(30),
          aWeakRedHero(),
          aMonster().withType('STINGER').withCount(10).at(1, 5)
        )
      )

      await autoCombat(user)

      expect(readMessage()).toBe(DEFEAT)
    })
  })

  describe('reload', () => {
    test('after a reload the Defeated window is open again with the loss message, with no message window', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aGame(timeExpires(1), aRedHero())
      const { user } = await setupApp(scenario, { eventLog })
      await endTurn(user)
      await answerMessage(user, 'OK')

      await setupApp(scenario, { eventLog })
      await waitMs()

      expect({ window: readGameEndWindowText('Defeated'), message: readMessage() }).toEqual({
        window: TIME_RAN_OUT,
        message: null
      })
    })
  })
})
