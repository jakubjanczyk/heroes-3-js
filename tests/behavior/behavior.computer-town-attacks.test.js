// @vitest-environment jsdom
import { within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  expectHeroAt,
  expectResourceNotPresent,
  getHeroEntity,
  getTownEntity,
  readOwnerFlags
} from './adventure-map.utils.js'
import {
  clickEndTurn,
  expectCalendarDate,
  getTownInTownList,
  readTownList,
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
  getBattleButton,
  getBattleScreen,
  LOWEST_ROLLS,
  moveActiveStackTo,
  queryBattleScreen,
  readBattleResultsMessage,
  readBattleResultsSide,
  readBattleStacks,
  waitForBattleResults
} from './battle.utils.js'
import {
  ARMY_THAT_WINS,
  aCreatureDefinition,
  aHero,
  aResource,
  aScenario,
  aTown
} from './builders.js'
import { queryTownScreen, readGarrison, readVisitingHeroArmy } from './town-screen.utils.js'

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
  heroes: readGameData('heroes.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const COMPUTER_TURN_MS = 2000

const HERO = 'Lord Haart'
const BLUE_HERO = 'Valeska'
const TOWN = 'Whitemoon'

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

const stack = (creature, count) => ({ creature, count })

// Whitemoon's gate is at (20, 2); the town covers the two tiles either side of it and the two rows
// above. Blue's hero starts three tiles below the gate and attacks from the tile below it.
const GATE = { x: 20, y: 2 }
const BELOW_THE_GATE = { x: 20, y: 3 }

const aWhitemoon = (garrison = []) =>
  aTown().withId('town-1').named(TOWN).ownedByPlayer().withGarrison(garrison).at(GATE.x, GATE.y)

// Too strong for blue's hero to attack, far from the town, and walled in by rock, so blue's heroes
// don't keep away from him.
const aRedHeroAway = () =>
  aHero().withName('Sir Christian').withId('hero-5').withArmy(ARMY_THAT_WINS).at(2, 5)

// The red hero standing in Whitemoon, who defends it.
const aRedHeroInTown = (army) =>
  aHero().withName(HERO).withPrimarySkills(NO_SKILLS).withArmy(army).at(GATE.x, GATE.y)

const aBlueHero = (army) =>
  aHero()
    .withId('hero-2')
    .withName(BLUE_HERO)
    .ownedBy('blue')
    .withPrimarySkills(NO_SKILLS)
    .withArmy(army)
    .at(20, 5)

// A second blue hero, who moves once the first has fought, to pick up the pile.
const aSecondBlueHero = () =>
  aHero()
    .withId('hero-3')
    .ownedBy('blue')
    .withArmy([stack('WEAKLING', 1)])
    .at(2, 0)
const thePileOfTheSecondBlueHero = () => aResource().withId('pile').at(5, 0)

const aTownScenario = ({ town = aWhitemoon(), blueHero, others = [] }) =>
  aScenario()
    .withSize(30, 6)
    .withRockAround(2, 5)
    .withEntities(aRedHeroAway(), town, blueHero, ...others)
    .withDefinitions(definitions)

// Whitemoon's Paper Tiger beats blue's Weaklings, which blue's hero thinks it can beat.
const aGarrisonThatWins = (others = []) =>
  aTownScenario({
    town: aWhitemoon([stack('PAPER_TIGER', 1)]),
    blueHero: aBlueHero([stack('WEAKLING', 10)]),
    others
  })

// Blue's Stingers strike first and kill Whitemoon's lone Weakling.
const aGarrisonThatLoses = () =>
  aTownScenario({
    town: aWhitemoon([stack('WEAKLING', 1)]),
    blueHero: aBlueHero([stack('STINGER', 10)])
  })

// The red hero's Paper Tiger and the garrison's Weaklings against blue's Weaklings.
const aRedHeroThatWins = () =>
  aTownScenario({
    town: aWhitemoon([stack('WEAKLING', 2)]),
    blueHero: aBlueHero([stack('WEAKLING', 10)]),
    others: [aRedHeroInTown([stack('PAPER_TIGER', 1)])]
  })

// Blue's Stingers strike first and kill the red hero's Weakling and the garrison's.
const aRedHeroThatLoses = () =>
  aTownScenario({
    town: aWhitemoon([stack('WEAKLING', 1)]),
    blueHero: aBlueHero([stack('STINGER', 10)]),
    others: [aRedHeroInTown([stack('WEAKLING', 1)])]
  })

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

async function startBlueTurn(scenario, options) {
  const app = await setupApp(scenario, options)
  await endTurn(app.user)
  return app
}

async function playWithAutoCombat(user) {
  await clickBattleButton(user, 'Auto combat')
  await waitForBattleResults()
}

async function closeResultsAndWait(user) {
  await closeBattleResults(user)
  await waitMs(COMPUTER_TURN_MS)
}

async function openWhitemoon(user) {
  await user.dblClick(getTownInTownList(TOWN))
  await waitMs()
}

const readTownFlags = () => readOwnerFlags(getTownEntity('town-1'))

const readBattleHeroes = () =>
  within(getBattleScreen())
    .queryAllByRole('img', { name: new RegExp(`^(${HERO}|${BLUE_HERO})$`) })
    .map((figure) => figure.getAttribute('aria-label'))

const readBattleStackNames = () =>
  readBattleStacks()
    .map(({ stack }) => stack)
    .sort()

describe('computer heroes attacking towns behavior', () => {
  describe('choosing a town', () => {
    test("blue's hero walks into an undefended red town, which then flies blue's flag", async () => {
      await startBlueTurn(aTownScenario({ blueHero: aBlueHero([stack('WEAKLING', 1)]) }))

      expect({ flags: readTownFlags(), battle: queryBattleScreen() }).toEqual({
        flags: ['Blue player flag'],
        battle: null
      })
      expectHeroAt(GATE.x, GATE.y, 'hero-2')
    })

    test("the town blue's hero took is gone from the player's town list", async () => {
      await startBlueTurn(aTownScenario({ blueHero: aBlueHero([stack('WEAKLING', 1)]) }))

      expect(readTownList()).toEqual([])
    })

    // Ten Skeletons are worth 600, and a tenth more is 660. Twelve Weaklings are worth 720.
    test("blue's hero attacks a red town whose garrison it is stronger than by more than a tenth", async () => {
      await startBlueTurn(
        aTownScenario({
          town: aWhitemoon([stack('SKELETON', 10)]),
          blueHero: aBlueHero([stack('WEAKLING', 12)])
        })
      )

      expect(queryBattleScreen()).not.toBeNull()
    })

    // Eleven Weaklings are worth 660, no more than the ten Skeletons' 600 and a tenth.
    test("blue's hero leaves alone a red town whose garrison it isn't stronger than by more than a tenth", async () => {
      await startBlueTurn(
        aTownScenario({
          town: aWhitemoon([stack('SKELETON', 10)]),
          blueHero: aBlueHero([stack('WEAKLING', 11)])
        })
      )

      expect({ battle: queryBattleScreen(), flags: readTownFlags() }).toEqual({
        battle: null,
        flags: ['Red player flag']
      })
    })

    // The red hero's five Skeletons and the garrison's five are worth 600 together, and a tenth
    // more is 660: twelve Weaklings (720) are stronger.
    test("blue's hero attacks a red hero in his town when stronger than him and the garrison together", async () => {
      await startBlueTurn(
        aTownScenario({
          town: aWhitemoon([stack('SKELETON', 5)]),
          blueHero: aBlueHero([stack('WEAKLING', 12)]),
          others: [aRedHeroInTown([stack('SKELETON', 5)])]
        })
      )

      expect(readBattleHeroes()).toEqual([BLUE_HERO, HERO])
    })

    // Eleven Weaklings (660) beat the red hero's five Skeletons (300) alone, but not with the
    // garrison's five (600 and a tenth).
    test("blue's hero leaves alone a red hero in his town when the garrison makes them too strong", async () => {
      await startBlueTurn(
        aTownScenario({
          town: aWhitemoon([stack('SKELETON', 5)]),
          blueHero: aBlueHero([stack('WEAKLING', 11)]),
          others: [aRedHeroInTown([stack('SKELETON', 5)])]
        })
      )

      expect(queryBattleScreen()).toBeNull()
    })

    test("blue's hero picks up a nearer pile first, then goes for the town", async () => {
      await startBlueTurn(
        aTownScenario({
          blueHero: aBlueHero([stack('WEAKLING', 1)]).at(18, 5),
          others: [aResource().withId('near-pile').at(16, 5)]
        })
      )

      expectResourceNotPresent('near-pile')
      expect(readTownFlags()).toEqual(['Blue player flag'])
    })

    test("blue's hero walks into an undefended neutral town and takes it, with no window opening for the player", async () => {
      await startBlueTurn(
        aTownScenario({
          town: aTown().withId('town-1').named(TOWN).at(GATE.x, GATE.y),
          blueHero: aBlueHero([stack('WEAKLING', 1)])
        })
      )

      expect({ flags: readTownFlags(), town: queryTownScreen() }).toEqual({
        flags: ['Blue player flag'],
        town: null
      })
    })
  })

  describe('the garrison defends alone', () => {
    test("the battle screen opens during blue's turn, blue's hero on the left and the red garrison on the right", async () => {
      await startBlueTurn(aGarrisonThatWins())

      expect({
        heroes: readBattleHeroes(),
        stacks: readBattleStackNames(),
        turn: readTurnBox().name
      }).toEqual({
        heroes: [BLUE_HERO],
        stacks: ['Paper Tiger 1', 'Weaklings 10'],
        turn: "Blue player's turn"
      })
    })

    // The Paper Tiger (speed 20) acts before the Weaklings (speed 1), from row 6, column 15.
    test("the player moves the garrison's stack", async () => {
      const { user } = await startBlueTurn(aGarrisonThatWins())

      await moveActiveStackTo(user, 6, 10)

      expect(readBattleStacks()).toContainEqual({ stack: 'Paper Tiger 1', row: 6, column: 10 })
    })

    test('Cast spell, Retreat and Surrender are disabled for the garrison', async () => {
      await startBlueTurn(aGarrisonThatWins())

      expect({
        castSpell: getBattleButton('Cast spell').disabled,
        retreat: getBattleButton('Retreat').disabled,
        surrender: getBattleButton('Surrender').disabled
      }).toEqual({ castSpell: true, retreat: true, surrender: true })
    })

    test('winning: the results window says it was a glorious victory, with no experience', async () => {
      const { user } = await startBlueTurn(aGarrisonThatWins())

      await playWithAutoCombat(user)

      expect({
        attacker: readBattleResultsSide('Attacker'),
        defender: readBattleResultsSide('Defender'),
        message: readBattleResultsMessage()
      }).toEqual({
        attacker: [BLUE_HERO, 'Defeated'],
        defender: ['Paper Tiger', 'Victorious'],
        message: ['A glorious victory!']
      })
    })

    test("winning: blue's hero is gone from the map and the town stays the player's", async () => {
      const { user } = await startBlueTurn(aGarrisonThatWins())
      await playWithAutoCombat(user)

      await closeResultsAndWait(user)

      expect({ blueHero: getHeroEntity('hero-2'), flags: readTownFlags() }).toEqual({
        blueHero: null,
        flags: ['Red player flag']
      })
    })

    test('winning: the garrison keeps the creatures that survived', async () => {
      const { user } = await startBlueTurn(aGarrisonThatWins())
      await playWithAutoCombat(user)
      await closeResultsAndWait(user)

      await openWhitemoon(user)

      expect(readGarrison()).toEqual(['Paper Tiger 1', '', '', '', '', '', ''])
    })

    test('losing: the results window says the forces suffer a bitter defeat', async () => {
      const { user } = await startBlueTurn(aGarrisonThatLoses())

      await playWithAutoCombat(user)

      expect({
        defender: readBattleResultsSide('Defender'),
        message: readBattleResultsMessage()
      }).toEqual({
        defender: ['Weakling', 'Defeated'],
        message: ['Your forces suffer a bitter defeat.']
      })
    })

    test("losing: the town flies blue's flag and blue's hero stands below its gate", async () => {
      const { user } = await startBlueTurn(aGarrisonThatLoses())
      await playWithAutoCombat(user)

      await closeResultsAndWait(user)

      expect({ flags: readTownFlags(), towns: readTownList() }).toEqual({
        flags: ['Blue player flag'],
        towns: []
      })
      expectHeroAt(BELOW_THE_GATE.x, BELOW_THE_GATE.y, 'hero-2')
    })
  })

  describe('a red hero defends the town', () => {
    test("the battle opens with the red hero's army and the garrison's stacks beside it", async () => {
      await startBlueTurn(aRedHeroThatWins())

      expect(readBattleStackNames()).toEqual(['Paper Tiger 1', 'Weaklings 10', 'Weaklings 2'])
    })

    test('Retreat and Surrender are disabled for the red hero', async () => {
      await startBlueTurn(aRedHeroThatWins())

      expect({
        retreat: getBattleButton('Retreat').disabled,
        surrender: getBattleButton('Surrender').disabled
      }).toEqual({ retreat: true, surrender: true })
    })

    test('Cast spell is enabled for the red hero', async () => {
      await startBlueTurn(
        aTownScenario({
          town: aWhitemoon([stack('WEAKLING', 2)]),
          blueHero: aBlueHero([stack('WEAKLING', 10)]),
          others: [aRedHeroInTown([stack('PAPER_TIGER', 1)]).withSpellBook(true)]
        })
      )

      expect(getBattleButton('Cast spell').disabled).toBe(false)
    })

    // Ten one-health Weaklings, and 500 for the beaten hero.
    test("winning: the red hero gets the experience for blue's creatures and 500 for blue's hero", async () => {
      const { user } = await startBlueTurn(aRedHeroThatWins())

      await playWithAutoCombat(user)

      expect(readBattleResultsMessage()).toEqual([
        'A glorious victory!',
        `For valor in combat, ${HERO} receives 510 experience`
      ])
    })

    test("winning: the red hero's and the garrison's survivors go back where they came from", async () => {
      const { user } = await startBlueTurn(aRedHeroThatWins())
      await playWithAutoCombat(user)
      await closeResultsAndWait(user)

      await openWhitemoon(user)

      expect({ hero: readVisitingHeroArmy(), garrison: readGarrison() }).toEqual({
        hero: ['Paper Tiger 1', '', '', '', '', '', ''],
        garrison: ['Weaklings 2', '', '', '', '', '', '']
      })
    })

    test('losing: the red hero is gone from the map', async () => {
      const { user } = await startBlueTurn(aRedHeroThatLoses())
      await playWithAutoCombat(user)

      await closeResultsAndWait(user)

      expect(getHeroEntity('hero-1')).toBeNull()
    })

    test("losing: the town flies blue's flag", async () => {
      const { user } = await startBlueTurn(aRedHeroThatLoses())
      await playWithAutoCombat(user)

      await closeResultsAndWait(user)

      expect({ flags: readTownFlags(), towns: readTownList() }).toEqual({
        flags: ['Blue player flag'],
        towns: []
      })
    })
  })

  describe("blue's turn and reloads", () => {
    test("once the results window closes, blue's other hero moves and then the player's turn starts", async () => {
      const { user } = await startBlueTurn(
        aGarrisonThatWins([aSecondBlueHero(), thePileOfTheSecondBlueHero()])
      )
      await playWithAutoCombat(user)

      await closeResultsAndWait(user)

      expectResourceNotPresent('pile')
      expectCalendarDate({ month: 1, week: 1, day: 2 })
    })

    test("given a town battle during blue's turn when the page reloads then the player goes on playing the garrison's stack", async () => {
      const scenario = aGarrisonThatWins()
      const eventLog = createMemoryEventLog()
      await startBlueTurn(scenario, { eventLog })

      const { user } = await setupApp(scenario, { eventLog })
      await waitMs()
      await moveActiveStackTo(user, 6, 10)

      expect(readBattleStacks()).toContainEqual({ stack: 'Paper Tiger 1', row: 6, column: 10 })
    })

    test('given blue took the town when the page reloads then it still flies blue’s flag and is not in the town list', async () => {
      const scenario = aTownScenario({ blueHero: aBlueHero([stack('WEAKLING', 1)]) })
      const eventLog = createMemoryEventLog()
      await startBlueTurn(scenario, { eventLog })

      await setupApp(scenario, { eventLog })
      await waitMs()

      expect({ flags: readTownFlags(), towns: readTownList() }).toEqual({
        flags: ['Blue player flag'],
        towns: []
      })
    })
  })
})
