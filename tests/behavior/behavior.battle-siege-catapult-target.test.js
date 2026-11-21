// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import { clickEndTurn } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  getCursorOver,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import {
  attackBattleHexFrom,
  castSpellAt,
  clickBattleButton,
  closeBattleResults,
  getBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
  LOWEST_ROLLS,
  moveActiveStackTo,
  pickSpell,
  pointAtBattleHexSide,
  readActiveStack,
  readBattleCasualties,
  readBattleCatapult,
  readBattleCatapultPicture,
  readBattleResultsMessage,
  readBattleStacks,
  readCombatMessages,
  shootAt,
  waitForBattleResults
} from './battle.utils.js'
import { ARMY_THAT_WINS, aCreatureDefinition, aHero, aScenario, aTown } from './builders.js'

const aSturdyCreature = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(50)
    .withDamage({ min: 1, max: 1 })
    .withHealth(1000)

const RUNNER = aSturdyCreature('Runner').withSpeed(20).withAiValue(1).build()
const BRUTE = aSturdyCreature('Brute').withSpeed(1).withAiValue(1000).build()
// Attack 10 against the catapult's Defense 10: each does its 10 damage.
const STRIKER = aSturdyCreature('Striker')
  .withSpeed(20)
  .withAttack(10)
  .withDamage({ min: 10, max: 10 })
  .build()
// It shoots from where it starts rather than walk out of the town.
const ARCHER = aSturdyCreature('Archer')
  .withSpeed(1)
  .withAttack(10)
  .withDamage({ min: 10, max: 10 })
  .withShots(99)
  .withAbilities(['ranged'])
  .build()
const SPRINTER = aSturdyCreature('Sprinter')
  .withSpeed(20)
  .withShots(99)
  .withAbilities(['ranged'])
  .build()
const WEAKLING = aCreatureDefinition()
  .withName('Weakling')
  .withNamePlural('Weaklings')
  .withAttack(0)
  .withDefense(0)
  .withDamage({ min: 1, max: 1 })
  .withHealth(1)
  .withSpeed(1)
  .withAiValue(1)
  .build()
// Blue's hero takes it for strong enough to attack the town with.
const BLUFFER = aCreatureDefinition()
  .withName('Bluffer')
  .withNamePlural('Bluffers')
  .withAttack(0)
  .withDefense(0)
  .withDamage({ min: 1, max: 1 })
  .withHealth(1)
  .withSpeed(1)
  .withAiValue(1000)
  .build()
const WRECKER = aCreatureDefinition()
  .withName('Wrecker')
  .withNamePlural('Wreckers')
  .withAttack(10)
  .withDefense(0)
  .withDamage({ min: 10, max: 10 })
  .withHealth(1)
  .withSpeed(20)
  .withAiValue(1)
  .build()
const KILLER = aSturdyCreature('Killer')
  .withSpeed(20)
  .withAttack(50)
  .withDamage({ min: 100, max: 100 })
  .withAiValue(1)
  .build()

const gameSpells = readGameData('spells.json')

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: {
    ...readGameData('monsters.json'),
    RUNNER,
    BRUTE,
    STRIKER,
    ARCHER,
    SPRINTER,
    WEAKLING,
    BLUFFER,
    WRECKER,
    KILLER
  },
  spells: {
    ...gameSpells,
    CRUSH: { ...gameSpells.MAGIC_ARROW, name: 'Crush', notOnWarMachines: true },
    CHEER: { ...gameSpells.MIRTH, name: 'Cheer' }
  },
  heroes: readGameData('heroes.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const stack = (creature, count = 1) => ({ creature, count })

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

// Rows and columns from 1, as the battle screen shows them.
const CATAPULT = { row: 8, column: 1 }
const NEXT_TO_THE_CATAPULT = { row: 8, column: 2 }
const BELOW_THE_CATAPULT = { row: 9, column: 1 }
const TOP_LEFT_CORNER = { row: 1, column: 1 }
const BELOW_THE_CORNER = { row: 2, column: 1 }
const BLUES_STACK = { row: 6, column: 1 }

const catapultMessages = () =>
  readCombatMessages().filter((message) => message.startsWith('The Catapult'))

const setupApp = (scenario, { eventLog } = {}) =>
  setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: {
      random: LOWEST_ROLLS,
      catapultRandom: LOWEST_ROLLS,
      battleStepDelayMs: 0,
      interactionModalTransitionMs: 0
    },
    ...(eventLog ? { eventLog } : {})
  })

