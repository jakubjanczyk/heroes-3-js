// @vitest-environment jsdom
import { within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  attackMonsterAt,
  expectHeroAt,
  expectResourceNotPresent,
  expectResourcePresent,
  getHeroEntity
} from './adventure-map.utils.js'
import {
  clickEndTurn,
  closeLevelUpPopup,
  expectCalendarDate,
  queryLevelUpPopup,
  readMessage,
  readMessagePictures,
  readTurnBox
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
  getBattleScreen,
  LOWEST_ROLLS,
  moveActiveStackTo,
  queryBattleScreen,
  readActiveStack,
  readBattleResultsMessage,
  readBattleResultsSide,
  readBattleStacks,
  waitForBattleResults
} from './battle.utils.js'
import {
  ARMY_THAT_WINS,
  aCreatureDefinition,
  aHero,
  anArtifactDefinition,
  aResource,
  aScenario
} from './builders.js'

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

// Strikes before anything else, but still dies to any blow.
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

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: { ...readGameData('monsters.json'), WEAKLING, STINGER, PAPER_TIGER },
  artifacts: {
    CAPE: anArtifactDefinition().withName('Cape of Conjuring').withSlot('CAPE').build()
  }
}

const COMPUTER_TURN_MS = 2000

const HERO = 'Lord Haart'
const BLUE_HERO = 'Valeska'
const MULLICH = 'Sir Mullich'

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

const stack = (creature, count) => ({ creature, count })

// Blue's hero walks three tiles east, to (18, 2), and attacks the red hero there.
const aRedHero = (army) =>
  aHero().withName(HERO).withPrimarySkills(NO_SKILLS).withArmy(army).at(19, 2)

const aBlueHero = (army) =>
  aHero()
    .withId('hero-2')
    .withName(BLUE_HERO)
    .ownedBy('blue')
    .withPrimarySkills(NO_SKILLS)
    .withArmy(army)
    .at(15, 2)

// A second blue hero, who moves once the first has fought, to pick up the pile.
const aSecondBlueHero = () =>
  aHero()
    .withId('hero-3')
    .ownedBy('blue')
    .withArmy([stack('WEAKLING', 1)])
    .at(2, 0)
const thePileOfTheSecondBlueHero = () => aResource().withId('pile').at(5, 0)

const anAttackScenario = (...entities) =>
  aScenario()
    .withSize(30, 3)
    .withEntities(...entities)
    .withDefinitions(definitions)

// The red hero's Paper Tiger beats blue's Weaklings, which blue's hero thinks it can beat.
const aFightTheRedHeroWins = ({ redHero = aRedHero([stack('PAPER_TIGER', 1)]), blueHero } = {}) =>
  anAttackScenario(
    redHero,
    blueHero ?? aBlueHero([stack('WEAKLING', 10)]),
    aSecondBlueHero(),
    thePileOfTheSecondBlueHero()
  )

// Blue's Stingers strike first and kill the red hero's lone Weakling.
const aFightTheRedHeroLoses = (...others) =>
  anAttackScenario(
    aRedHero([stack('WEAKLING', 1)]),
    aBlueHero([stack('STINGER', 10)]).withArtifacts(['CAPE']),
    ...others
  )

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

async function startBlueAttack(scenario, options) {
  const app = await setupApp(scenario, options)
  await endTurn(app.user)
  return app
}

async function winWithAutoCombat(user) {
  await clickBattleButton(user, 'Auto combat')
  await waitForBattleResults()
}

async function closeResultsAndWait(user) {
  await closeBattleResults(user)
  await waitMs(COMPUTER_TURN_MS)
}

const readBattleHeroes = () =>
  within(getBattleScreen())
    .getAllByRole('img', { name: new RegExp(`^(${HERO}|${BLUE_HERO})$`) })
    .map((figure) => figure.getAttribute('aria-label'))

