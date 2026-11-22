// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import { clickEndTurn } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  attackBattleHexFrom,
  clickBattleButton,
  isBattleHexReachable,
  LOWEST_ROLLS,
  moveActiveStackTo,
  readBattleMoat,
  readBattleStacks,
  readCombatMessages
} from './battle.utils.js'
import { aCreatureDefinition, aHero, aMoat, aScenario, aTown, aTownDefinition } from './builders.js'

const aCreature = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(0)
    .withDamage({ min: 1, max: 1 })
    .withAiValue(1)

const WADER = aCreature('Wader').withHealth(10).withSpeed(20).build()
const FLYER = aCreature('Flyer').withHealth(10).withSpeed(20).withAbilities(['flying']).build()
const SNAIL = aCreature('Snail').withHealth(1000).withSpeed(2).build()
const SLUG = aCreature('Slug').withHealth(1000).withSpeed(1).build()
const BRUTE = aCreature('Brute').withHealth(1000).withSpeed(1).withAiValue(100000).build()
const BRAWLER = aCreature('Brawler').withHealth(1000).withSpeed(5).withAiValue(1000).build()
const BASHER = aCreature('Basher')
  .withHealth(1000)
  .withDamage({ min: 10, max: 10 })
  .withSpeed(10)
  .withAiValue(100000)
const SHIELDED = (defense) => aCreature('Wader').withHealth(10).withSpeed(20).withDefense(defense)
const RAIDER = aCreature('Raider').withHealth(10).withSpeed(20).withAiValue(1000).build()

const MOATED = 'MOATED'

const definitionsWith = (monsters, moat) => ({
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: {
    ...readGameData('monsters.json'),
    WADER,
    FLYER,
    SNAIL,
    SLUG,
    BRUTE,
    BRAWLER,
    ...monsters
  },
  spells: readGameData('spells.json'),
  heroes: readGameData('heroes.json'),
  towns: { [MOATED]: aTownDefinition().withName('Moated').withMoat(moat).build() },
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
})

const stack = (creature, count = 1) => ({ creature, count })

const CITADEL = ['FORT', 'CITADEL']
const CASTLE = ['FORT', 'CITADEL', 'CASTLE']

const NO_MOAT = null

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

const MOAT = [
  { row: 1, column: 11 },
  { row: 2, column: 11 },
  { row: 3, column: 10 },
  { row: 4, column: 10 },
  { row: 5, column: 9 },
  { row: 7, column: 9 },
  { row: 8, column: 10 },
  { row: 9, column: 10 },
  { row: 10, column: 11 },
  { row: 11, column: 11 }
]

const inTheBattlesData = ({ row, column }) => ({ row: row - 1, column: column - 1 })

const TWO_COLUMNS_WIDE = MOAT.flatMap((hex) => [{ ...hex, column: hex.column - 1 }, hex])

const IN_THE_MOAT = { row: 5, column: 9 }
const IN_THE_WIDER_MOATS_OUTER = { row: 2, column: 10 }
const IN_THE_WIDER_MOATS_INNER = { row: 2, column: 11 }
const OUT_OF_THE_MOAT = { row: 3, column: 3 }
const BEHIND_THE_WALLS = { row: 2, column: 13 }
const IN_FRONT_OF_THE_UPPER_WALL = { row: 2, column: 11 }
const WHERE_THE_UPPER_WALL_WAS = { row: 2, column: 12 }

const MOAT_HIT = (killed, name) => `The Moat does 70 damage. ${killed} ${name} perish.`

const UPPER_WALL_DESTROYED = [0, 0, 0.9]

function catapultRolls(values = []) {
  const rolls = [...values]
  return () => rolls.shift() ?? 0
}

const setupApp = (scenario, { catapult, eventLog } = {}) =>
  setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    eventLog,
    appConfig: {
      random: LOWEST_ROLLS,
      catapultRandom: catapultRolls(catapult),
      interactionModalTransitionMs: 0
    }
  })

const TOWN_ENTRANCE = { x: 4, y: 3 }

