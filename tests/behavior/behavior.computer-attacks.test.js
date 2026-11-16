// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  attackMonsterAt,
  confirmMove,
  expectHeroAt,
  expectResourceNotPresent,
  expectResourcePresent,
  getHeroEntity
} from './adventure-map.utils.js'
import {
  clickEndTurn,
  closeLevelUpPopup,
  endTurns,
  expectCalendarDate,
  expectResourceTotal,
  getTownInTownList,
  queryLevelUpPopup,
  readArmySlots,
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
  castSpellAt,
  clickBattleButton,
  closeBattleResults,
  getBattleButton,
  getBattleScreen,
  LOWEST_ROLLS,
  moveActiveStackTo,
  playOnToNextRound,
  queryBattleScreen,
  querySurrenderDialog,
  readActiveStack,
  readBattleQuestion,
  readBattleResultsMessage,
  readBattleResultsSide,
  readBattleSpellPoints,
  readBattleStacks,
  readCombatMessages,
  retreat,
  surrender,
  waitForBattleResults
} from './battle.utils.js'
import {
  ARMY_THAT_WINS,
  aCreatureDefinition,
  aHero,
  anArtifactDefinition,
  aResource,
  aScenario,
  aSpellDefinition,
  aTown
} from './builders.js'
import {
  holdRightButtonOnHeroForHire,
  openTavern,
  readHeroesForHire,
  readHeroForHireDescription,
  selectHeroForHire
} from './town-screen.utils.js'

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

