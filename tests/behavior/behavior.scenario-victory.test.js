// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { confirmMove } from './adventure-map.utils.js'
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
  startBattle,
  waitForBattleResults
} from './battle.utils.js'
import {
  ARMY_THAT_WINS,
  aCreatureDefinition,
  aHero,
  aMine,
  aMonster,
  anArtifact,
  anArtifactDefinition,
  aResource,
  aScenario,
  aTown
} from './builders.js'
import { enterTownAt } from './town-screen.utils.js'

// Worth next to nothing by its AI value, yet nothing a test's hero leads can hurt it.
const PAPER_TIGER = aCreatureDefinition()
  .withName('Paper Tiger')
  .withNamePlural('Paper Tigers')
  .withAttack(50)
  .withDefense(50)
  .withDamage({ min: 100, max: 100 })
  .withHealth(1000)
  .withSpeed(20)
  .withAiValue(1)
  .build()

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

const AXE = 'AXE'
const SWORD = 'SWORD'

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: { ...readGameData('monsters.json'), PAPER_TIGER, STINGER },
  resources: readGameData('resources.json'),
  mines: readGameData('mines.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json'),
  artifacts: {
    [AXE]: anArtifactDefinition().withName("Centaur's Axe").withSlot('WEAPON').build(),
    [SWORD]: anArtifactDefinition().withName('Sword of Hellfire').withSlot('WEAPON').build()
  }
}

const COMPUTER_TURN_MS = 2000
const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }
const VANQUISHED_BLUE = 'Blue has been vanquished!'
const VICTORY = 'Congratulations! All your enemies have been defeated! Victory is yours!'
const DEFEAT = 'All your forces have been defeated, and you are banished from this land!'

const stack = (creature, count) => ({ creature, count })

const aGoal = (goal, { standardVictory = true, computerCanWin = false } = {}) => ({
  ...goal,
  standardVictory,
  computerCanWin
})
const captureTown = (town, options) => aGoal({ type: 'captureTown', town }, options)
const defeatHero = (hero, options) => aGoal({ type: 'defeatHero', hero }, options)
const gatherResource = (resource, amount, options) =>
  aGoal({ type: 'gatherResource', resource, amount }, options)
const findArtifact = (artifact, options) => aGoal({ type: 'findArtifact', artifact }, options)

const aGameWithoutRedTown = (goal, ...entities) =>
  aScenario()
    .withSize(30, 6)
    .withEntities(...entities)
    .withDefinitions(definitions)
    .withStandardVictoryAndLoss()
    .withVictoryCondition(goal)

const aRedHero = () => aHero().withName('Lord Haart').withArmy(ARMY_THAT_WINS).at(0, 5)
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
// Keeps blue in the game, out of every hero's way.
const aFarBlueTown = () => aTown().withId('far-town').named('Rockland').ownedBy('blue').at(26, 2)

const aGame = (goal, ...entities) => aGameWithoutRedTown(goal, aRedHome(), ...entities)

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

async function autoCombat(user) {
  await clickBattleButton(user, 'Auto combat')
  await waitForBattleResults()
  await closeBattleResults(user)
  await waitMs()
}

// The red hero attacks blue's hero next to it, at (1, 5), and beats it.
async function beatBlueHero(scenario, options) {
  const app = await startBattle(scenario, options)
  await autoCombat(app.user)
  return app
}

const readTheMessage = () => ({ message: readMessage(), pictures: readMessagePictures() })
const readTheEnd = () => ({
  message: readMessage(),
  victorious: queryGameEndWindow('Victorious') !== null,
  defeated: queryGameEndWindow('Defeated') !== null
})
const NO_END = { message: null, victorious: false, defeated: false }