const anAttackScenario = ({
  army = [stack('WADER', 20), stack('SNAIL')],
  buildings = CITADEL,
  garrison = [stack('SLUG')],
  monsters = {},
  moat = aMoat().build()
} = {}) =>
  aScenario()
    .withSize(9, 7)
    .withEntities(
      aHero().withPrimarySkills(NO_SKILLS).withArmy(army).at(4, 5),
      aTown()
        .withType(MOATED)
        .named('Kirkwall')
        .ownedBy('blue')
        .withBuildings(buildings)
        .withGarrison(garrison)
        .at(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
    )
    .withDefinitions(definitionsWith(monsters, moat))

async function attackTown(scenario, options) {
  const app = await setupApp(scenario, options)
  confirmTileClickByDispatch(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
  await waitMs()
  return app
}

const COMPUTER_TURN_MS = 2000
const PLAYERS_GATE = { x: 20, y: 2 }

const aDefenceScenario = ({ garrison, blueArmy, monsters = {}, moat = aMoat().build() }) =>
  aScenario()
    .withSize(30, 6)
    .withRockAround(2, 5)
    .withEntities(
      aHero()
        .withId('hero-5')
        .withArmy([stack('SNAIL')])
        .at(2, 5),
      aTown()
        .withId('town-1')
        .withType(MOATED)
        .named('Whitemoon')
        .ownedByPlayer()
        .withBuildings(CITADEL)
        .withGarrison(garrison)
        .at(PLAYERS_GATE.x, PLAYERS_GATE.y),
      aHero()
        .withId('hero-2')
        .withName('Valeska')
        .ownedBy('blue')
        .withPrimarySkills(NO_SKILLS)
        .withArmy(blueArmy)
        .at(20, 5)
    )
    .withDefinitions(definitionsWith(monsters, moat))

async function defendAgainstBlue(scenario, options) {
  const app = await setupApp(scenario, options)
  await clickEndTurn(app.user)
  await waitMs(COMPUTER_TURN_MS)
  return app
}

async function moveAndWait(user, { row, column }) {
  await moveActiveStackTo(user, row, column)
  await waitMs(1000)
}

async function defendAndWait(user) {
  await clickBattleButton(user, 'Defend')
  await waitMs(1000)
}

const stackAt = (name) => {
  const {
    stack: found,
    row,
    column
  } = readBattleStacks().find(({ stack: each }) => each.startsWith(name))
  return { stack: found, row, column }
}

const moatLines = (name = 'Moat') =>
  readCombatMessages().filter((line) => line.startsWith(`The ${name}`))

async function wadersInTheMoat(scenarioOptions, options) {
  const app = await attackTown(anAttackScenario(scenarioOptions), options)
  await moveAndWait(app.user, IN_THE_MOAT)
  return app
}

const playOnToTheWadersNextTurn = (user) => defendAndWait(user)

describe('siege moat behavior', () => {
  describe('which battles have it', () => {
    test('a town with a Citadel has the moat drawn on its ten hexes in front of the walls', async () => {
      await attackTown(anAttackScenario({ buildings: CITADEL }))

      expect(readBattleMoat()).toEqual(MOAT)
    })

    test('a town with a Castle has the moat too', async () => {
      await attackTown(anAttackScenario({ buildings: CASTLE }))

      expect(readBattleMoat()).toEqual(MOAT)
    })

    test('a town with only a Fort has the walls and no moat', async () => {
      await attackTown(anAttackScenario({ buildings: ['FORT'] }))

      expect(readBattleMoat()).toEqual([])
    })
  })

  describe('walking into it', () => {
    test("the attacker's walking stack can reach the moat, but not the gap behind it that it could only get to through the moat", async () => {
      await attackTown(anAttackScenario(), { catapult: UPPER_WALL_DESTROYED })

      expect(
        isBattleHexReachable(IN_FRONT_OF_THE_UPPER_WALL.row, IN_FRONT_OF_THE_UPPER_WALL.column)
      ).toBe(true)
      expect(
        isBattleHexReachable(WHERE_THE_UPPER_WALL_WAS.row, WHERE_THE_UPPER_WALL_WAS.column)
      ).toBe(false)
    })

    test("the attacker's walking stack that walks into the moat stops there", async () => {
      await wadersInTheMoat()

      expect(stackAt('Waders')).toEqual({ stack: 'Waders 13', ...IN_THE_MOAT })
    })

    test('a walking stack that starts its turn in the moat walks out of it, and takes no more damage', async () => {
      const { user } = await wadersInTheMoat()
      await playOnToTheWadersNextTurn(user)

      await moveAndWait(user, OUT_OF_THE_MOAT)
      await playOnToTheWadersNextTurn(user)

      expect(stackAt('Waders')).toEqual({ stack: 'Waders 6', ...OUT_OF_THE_MOAT })
    })

    test("the defender's walking stack that goes out through the drawbridge into the moat stops there and takes the damage", async () => {
      const { user } = await defendAgainstBlue(
        aDefenceScenario({
          garrison: [stack('WADER', 20), stack('SNAIL')],
          blueArmy: [stack('BRUTE')]
        })
      )

      await moveAndWait(user, IN_THE_MOAT)

      expect(stackAt('Waders')).toEqual({ stack: 'Waders 13', ...IN_THE_MOAT })
    })

    test("the attacker's flying stack flies over the moat and lands behind the walls, its count unchanged", async () => {
      const { user } = await attackTown(
        anAttackScenario({ army: [stack('FLYER', 20), stack('SNAIL')] })
      )

      await moveAndWait(user, BEHIND_THE_WALLS)

      expect(stackAt('Flyers')).toEqual({ stack: 'Flyers 20', ...BEHIND_THE_WALLS })
    })
  })

  describe('its damage', () => {
    test('a stack walking into the moat takes 70 damage, and the log says so and how many perish', async () => {
      await wadersInTheMoat()

      expect(moatLines()).toEqual([MOAT_HIT(7, 'Waders')])
    })

    test('a flying stack landing in the moat takes 70 damage', async () => {
      const { user } = await attackTown(
        anAttackScenario({ army: [stack('FLYER', 20), stack('SNAIL')] })
      )

      await moveAndWait(user, IN_THE_MOAT)

      expect(stackAt('Flyers')).toEqual({ stack: 'Flyers 13', ...IN_THE_MOAT })
    })

    test('a stack still in the moat as its turn starts takes 70 damage again', async () => {
      const { user } = await wadersInTheMoat()

      await playOnToTheWadersNextTurn(user)

      expect(moatLines()).toEqual([MOAT_HIT(7, 'Waders'), MOAT_HIT(7, 'Waders')])
    })

    test('as the round starts the catapult shoots first, then the moat hits the stack whose turn starts', async () => {
      const { user } = await wadersInTheMoat()

      await playOnToTheWadersNextTurn(user)

      expect(readCombatMessages().slice(-2)).toEqual([
        'The Catapult hits the Upper Wall, but does no damage.',
        MOAT_HIT(7, 'Waders')
      ])
    })

    test('a stack that waits in the moat is not hit again when its turn comes back', async () => {
      const { user } = await wadersInTheMoat()
      await playOnToTheWadersNextTurn(user)

      await clickBattleButton(user, 'Wait')
      await waitMs(1000)
      await defendAndWait(user)

      expect(stackAt('Waders')).toEqual({ stack: 'Waders 6', ...IN_THE_MOAT })
    })

    test('a stack walking into the moat to attack takes the damage before it strikes, and strikes with the ones left', async () => {
      const { user } = await attackTown(anAttackScenario({ garrison: [stack('BRAWLER')] }))
      await defendAndWait(user)
      await defendAndWait(user)

      await attackBattleHexFrom(user, 6, 10, 'top-left')
      await waitMs(1000)

      const messages = readCombatMessages()
      const moatHit = messages.indexOf(MOAT_HIT(7, 'Waders'))
      expect(messages.slice(moatHit, moatHit + 2)).toEqual([
        MOAT_HIT(7, 'Waders'),
        'The Waders do 13 damage.'
      ])
    })

    test('a stack killed by the moat on its way to attack does not strike', async () => {
      const { user } = await attackTown(
        anAttackScenario({
          army: [stack('WADER', 7), stack('SNAIL')],
          garrison: [stack('BRAWLER')]
        })
      )
      await defendAndWait(user)
      await defendAndWait(user)

      await attackBattleHexFrom(user, 6, 10, 'top-left')
      await waitMs(1000)

      expect(readCombatMessages().filter((line) => line.startsWith('The Wader'))).toEqual([])
    })

    test("when the page reloads the stack's count is as the moat left it, and the moat doesn't hit it again", async () => {
      const eventLog = createMemoryEventLog()
      await wadersInTheMoat({}, { eventLog })

      await setupApp(anAttackScenario(), { eventLog })
      await waitMs(1000)

      expect(stackAt('Waders')).toEqual({ stack: 'Waders 13', ...IN_THE_MOAT })
    })
  })

  describe('its Defense', () => {
    async function bashedInTheMoat(defense) {
      const monsters = { WADER: SHIELDED(defense).build(), BASHER: BASHER.build() }
      const { user } = await defendAgainstBlue(
        aDefenceScenario({
          garrison: [stack('WADER', 20)],
          blueArmy: [stack('BASHER', 10)],
          monsters
        })
      )
      await moveAndWait(user, IN_THE_MOAT)
      return readCombatMessages()
    }

    test('an attack on a stack in the moat does the damage for 3 less Defense', async () => {
      const messages = await bashedInTheMoat(5)

      expect(messages).toContain('The Bashers do 95 damage. 9 Waders perish.')
    })

    test('a stack with Defense below 3 in the moat takes the damage for Defense 0', async () => {
      const messages = await bashedInTheMoat(1)

      expect(messages).toContain('The Bashers do 100 damage. 10 Waders perish.')
    })
  })

  describe("from its town's data", () => {
    test('a town type without a moat has the walls and no moat, even with a Castle', async () => {
      await attackTown(anAttackScenario({ buildings: CASTLE, moat: NO_MOAT }))

      expect(readBattleMoat()).toEqual([])
    })

    test('a moat that comes with the Fort is there with only a Fort', async () => {
      await attackTown(
        anAttackScenario({ buildings: ['FORT'], moat: aMoat().withFrom('FORT').build() })
      )

      expect(readBattleMoat()).toEqual(MOAT)
    })

    test('the moat is drawn on the hexes its town lists', async () => {
      await attackTown(
        anAttackScenario({
          moat: aMoat().withHexes(TWO_COLUMNS_WIDE.map(inTheBattlesData)).build()
        })
      )

      expect(readBattleMoat()).toEqual(TWO_COLUMNS_WIDE)
    })

    test('a walking stack can reach the outer column of a wider moat, but not the inner one behind it', async () => {
      await attackTown(
        anAttackScenario({
          moat: aMoat().withHexes(TWO_COLUMNS_WIDE.map(inTheBattlesData)).build()
        })
      )

      expect(
        isBattleHexReachable(IN_THE_WIDER_MOATS_OUTER.row, IN_THE_WIDER_MOATS_OUTER.column)
      ).toBe(true)
      expect(
        isBattleHexReachable(IN_THE_WIDER_MOATS_INNER.row, IN_THE_WIDER_MOATS_INNER.column)
      ).toBe(false)
    })

    test("a stack walking into the moat takes its town's damage, and the log names the moat", async () => {
      await wadersInTheMoat({ moat: aMoat().withName('Swamp').withDamage(90).build() })

      expect(moatLines('Swamp')).toEqual(['The Swamp does 90 damage. 9 Waders perish.'])
    })

    test("an attack on a stack in the moat does the damage for its town's Defense loss", async () => {
      const monsters = { WADER: SHIELDED(5).build(), BASHER: BASHER.build() }
      const { user } = await defendAgainstBlue(
        aDefenceScenario({
          garrison: [stack('WADER', 20)],
          blueArmy: [stack('BASHER', 10)],
          monsters,
          moat: aMoat().withDefensePenalty(5).build()
        })
      )

      await moveAndWait(user, IN_THE_MOAT)

      expect(readCombatMessages()).toContain('The Bashers do 100 damage. 10 Waders perish.')
    })

    test("a walking stack walks through a moat that doesn't stop walkers into the gap behind it, unharmed", async () => {
      const { user } = await attackTown(
        anAttackScenario({ moat: aMoat().withStopsWalkers(false).build() }),
        { catapult: UPPER_WALL_DESTROYED }
      )

      await moveAndWait(user, WHERE_THE_UPPER_WALL_WAS)

      expect(stackAt('Waders')).toEqual({ stack: 'Waders 20', ...WHERE_THE_UPPER_WALL_WAS })
    })

    test("a stack walking into a moat that doesn't hit on entering keeps its count", async () => {
      await wadersInTheMoat({ moat: aMoat().withHitsOnEntering(false).build() })

      expect(stackAt('Waders')).toEqual({ stack: 'Waders 20', ...IN_THE_MOAT })
    })

    test("a stack still in a moat that doesn't hit as turns start isn't hit again", async () => {
      const { user } = await wadersInTheMoat({
        moat: aMoat().withHitsAsTurnStarts(false).build()
      })

      await playOnToTheWadersNextTurn(user)

      expect(stackAt('Waders')).toEqual({ stack: 'Waders 13', ...IN_THE_MOAT })
    })

    test("the defender's walking stack that goes into a moat that affects only the attacker keeps its count", async () => {
      const { user } = await defendAgainstBlue(
        aDefenceScenario({
          garrison: [stack('WADER', 20), stack('SNAIL')],
          blueArmy: [stack('BRUTE')],
          moat: aMoat().withAffects(['attacker']).build()
        })
      )

      await moveAndWait(user, IN_THE_MOAT)

      expect(stackAt('Waders')).toEqual({ stack: 'Waders 20', ...IN_THE_MOAT })
    })
  })

  describe('the computer', () => {
    test("blue's walking stack attacking the player's town through a gap in the walls stops in the moat in front of it", async () => {
      await defendAgainstBlue(
        aDefenceScenario({
          garrison: [stack('SLUG')],
          blueArmy: [stack('RAIDER', 20)],
          monsters: { RAIDER }
        }),
        { catapult: UPPER_WALL_DESTROYED }
      )

      const { stack: raiders, row, column } = stackAt('Raiders')
      expect(raiders).toBe('Raiders 13')
      expect(MOAT).toContainEqual({ row, column })
    })
  })
})