// The player's stack defends and the other side's stacks play their turns, and the next round
// starts.
async function passTheRound(user) {
  await clickBattleButton(user, 'Defend')
  await waitMs(1000)
}

async function attackTheCatapult(user) {
  await attackBattleHexFrom(user, CATAPULT.row, CATAPULT.column, 'right')
}

// Blue's hero attacks the player's town during blue's turn. The town's gate is at (20, 2), blue's
// hero three tiles below it; the player's other hero is walled in by rock far away.
const COMPUTER_TURN_MS = 2000
const PLAYERS_GATE = { x: 20, y: 2 }

const aRedHeroInTown = (army, { spells = [] } = {}) =>
  aHero()
    .withName('Lord Haart')
    .withPrimarySkills({ attack: 0, defense: 0, power: 2, knowledge: 5 })
    .withSpellBook(true)
    .withSpells(spells)
    .withArmy(army)
    .at(PLAYERS_GATE.x, PLAYERS_GATE.y)

const aDefenceScenario = ({
  garrison = [],
  blueArmy = [stack('BRUTE')],
  blueSkills = NO_SKILLS,
  redHero = null
}) =>
  aScenario()
    .withSize(30, 6)
    .withRockAround(2, 5)
    .withEntities(
      aHero().withId('hero-5').withArmy(ARMY_THAT_WINS).at(2, 5),
      aTown()
        .withId('town-1')
        .named('Whitemoon')
        .ownedByPlayer()
        .withBuildings(['FORT'])
        .withGarrison(garrison)
        .at(PLAYERS_GATE.x, PLAYERS_GATE.y),
      aHero()
        .withId('hero-2')
        .withName('Valeska')
        .ownedBy('blue')
        .withPrimarySkills(blueSkills)
        .withArmy(blueArmy)
        .at(20, 5),
      ...(redHero ? [redHero] : [])
    )
    .withDefinitions(definitions)

async function defendAgainstBlue(scenario, options) {
  const app = await setupApp(scenario, options)
  await clickEndTurn(app.user)
  await waitMs(COMPUTER_TURN_MS)
  return app
}

// The player's hero attacks blue's towns; Kirkwall's entrance is at (4, 3), the hero two tiles
// below it, and Southwatch's at (10, 3).
const KIRKWALL = { x: 4, y: 3 }
const SOUTHWATCH = { x: 10, y: 3 }

const aBlueTown = ({ id = 'town-1', name = 'Kirkwall', at = KIRKWALL, garrison }) =>
  aTown()
    .withId(id)
    .named(name)
    .ownedBy('blue')
    .withBuildings(['FORT'])
    .withGarrison(garrison)
    .at(at.x, at.y)

const anAttackScenario = ({ army = [stack('RUNNER')], garrison = [stack('BRUTE')], others = [] }) =>
  aScenario()
    .withSize(14, 7)
    .withEntities(
      aHero()
        .withName('Lord Haart')
        .withPrimarySkills({ ...NO_SKILLS, knowledge: 2 })
        .withSpellBook(true)
        .withSpells(['SHIELD', 'CHEER'])
        .withArmy(army)
        .at(4, 5),
      aBlueTown({ garrison }),
      ...others
    )
    .withDefinitions(definitions)

async function attackTown(scenario, options) {
  const app = await setupApp(scenario, options)
  confirmTileClickByDispatch(KIRKWALL.x, KIRKWALL.y)
  await waitMs()
  return app
}