describe("the scenario's victory condition behavior", () => {
  describe('capture a town', () => {
    const aCapture = (goal) =>
      aGame(goal, aRedHero().at(14, 3), aKirkwall(), aBlueHero().at(29, 5), aFarBlueTown())

    test('capturing the town shows that the player captured it and is victorious, with the red flag', async () => {
      await setupApp(aCapture(captureTown('blue-town')))

      await enterTownAt(14, 2)

      expect(readTheMessage()).toEqual({
        message: 'Congratulations! You captured Kirkwall, and are victorious!',
        pictures: ['Red player flag']
      })
    })

    test("after that message the Victorious window opens with the goal's message", async () => {
      const { user } = await setupApp(aCapture(captureTown('blue-town')))
      await enterTownAt(14, 2)

      await answerMessage(user, 'OK')

      expect(readGameEndWindowText('Victorious')).toBe(
        'Congratulations! You captured Kirkwall, and are victorious!'
      )
    })

    test('a town the scenario leaves unnamed is named by its type in the message', async () => {
      await setupApp(
        aGame(
          captureTown('blue-town'),
          aRedHero().at(14, 3),
          aTown().withId('blue-town').ownedBy('blue').at(14, 2),
          aBlueHero().at(29, 5),
          aFarBlueTown()
        )
      )

      await enterTownAt(14, 2)

      expect(readMessage()).toBe('Congratulations! You captured Castle, and are victorious!')
    })

    test("capturing a different town doesn't end the game", async () => {
      await setupApp(aCapture(captureTown('far-town')))

      await enterTownAt(14, 2)
      await waitMs()

      expect(readTheEnd()).toEqual(NO_END)
    })

    // Blue's hero walks three tiles north into Whitemoon, which has no garrison.
    const aBlueCapture = (goal) => aGame(goal, aRedHero(), aWhitemoon(), aBlueHero().at(20, 5))

    test('blue capturing the town, when computer players can win by it, shows that the enemy claims victory, with the blue flag', async () => {
      const { user } = await setupApp(
        aBlueCapture(captureTown('red-town', { computerCanWin: true }))
      )

      await endTurn(user)

      expect(readTheMessage()).toEqual({
        message: 'The enemy has captured Whitemoon, and claims victory!',
        pictures: ['Blue player flag']
      })
    })

    test("after blue's victory the Defeated window opens with blue's message", async () => {
      const { user } = await setupApp(
        aBlueCapture(captureTown('red-town', { computerCanWin: true }))
      )
      await endTurn(user)

      await answerMessage(user, 'OK')

      expect(readGameEndWindowText('Defeated')).toBe(
        'The enemy has captured Whitemoon, and claims victory!'
      )
    })

    test("blue capturing the town, when computer players can't win by it, doesn't end the game", async () => {
      const { user } = await setupApp(aBlueCapture(captureTown('red-town')))

      await endTurn(user)

      expect(readTheEnd()).toEqual(NO_END)
    })
  })

  describe('defeat a hero', () => {
    test('beating the hero shows that the quest to defeat it is completed, with the red flag', async () => {
      await beatBlueHero(
        aGame(defeatHero('hero-2'), aRedHero(), aBlueHero().at(1, 5), aFarBlueTown())
      )

      expect(readTheMessage()).toEqual({
        message:
          'Congratulations! You have completed your quest to defeat the enemy hero Valeska. Victory is yours!',
        pictures: ['Red player flag']
      })
    })

    // Blue's hero sees nothing to fear in the Paper Tigers by their AI value, attacks the red hero
    // next to it, and loses.
    test("the hero attacking the player's hero and losing to it wins the game", async () => {
      const { user } = await setupApp(
        aGame(
          defeatHero('hero-2'),
          aRedHero().withArmy([stack('PAPER_TIGER', 3)]),
          aBlueHero()
            .withArmy([stack('SKELETON', 10)])
            .at(3, 5),
          aFarBlueTown()
        )
      )
      await endTurn(user)

      await autoCombat(user)

      expect(readMessage()).toBe(
        'Congratulations! You have completed your quest to defeat the enemy hero Valeska. Victory is yours!'
      )
    })

    test("the hero beaten by monsters doesn't win the game", async () => {
      const { user } = await setupApp(
        aGame(
          defeatHero('hero-2'),
          aRedHero(),
          aBlueHero()
            .withArmy([stack('SKELETON', 10)])
            .at(10, 2),
          aMonster().withType('PAPER_TIGER').withCount(3).at(13, 2),
          aFarBlueTown()
        )
      )

      await endTurn(user)

      expect(readTheEnd()).toEqual(NO_END)
    })
  })

  describe('gather a resource', () => {
    const GATHERED =
      'Congratulations! You have collected over 100000 Gold in your treasury. Victory is yours!'

    // A pile of gold holds 100.
    const aGoldPileGame = (gold) =>
      aGame(
        gatherResource('GOLD_PILE', 100000),
        aRedHero(),
        aResource().withType('GOLD_PILE').at(3, 5)
      ).withStartingResources({ GOLD_PILE: gold })

    test('picking up gold that takes the player to the amount shows that they have collected it, with the red flag', async () => {
      const { user } = await setupApp(aGoldPileGame(99950))

      await confirmMove(user, 3, 5)
      await waitMs()

      expect(readTheMessage()).toEqual({ message: GATHERED, pictures: ['Red player flag'] })
    })

    test("picking up gold that leaves the player short of the amount doesn't end the game", async () => {
      const { user } = await setupApp(aGoldPileGame(99800))

      await confirmMove(user, 3, 5)
      await waitMs()

      expect(readTheEnd()).toEqual(NO_END)
    })

    // The gold mine brings in 1000 a day.
    test("the new day's income that reaches the amount wins at the start of the player's turn", async () => {
      const { user } = await setupApp(
        aGame(
          gatherResource('GOLD_PILE', 100000),
          aRedHero(),
          aMine().ownedByPlayer().at(8, 2)
        ).withStartingResources({ GOLD_PILE: 99000 })
      )

      await endTurn(user)

      expect(readMessage()).toBe(GATHERED)
    })

    // Blue starts with 7500 gold and its mine brings in 1000 at the end of the day; the player
    // starts with none.
    test('blue reaching the amount, when computer players can win by it, shows that the enemy has collected it, then the Defeated window', async () => {
      const { user } = await setupApp(
        aGame(
          gatherResource('GOLD_PILE', 8000, { computerCanWin: true }),
          aRedHero(),
          aBlueHero().at(29, 5),
          aMine().ownedBy('blue').at(26, 2)
        )
      )
      await endTurn(user)

      const shown = readTheMessage()
      await answerMessage(user, 'OK')

      expect({ ...shown, defeated: queryGameEndWindow('Defeated') !== null }).toEqual({
        message: 'The enemy has collected over 8000 Gold. Victory is theirs!',
        pictures: ['Blue player flag'],
        defeated: true
      })
    })
  })

  describe('find an artifact', () => {
    const FOUND = "Congratulations! You have found the Centaur's Axe, and can claim victory!"

    test('picking the artifact up from the map shows that the player has found it, with the red flag', async () => {
      const { user } = await setupApp(
        aGame(findArtifact(AXE), aRedHero(), anArtifact().withType(AXE).at(3, 5))
      )

      await confirmMove(user, 3, 5)
      await waitMs()

      expect(readTheMessage()).toEqual({ message: FOUND, pictures: ['Red player flag'] })
    })

    test('taking the artifact from a beaten hero wins once the captured artifact is shown', async () => {
      const { user } = await beatBlueHero(
        aGame(
          findArtifact(AXE),
          aRedHero(),
          aBlueHero().withArtifacts([AXE]).at(1, 5),
          aFarBlueTown()
        )
      )

      await answerMessage(user, 'OK')

      expect(readMessage()).toBe(FOUND)
    })

    test("picking up a different artifact doesn't end the game", async () => {
      const { user } = await setupApp(
        aGame(findArtifact(AXE), aRedHero(), anArtifact().withType(SWORD).at(3, 5))
      )

      await confirmMove(user, 3, 5)
      await waitMs()

      expect(readTheEnd()).toEqual(NO_END)
    })
  })

  describe('the standard victory and loss alongside the goal', () => {
    const aLastBlueHero = (goal) => aGame(goal, aRedHero(), aBlueHero().at(1, 5))

    test('with the standard victory on, vanquishing the last enemy still wins', async () => {
      const { user } = await beatBlueHero(aLastBlueHero(findArtifact(AXE)))

      await answerMessage(user, 'OK')

      expect(readMessage()).toBe(VICTORY)
    })

    test("with the standard victory off, vanquishing the last enemy doesn't end the game", async () => {
      const { user } = await beatBlueHero(
        aLastBlueHero(findArtifact(AXE, { standardVictory: false }))
      )
      const vanquished = readMessage()

      await answerMessage(user, 'OK')
      await waitMs()

      expect({ vanquished, ...readTheEnd() }).toEqual({ vanquished: VANQUISHED_BLUE, ...NO_END })
    })

    test('with the standard victory off, finding the artifact still wins', async () => {
      const { user } = await setupApp(
        aGame(
          findArtifact(AXE, { standardVictory: false }),
          aRedHero(),
          anArtifact().withType(AXE).at(3, 5)
        )
      )

      await confirmMove(user, 3, 5)
      await waitMs()

      expect(readMessage()).toBe(
        "Congratulations! You have found the Centaur's Axe, and can claim victory!"
      )
    })

    test('with a goal, losing the last hero with no town still loses the game', async () => {
      const { user } = await startBattle(
        aGameWithoutRedTown(
          findArtifact(AXE),
          aRedHero()
            .withPrimarySkills(NO_SKILLS)
            .withArmy([stack('PIKEMAN', 1)]),
          aMonster().withType('STINGER').withCount(10).at(1, 5)
        )
      )

      await autoCombat(user)

      expect(readMessage()).toBe(DEFEAT)
    })
  })

  describe('reload', () => {
    test('after a reload the Victorious window is open again, with no message', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aGame(
        captureTown('blue-town'),
        aRedHero().at(14, 3),
        aKirkwall(),
        aBlueHero().at(29, 5),
        aFarBlueTown()
      )
      const { user } = await setupApp(scenario, { eventLog })
      await enterTownAt(14, 2)
      await answerMessage(user, 'OK')

      await setupApp(scenario, { eventLog })
      await waitMs()

      expect({ window: queryGameEndWindow('Victorious') !== null, message: readMessage() }).toEqual(
        { window: true, message: null }
      )
    })
  })
})