describe('computer heroes attacking the player behavior', () => {
  describe('choosing a fight', () => {
    // Ten Skeletons are worth 600, and a tenth more is 660. Twelve Weaklings are worth 720.
    test("blue's hero attacks a red hero whose army it is stronger than by more than a tenth", async () => {
      await startBlueAttack(
        anAttackScenario(aRedHero([stack('SKELETON', 10)]), aBlueHero([stack('WEAKLING', 12)]))
      )

      expect(queryBattleScreen()).not.toBeNull()
    })

    // Eleven Weaklings are worth 660, no more than the ten Skeletons' 600 and a tenth.
    test("blue's hero leaves alone a red hero it isn't stronger than by more than a tenth", async () => {
      await startBlueAttack(
        anAttackScenario(aRedHero([stack('SKELETON', 10)]), aBlueHero([stack('WEAKLING', 11)]))
      )

      expect(queryBattleScreen()).toBeNull()
      expectHeroAt(19, 2)
    })

    test("blue's hero picks up a nearer pile first, then attacks the red hero", async () => {
      await startBlueAttack(
        anAttackScenario(
          aRedHero([stack('SKELETON', 1)]),
          aBlueHero([stack('WEAKLING', 10)]),
          aResource().withId('near-pile').at(13, 2)
        )
      )

      expectResourceNotPresent('near-pile')
      expect(queryBattleScreen()).not.toBeNull()
    })
  })

  describe('the battle', () => {
    test("the battle screen opens during blue's turn, blue's hero on the left and the red hero on the right", async () => {
      await startBlueAttack(aFightTheRedHeroWins())

      expect({ heroes: readBattleHeroes(), turn: readTurnBox().name }).toEqual({
        heroes: [BLUE_HERO, HERO],
        turn: "Blue player's turn"
      })
    })

    // The Paper Tiger (speed 20) acts before the Weaklings (speed 1), from row 6, column 15.
    test("the player moves the red hero's stack", async () => {
      const { user } = await startBlueAttack(aFightTheRedHeroWins())

      await moveActiveStackTo(user, 6, 10)

      expect(readBattleStacks()).toContainEqual({ stack: 'Paper Tiger 1', row: 6, column: 10 })
    })

    // Once the Paper Tiger has moved, the Weaklings walk one hex towards it on their own, and the
    // Paper Tiger's turn comes again.
    test("blue's stacks act on their own after the player's", async () => {
      const { user } = await startBlueAttack(aFightTheRedHeroWins())

      await moveActiveStackTo(user, 6, 10)
      await waitMs(1000)

      expect({
        weaklings: readBattleStacks().find(({ stack }) => stack.startsWith('Weaklings')),
        active: readActiveStack().stack
      }).toEqual({
        weaklings: { stack: 'Weaklings 10', row: 6, column: 2 },
        active: 'Paper Tiger 1'
      })
    })

    test("auto combat plays the red hero's stack", async () => {
      const { user } = await startBlueAttack(aFightTheRedHeroWins())

      await winWithAutoCombat(user)

      expect(readBattleResultsSide('Defender')).toEqual([HERO, 'Victorious'])
    })
  })

  describe('winning', () => {
    test("the results window shows blue's hero Defeated and the red hero Victorious, with the red hero's experience", async () => {
      const { user } = await startBlueAttack(aFightTheRedHeroWins())

      await winWithAutoCombat(user)

      // Ten one-health Weaklings, and 500 for the beaten hero.
      expect({
        attacker: readBattleResultsSide('Attacker'),
        defender: readBattleResultsSide('Defender'),
        message: readBattleResultsMessage()
      }).toEqual({
        attacker: [BLUE_HERO, 'Defeated'],
        defender: [HERO, 'Victorious'],
        message: ['A glorious victory!', `For valor in combat, ${HERO} receives 510 experience`]
      })
    })

    // 490 and the 510 earned make the 1000 the second level needs.
    test("the red hero gains blue's creatures' hit points and 500 more as experience", async () => {
      const { user } = await startBlueAttack(
        aFightTheRedHeroWins({
          redHero: aRedHero([stack('PAPER_TIGER', 1)]).withExperience(490)
        })
      )
      await winWithAutoCombat(user)

      await closeBattleResults(user)
      await waitMs()

      expect(queryLevelUpPopup(HERO)).not.toBeNull()
    })

    test("blue's hero is gone from the map", async () => {
      const { user } = await startBlueAttack(aFightTheRedHeroWins())
      await winWithAutoCombat(user)

      await closeResultsAndWait(user)

      expect(getHeroEntity('hero-2')).toBeNull()
    })

    test("when the results window closes then a message shows blue's hero's artifacts the red hero captured", async () => {
      const { user } = await startBlueAttack(
        aFightTheRedHeroWins({
          blueHero: aBlueHero([stack('WEAKLING', 10)]).withArtifacts(['CAPE'])
        })
      )
      await winWithAutoCombat(user)

      await closeBattleResults(user)
      await waitMs()

      expect({ message: readMessage(), pictures: readMessagePictures() }).toEqual({
        message: 'You have captured an enemy artifact!',
        pictures: ['Cape of Conjuring']
      })
    })
  })

  describe('losing', () => {
    test("the red hero is gone from the map and blue's hero stays where it attacked from", async () => {
      const { user } = await startBlueAttack(aFightTheRedHeroLoses())
      await waitForBattleResults()

      await closeResultsAndWait(user)

      expect(getHeroEntity('hero-1')).toBeNull()
      expectHeroAt(18, 2, 'hero-2')
    })

    test("given the red hero was beaten when Sir Mullich beats blue's hero then he captures the red hero's artifacts", async () => {
      const { user } = await startBlueAttack(
        aFightTheRedHeroLoses(
          aHero().withId('hero-4').withName(MULLICH).withArmy(ARMY_THAT_WINS).at(22, 2)
        )
      )
      // The red hero wore no artifact of his own, so blue's hero kept only its Cape.
      await waitForBattleResults()
      await closeResultsAndWait(user)

      await attackMonsterAt(18, 2)
      await winWithAutoCombat(user)
      await closeBattleResults(user)
      await waitMs()

      expect(readMessagePictures()).toEqual(['Cape of Conjuring'])
    })
  })

  describe("blue's turn after the battle", () => {
    test("blue's other hero doesn't move while the results window is open", async () => {
      const { user } = await startBlueAttack(aFightTheRedHeroWins())

      await winWithAutoCombat(user)
      await waitMs(COMPUTER_TURN_MS)

      expectResourcePresent('pile')
    })

    test("once the results window closes, blue's other hero moves and then the player's turn starts", async () => {
      const { user } = await startBlueAttack(aFightTheRedHeroWins())
      await winWithAutoCombat(user)

      await closeResultsAndWait(user)

      expectResourceNotPresent('pile')
      expectCalendarDate({ month: 1, week: 1, day: 2 })
    })

    test("given the red hero levels up then blue's turn goes on once the level-up window is closed", async () => {
      const { user } = await startBlueAttack(
        aFightTheRedHeroWins({
          redHero: aRedHero([stack('PAPER_TIGER', 1)]).withExperience(490)
        })
      )
      await winWithAutoCombat(user)
      await closeResultsAndWait(user)
      expectResourcePresent('pile')

      await closeLevelUpPopup(user, HERO)
      await waitMs(COMPUTER_TURN_MS)

      expectResourceNotPresent('pile')
    })
  })

  describe('after a reload', () => {
    test("given a battle during blue's turn when the page reloads then the player goes on playing the red hero's stack", async () => {
      const scenario = aFightTheRedHeroWins()
      const eventLog = createMemoryEventLog()
      await startBlueAttack(scenario, { eventLog })

      const { user } = await setupApp(scenario, { eventLog })
      await waitMs()
      await moveActiveStackTo(user, 6, 10)

      expect(readBattleStacks()).toContainEqual({ stack: 'Paper Tiger 1', row: 6, column: 10 })
    })

    test("given that reloaded battle ends then blue's turn goes on and the player's turn starts", async () => {
      const scenario = aFightTheRedHeroWins()
      const eventLog = createMemoryEventLog()
      await startBlueAttack(scenario, { eventLog })
      const { user } = await setupApp(scenario, { eventLog })
      await waitMs()

      await winWithAutoCombat(user)
      await closeResultsAndWait(user)

      expectResourceNotPresent('pile')
      expectCalendarDate({ month: 1, week: 1, day: 2 })
    })
  })
})