// The player's stack goes to the far corner, out of the way of blue's garrison.
async function moveIntoTheCorner(user) {
  await moveActiveStackTo(user, TOP_LEFT_CORNER.row, TOP_LEFT_CORNER.column)
  await waitMs(1000)
}

describe('siege catapult as a target behavior', () => {
  describe('attacking it', () => {
    test("the defender's walking stack attacks the catapult, the log says the damage, and the catapult doesn't strike back", async () => {
      const { user } = await defendAgainstBlue(
        aDefenceScenario({ garrison: [stack('STRIKER', 10)] })
      )

      await attackTheCatapult(user)

      expect({
        hit: readCombatMessages().includes('The Strikers do 100 damage.'),
        struckBack: readCombatMessages().filter((message) => /^The Catapult does? \d/.test(message))
      }).toEqual({ hit: true, struckBack: [] })
    })

    test("the defender's shooter shoots the catapult", async () => {
      const { user } = await defendAgainstBlue(
        aDefenceScenario({ garrison: [stack('ARCHER', 10)] })
      )

      await shootAt(user, CATAPULT.row, CATAPULT.column)

      expect(readCombatMessages()).toContain('The Archers do 50 damage.')
    })

    // Defense 10 + 10 against Attack 10: 25% less.
    test("the attacking hero's Defense lowers the damage the catapult takes", async () => {
      const { user } = await defendAgainstBlue(
        aDefenceScenario({
          garrison: [stack('STRIKER', 10)],
          blueSkills: { ...NO_SKILLS, defense: 10 }
        })
      )

      await attackTheCatapult(user)

      expect(readCombatMessages()).toContain('The Strikers do 75 damage.')
    })

    test("hovering the catapult with a defender's stack shows the attack cursor and the attack with its damage", async () => {
      const { user } = await defendAgainstBlue(
        aDefenceScenario({ garrison: [stack('STRIKER', 10)] })
      )
      await loadAppStyles()

      await pointAtBattleHexSide(user, CATAPULT.row, CATAPULT.column, 'right')

      expect({
        status: getBattleStatusBarText(),
        cursor: getCursorOver(getBattleHex(CATAPULT.row, CATAPULT.column))
      }).toEqual({ status: 'Attack Catapult (damage 100)', cursor: 'battle-attack-from-right' })
    })

    // Blue's Brute walks one hex a round towards it, and is still two hexes away.
    test("a defender's shooter next to the catapult can't shoot and attacks in melee", async () => {
      const { user } = await defendAgainstBlue(aDefenceScenario({ garrison: [stack('SPRINTER')] }))
      await moveActiveStackTo(user, BELOW_THE_CATAPULT.row, BELOW_THE_CATAPULT.column)
      await waitMs(1000)
      const brute = readBattleStacks().find(({ stack }) => stack === 'Brute 1')

      await pointAtBattleHexSide(user, brute.row, brute.column, 'bottom-right')

      expect(getBattleStatusBarText()).toMatch(/^Attack Brute/)
    })
  })

  describe('destroyed', () => {
    const DESTROYING_ARMY = [stack('STRIKER', 100)]

    test('when the catapult is destroyed the log says so and it is shown as a wreck', async () => {
      const { user } = await defendAgainstBlue(aDefenceScenario({ garrison: DESTROYING_ARMY }))

      await attackTheCatapult(user)

      expect({
        log: readCombatMessages().find((message) => message.startsWith('The Strikers')),
        destroyed: catapultMessages().at(-1),
        picture: readBattleCatapultPicture()
      }).toEqual({
        log: 'The Strikers do 1000 damage.',
        destroyed: 'The Catapult is destroyed.',
        picture: 'Destroyed Catapult'
      })
    })

    test("a destroyed catapult doesn't shoot when the next round starts", async () => {
      const { user } = await defendAgainstBlue(aDefenceScenario({ garrison: DESTROYING_ARMY }))
      await attackTheCatapult(user)

      await passTheRound(user)

      expect(catapultMessages()).toEqual([
        'The Catapult hits the Upper Wall, but does no damage.',
        'The Catapult is destroyed.'
      ])
    })

    test("a stack can walk onto the wreck's hexes", async () => {
      const { user } = await defendAgainstBlue(aDefenceScenario({ garrison: DESTROYING_ARMY }))
      await attackTheCatapult(user)

      await moveActiveStackTo(user, CATAPULT.row, CATAPULT.column)

      expect(readBattleStacks()).toContainEqual({ stack: 'Strikers 100', ...CATAPULT })
    })

    test("blue's defending stacks go for the player's stack once they have destroyed the catapult", async () => {
      const { user } = await attackTown(anAttackScenario({ garrison: [stack('WRECKER', 100)] }))
      await moveIntoTheCorner(user)

      await passTheRound(user)

      expect(readBattleStacks().find(({ stack }) => stack.startsWith('Wreckers'))).toEqual({
        stack: 'Wreckers 99',
        ...BELOW_THE_CORNER
      })
    })
  })

  describe('the battle', () => {
    test('without Ballistics the catapult has no turn of its own: the first stack acts after its shot, every round', async () => {
      const { user } = await attackTown(anAttackScenario({}))

      await passTheRound(user)

      expect(readActiveStack()).toEqual({ stack: 'Runner 1', row: 6, column: 1 })
    })

    test("when the attacker's last creature dies with the catapult standing, the attacker loses", async () => {
      const { user } = await defendAgainstBlue(
        aDefenceScenario({ garrison: [stack('KILLER', 10)], blueArmy: [stack('BLUFFER')] })
      )

      await attackBattleHexFrom(user, BLUES_STACK.row, BLUES_STACK.column, 'right')
      await waitForBattleResults()

      expect(readBattleResultsMessage()[0]).toBe('A glorious victory!')
    })

    test("when the catapult was destroyed, the results window lists it among the attacker's casualties", async () => {
      const { user } = await defendAgainstBlue(
        aDefenceScenario({ garrison: [stack('STRIKER', 100)], blueArmy: [stack('WEAKLING')] })
      )
      await attackTheCatapult(user)

      await attackBattleHexFrom(user, BLUES_STACK.row, BLUES_STACK.column, 'right')
      await waitForBattleResults()

      expect(readBattleCasualties('Attacker')).toEqual(['Weakling 1', 'Catapult 1'])
    })

    // One Weakling of 1 health, and 500 for the beaten hero.
    test('the defending hero earns no experience for destroying the catapult', async () => {
      const { user } = await defendAgainstBlue(
        aDefenceScenario({
          blueArmy: [stack('WEAKLING')],
          redHero: aRedHeroInTown([stack('STRIKER', 100)])
        })
      )
      await attackTheCatapult(user)

      await attackBattleHexFrom(user, BLUES_STACK.row, BLUES_STACK.column, 'right')
      await waitForBattleResults()

      expect(readBattleResultsMessage()).toEqual([
        'A glorious victory!',
        'For valor in combat, Lord Haart receives 501 experience'
      ])
    })

    test('the attacking hero has a catapult again at the next siege', async () => {
      const { user } = await attackTown(
        anAttackScenario({
          army: [stack('KILLER', 10)],
          garrison: [stack('WRECKER', 100)],
          others: [
            aBlueTown({
              id: 'town-2',
              name: 'Southwatch',
              at: SOUTHWATCH,
              garrison: [stack('BRUTE')]
            })
          ]
        })
      )
      await moveIntoTheCorner(user)
      await attackBattleHexFrom(
        user,
        NEXT_TO_THE_CATAPULT.row,
        NEXT_TO_THE_CATAPULT.column,
        'right'
      )
      await waitForBattleResults()
      await closeBattleResults(user)
      await waitMs(1000)

      confirmTileClickByDispatch(SOUTHWATCH.x, SOUTHWATCH.y)
      await waitMs(1000)

      expect({ catapult: readBattleCatapult(), picture: readBattleCatapultPicture() }).toEqual({
        catapult: CATAPULT,
        picture: 'Catapult'
      })
    })

    test("blue's defending stacks go for the catapult when it is the nearest enemy stack", async () => {
      const { user } = await attackTown(anAttackScenario({ garrison: [stack('STRIKER')] }))
      await moveIntoTheCorner(user)

      await passTheRound(user)

      expect(readCombatMessages()).toContain('The Striker does 10 damage.')
    })
  })

  describe('spells', () => {
    const aCasterDefending = (spells) =>
      aDefenceScenario({ redHero: aRedHeroInTown([stack('RUNNER')], { spells }) })

    test('Magic Arrow cast by the defending hero damages the catapult', async () => {
      const { user } = await defendAgainstBlue(aCasterDefending(['MAGIC_ARROW']))

      await castSpellAt(user, 'Magic Arrow', CATAPULT)

      expect(readCombatMessages().slice(-2)).toEqual([
        "Lord Haart casts 'Magic Arrow' on the Catapult.",
        'The Magic Arrow does 30 damage.'
      ])
    })

    test('a Fireball whose area covers only the catapult damages it', async () => {
      const { user } = await defendAgainstBlue(aCasterDefending(['FIREBALL']))

      await castSpellAt(user, 'Fireball', NEXT_TO_THE_CATAPULT)

      expect(readCombatMessages().at(-1)).toBe('The Fireball does 35 damage.')
    })

    test("a spell war machines are immune to can't be cast on the catapult", async () => {
      const { user } = await defendAgainstBlue(aCasterDefending(['CRUSH']))
      await loadAppStyles()
      await pickSpell(user, 'Crush')

      await hoverBattleHex(user, CATAPULT.row, CATAPULT.column)

      expect([
        getBattleStatusBarText(),
        getCursorOver(getBattleHex(CATAPULT.row, CATAPULT.column))
      ]).toEqual(['Select Spell Target', 'battle-blocked'])
    })

    test("a mind spell can't be cast on the catapult", async () => {
      const { user } = await attackTown(anAttackScenario({}))
      await loadAppStyles()
      await pickSpell(user, 'Cheer')

      await hoverBattleHex(user, CATAPULT.row, CATAPULT.column)

      expect([
        getBattleStatusBarText(),
        getCursorOver(getBattleHex(CATAPULT.row, CATAPULT.column))
      ]).toEqual(['Select Spell Target', 'battle-blocked'])
    })

    test('the attacking hero can cast Shield on their own catapult', async () => {
      const { user } = await attackTown(anAttackScenario({}))

      await castSpellAt(user, 'Shield', CATAPULT)

      expect(readCombatMessages().at(-1)).toBe("Lord Haart casts 'Shield' on the Catapult.")
    })
  })

  describe('reloading', () => {
    // 50 Wreckers do 500 a strike: the first leaves it standing, the second destroys it.
    test('after a reload a damaged catapult keeps its damage: the next hit destroys it', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = () => anAttackScenario({ garrison: [stack('WRECKER', 50)] })
      const { user } = await attackTown(scenario(), { eventLog })
      await moveIntoTheCorner(user)

      const reloaded = await setupApp(scenario(), { eventLog })
      await waitMs(1000)
      await passTheRound(reloaded.user)

      expect(catapultMessages().at(-1)).toBe('The Catapult is destroyed.')
    })

    test("after a reload a destroyed catapult is still a wreck and doesn't shoot", async () => {
      const eventLog = createMemoryEventLog()
      const scenario = () => anAttackScenario({ garrison: [stack('WRECKER', 100)] })
      const { user } = await attackTown(scenario(), { eventLog })
      await moveIntoTheCorner(user)

      const reloaded = await setupApp(scenario(), { eventLog })
      await waitMs(1000)
      await passTheRound(reloaded.user)

      expect({
        picture: readBattleCatapultPicture(),
        shots: catapultMessages().filter((message) => message.includes('Wall'))
      }).toEqual({
        picture: 'Destroyed Catapult',
        shots: ['The Catapult hits the Upper Wall, but does no damage.']
      })
    })
  })
})