// Hard to hurt and hits for 1, so it outlasts blue's strikes and harms them little.
const DUMMY = aCreatureDefinition()
  .withName('Dummy')
  .withNamePlural('Dummies')
  .withAttack(0)
  .withDefense(50)
  .withDamage({ min: 1, max: 1 })
  .withHealth(1000)
  .withSpeed(1)
  .withAiValue(1)
  .build()

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: { ...readGameData('monsters.json'), WEAKLING, STINGER, PAPER_TIGER, DUMMY },
  artifacts: {
    CAPE: anArtifactDefinition().withName('Cape of Conjuring').withSlot('CAPE').build()
  },
  spells: {
    MAGIC_ARROW: aSpellDefinition()
      .withName('Magic Arrow')
      .withSchools(['AIR', 'EARTH', 'FIRE', 'WATER'])
      .withCosts([5, 4, 4, 4])
      .withDamage({ base: [10, 10, 20, 30], perPower: 10 })
      .build()
  },
  heroes: readGameData('heroes.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
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

  describe("the red hero's spells, retreat and surrender", () => {
    const aRedCaster = (army) =>
      aRedHero(army)
        .withSpellBook(true)
        .withSpells(['MAGIC_ARROW'])
        .withPrimarySkills({
          ...NO_SKILLS,
          power: 1,
          knowledge: 1
        })

    // Whitemoon, the red town with a Tavern, stands away from the heroes' row, its garrison too
    // strong for blue's hero.
    const aWhitemoon = () =>
      aTown()
        .named('Whitemoon')
        .ownedByPlayer()
        .withBuildings(['TAVERN'])
        .withGarrison(ARMY_THAT_WINS)
        .at(4, 5)

    const aFightNearWhitemoon = (...entities) =>
      aScenario()
        .withSize(30, 7)
        .withEntities(...entities, aWhitemoon())
        .withDefinitions(definitions)
        .withStartingResources({ GOLD_PILE: 1000 })

    async function retreatAndWait(user) {
      await retreat(user)
      await closeResultsAndWait(user)
    }

    async function openTavernInWhitemoon(user) {
      await user.dblClick(getTownInTownList('Whitemoon'))
      await openTavern(user)
    }

    // Ten Pikemen (speed 4) act before blue's twenty Weaklings (speed 1), worth 1200 to their 800.
    const aSurrenderFight = (redHero = aRedHero([stack('PIKEMAN', 10)])) =>
      aFightNearWhitemoon(redHero, aBlueHero([stack('WEAKLING', 20)]))

    describe('spells', () => {
      test("Cast spell is enabled on the red hero's stack's turn", async () => {
        await startBlueAttack(
          aFightTheRedHeroWins({ redHero: aRedCaster([stack('PAPER_TIGER', 1)]) })
        )

        expect(getBattleButton('Cast spell').disabled).toBe(false)
      })

      // Magic Arrow with no skill and Power 1 does 10 + 10 = 20, killing 20 one-health Weaklings
      // of the 30; it costs 5 of the red hero's 10 spell points.
      test("the red hero's Magic Arrow hits blue's stack, in the red hero's name and from his spell points", async () => {
        const { user } = await startBlueAttack(
          aFightTheRedHeroWins({
            redHero: aRedCaster([stack('PAPER_TIGER', 1)]),
            blueHero: aBlueHero([stack('WEAKLING', 30)])
          })
        )

        await castSpellAt(user, 'Magic Arrow', { row: 6, column: 1 })
        const messages = readCombatMessages()
        await playOnToNextRound(user)

        expect({
          weaklings: readBattleStacks().find(({ stack }) => stack.startsWith('Weaklings')).stack,
          cast: messages.find((message) => message.includes('casts')),
          spellPoints: await readBattleSpellPoints(user)
        }).toEqual({
          weaklings: 'Weaklings 10',
          cast: `${HERO} casts 'Magic Arrow' on the Weaklings.`,
          spellPoints: '5'
        })
      })
    })

    describe('retreat', () => {
      test("the results window shows the red hero Defeated, fleeing, and blue's hero Victorious", async () => {
        const { user } = await startBlueAttack(aFightTheRedHeroWins())

        await retreat(user)

        expect({
          attacker: readBattleResultsSide('Attacker'),
          defender: readBattleResultsSide('Defender'),
          message: readBattleResultsMessage()
        }).toEqual({
          attacker: [BLUE_HERO, 'Victorious'],
          defender: [HERO, 'Defeated'],
          message: [`The cowardly ${HERO} flees from battle.`]
        })
      })

      test("the red hero is gone from the map and blue's hero stays on it", async () => {
        const { user } = await startBlueAttack(aFightTheRedHeroWins())

        await retreatAndWait(user)

        expect(getHeroEntity('hero-1')).toBeNull()
        expect(getHeroEntity('hero-2')).not.toBeNull()
      })

      // Blue's ten Stingers strike the red Dummy first, and its 1 damage in return kills one. Blue's
      // hero, at 990, killed nothing, so stays below the 1000 of level 2; the 500 for a beaten hero
      // would have raised its Attack (the lowest roll). Its nine Stingers (speed 20) then strike
      // Sir Mullich's Weaklings first: 9 × 6 = 54, or 56 with Attack 1.
      test("blue's hero gets no 500 for the red hero", async () => {
        const { user } = await startBlueAttack(
          anAttackScenario(
            aRedHero([stack('DUMMY', 1)]),
            aBlueHero([stack('STINGER', 10)]).withExperience(990),
            aHero()
              .withId('hero-4')
              .withName(MULLICH)
              .withPrimarySkills(NO_SKILLS)
              .withArmy([stack('WEAKLING', 100)])
              .at(22, 2)
          )
        )
        await retreatAndWait(user)

        await attackMonsterAt(18, 2)
        await waitMs(1000)

        expect(readCombatMessages()[0]).toMatch('The Stingers do 54 damage.')
      })

      test('the tavern offers the red hero with the artifacts he wore', async () => {
        const { user } = await startBlueAttack(
          aFightNearWhitemoon(
            aRedHero([stack('PAPER_TIGER', 1)]).withArtifacts(['CAPE']),
            aBlueHero([stack('WEAKLING', 10)])
          )
        )
        await retreatAndWait(user)

        await openTavernInWhitemoon(user)
        await selectHeroForHire(user, HERO)

        expect(readHeroForHireDescription()).toMatch(
          new RegExp(`^${HERO} is a level 1 .* with 1 artifacts\\.$`)
        )
      })

      // The wiki: a hero who retreats on the 7th day after their turn is in the new week's tavern.
      test("given the red hero retreated in blue's turn on day 7 then the new week's tavern still offers him", async () => {
        const { user } = await setupApp(
          aFightNearWhitemoon(
            aRedHero([stack('PAPER_TIGER', 1)]).at(4, 5),
            aBlueHero([stack('WEAKLING', 10)]).at(12, 4)
          )
        )
        await endTurns(user, 6)
        await waitMs(COMPUTER_TURN_MS)
        await confirmMove(user, 8, 4)
        await waitMs(COMPUTER_TURN_MS)
        await endTurn(user)

        await retreatAndWait(user)
        await openTavernInWhitemoon(user)

        expect(readHeroesForHire()).toContain(HERO)
      })
    })

    describe('surrender', () => {
      // Ten Pikemen cost 600 to recruit, so 300; Expert Diplomacy takes 60% off.
      test("blue's hero offers safe passage for half the red creatures' cost, less the red hero's Diplomacy", async () => {
        const { user } = await startBlueAttack(
          aSurrenderFight(
            aRedHero([stack('PIKEMAN', 10)]).withSecondarySkills([
              { skill: 'DIPLOMACY', level: 'EXPERT' }
            ])
          )
        )

        await clickBattleButton(user, 'Surrender')

        expect(readBattleQuestion(querySurrenderDialog())).toBe(
          `${BLUE_HERO} states:  "I will accept your surrender and grant you and your troops safe passage for the price of 120 gold."`
        )
      })

      test('surrendering pays the gold, says the red hero departs in shame, and the tavern offers him with his creatures', async () => {
        const { user } = await startBlueAttack(aSurrenderFight())

        await surrender(user)
        expectResourceTotal('Gold', 700)
        const message = readBattleResultsMessage()
        await closeResultsAndWait(user)
        await openTavernInWhitemoon(user)
        await holdRightButtonOnHeroForHire(user, HERO)

        expect(message).toEqual([`${HERO} surrenders to the enemy, and departs in shame.`])
        expect(readArmySlots(screen.getByRole('tooltip'))[0]).toBe('Pikemen 10')
      })
    })

    test('given the red hero retreated when the page reloads then he is still gone and blue’s hero is still on the map', async () => {
      const scenario = aFightTheRedHeroWins()
      const eventLog = createMemoryEventLog()
      const { user } = await startBlueAttack(scenario, { eventLog })
      await retreatAndWait(user)

      await setupApp(scenario, { eventLog })
      await waitMs()

      expect(getHeroEntity('hero-1')).toBeNull()
      expect(getHeroEntity('hero-2')).not.toBeNull()
    })
  })
})
