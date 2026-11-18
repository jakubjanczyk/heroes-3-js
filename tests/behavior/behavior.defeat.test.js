// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { expectResourcePresent, getTownEntity, readOwnerFlags } from './adventure-map.utils.js'
import {
  answerMessage,
  clickEndTurn,
  queryGameEndWindow,
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
  retreat,
  startBattle,
  waitForBattleResults
} from './battle.utils.js'
import { aCreatureDefinition, aHero, aMonster, aResource, aScenario, aTown } from './builders.js'

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

// As strong as a Skeleton by its AI value, slow, and dies to any blow.
const WEAKLING = aCreatureDefinition()
  .withName('Weakling')
  .withNamePlural('Weaklings')
  .withAttack(0)
  .withDefense(0)
  .withDamage({ min: 1, max: 1 })
  .withHealth(1)
  .withSpeed(1)
  .withAiValue(60)
  .build()

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: { ...readGameData('monsters.json'), STINGER, WEAKLING },
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const DEFEAT = 'All your forces have been defeated, and you are banished from this land!'
const COMPUTER_TURN_MS = 2000
const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

const stack = (creature, count) => ({ creature, count })

const aGame = (...entities) =>
  aScenario()
    .withSize(30, 6)
    .withEntities(...entities)
    .withDefinitions(definitions)
    .withStandardVictoryAndLoss()

// The red hero's lone Weakling against ten Stingers, which strike first.
const aRedHero = () =>
  aHero()
    .withName('Lord Haart')
    .withPrimarySkills(NO_SKILLS)
    .withArmy([stack('WEAKLING', 1)])
const aStrongMonster = () => aMonster().withType('STINGER').withCount(10)

// A red town far from the fight, its gate at (25, 2).
const aWhitemoon = () => aTown().withId('red-town').named('Whitemoon').ownedByPlayer().at(25, 2)

// The red hero fights the monster next to it.
const aLostFight = (...others) => aGame(aRedHero().at(0, 5), aStrongMonster().at(1, 5), ...others)

async function loseToTheMonster(scenario, options) {
  const app = await startBattle(scenario, options)
  await clickBattleButton(app.user, 'Auto combat')
  await waitForBattleResults()
  await closeBattleResults(app.user)
  return app
}

async function loseTheGame(scenario, options) {
  const app = await loseToTheMonster(scenario, options)
  await answerMessage(app.user, 'OK')
  return app
}

// Blue's hero walks three tiles east, to (18, 2), and attacks the red hero there. Its second hero
// would go for the pile once the first has fought.
const aBlueAttack = () =>
  aGame(
    aRedHero().at(19, 2),
    aHero()
      .withId('hero-2')
      .withName('Valeska')
      .ownedBy('blue')
      .withPrimarySkills(NO_SKILLS)
      .withArmy([stack('STINGER', 10)])
      .at(15, 2),
    aHero()
      .withId('hero-3')
      .ownedBy('blue')
      .withArmy([stack('WEAKLING', 1)])
      .at(2, 0),
    aResource().withId('pile').withType('GEMS_PILE').at(5, 0)
  )

const readTheMessage = () => ({ message: readMessage(), pictures: readMessagePictures() })

describe('defeat behavior', () => {
  test('losing the last hero to monsters with no town shows the defeat message with the red flag', async () => {
    await loseToTheMonster(aLostFight())

    expect(readTheMessage()).toEqual({ message: DEFEAT, pictures: ['Red player flag'] })
  })

  test('after the defeat message the Defeated window opens', async () => {
    await loseTheGame(aLostFight())

    expect(queryGameEndWindow('Defeated')).not.toBeNull()
  })

  // The Angel (speed 12) acts before the Skeletons, so the hero retreats at once.
  test('retreating with the last hero and no town loses the game', async () => {
    const { user } = await startBattle(
      aGame(
        aRedHero()
          .withArmy([stack('ANGEL', 1)])
          .at(0, 5),
        aMonster().at(1, 5)
      )
    )

    await retreat(user)
    await closeBattleResults(user)

    expect(readMessage()).toBe(DEFEAT)
  })

  test("losing the last hero while owning a town doesn't end the game", async () => {
    await loseToTheMonster(aLostFight(aWhitemoon()))
    await waitMs()

    expect({ message: readMessage(), window: queryGameEndWindow('Defeated') }).toEqual({
      message: null,
      window: null
    })
  })

  test("losing the last hero to blue's hero shows the defeat message after the results, and blue's turn stops", async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aBlueAttack().build(),
      appConfig: { random: LOWEST_ROLLS }
    })
    await clickEndTurn(user)
    await waitMs(COMPUTER_TURN_MS)
    await clickBattleButton(user, 'Auto combat')
    await waitForBattleResults()

    await closeBattleResults(user)
    const message = readMessage()
    await answerMessage(user, 'OK')
    await waitMs(COMPUTER_TURN_MS)

    expect({ message, window: queryGameEndWindow('Defeated') !== null }).toEqual({
      message: DEFEAT,
      window: true
    })
    expectResourcePresent('pile')
  })

  test("blue's hero taking the player's last town while the player has no hero loses the game", async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aGame(
        aTown().withId('town-1').named('Whitemoon').ownedByPlayer().at(20, 2),
        aHero()
          .withId('hero-2')
          .ownedBy('blue')
          .withArmy([stack('WEAKLING', 1)])
          .at(20, 5)
      ).build(),
      appConfig: { random: LOWEST_ROLLS }
    })

    await clickEndTurn(user)
    await waitMs(COMPUTER_TURN_MS)

    expect({ flags: readOwnerFlags(getTownEntity()), message: readMessage() }).toEqual({
      flags: ['Blue player flag'],
      message: DEFEAT
    })
  })

  test('Restart in the Defeated window starts the scenario again', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aLostFight()
    const { envWindow, reloadCalls } = createWindowWithReloadSpy()
    const { user } = await loseTheGame(scenario, { eventLog, envWindow })

    await restartGame(user, 'Defeated')
    await setupMovementBehaviorApp({ loadGameOptions: scenario.build(), eventLog })

    expect({ reloads: reloadCalls.length, window: queryGameEndWindow('Defeated') }).toEqual({
      reloads: 1,
      window: null
    })
  })

  test('after a reload the Defeated window is open again', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aLostFight()
    await loseTheGame(scenario, { eventLog })

    await reloadBattle(scenario, { eventLog })
    await waitMs()

    expect(queryGameEndWindow('Defeated')).not.toBeNull()
  })
})
