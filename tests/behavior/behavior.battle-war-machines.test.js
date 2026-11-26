// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import {
  clickEndTurn,
  closeLevelUpPopup,
  queryLevelUpPopup,
  readMessagePictures
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  attackBattleHexFrom,
  clickBattleButton,
  closeBattleResults,
  LOWEST_ROLLS,
  moveActiveStackTo,
  readActiveStack,
  readBattleCasualties,
  readBattleResultsMessage,
  readBattleStacks,
  readCombatMessages,
  reloadBattle,
  shootAt,
  startBattle,
  waitForBattleResults
} from './battle.utils.js'
import {
  ARMY_THAT_WINS,
  aCreatureDefinition,
  aHero,
  aMonster,
  anArtifactDefinition,
  aScenario,
  aTown,
  aWarMachineDefinition
} from './builders.js'
import { clickHeroInHeroList, readHeroScreenWarMachines } from './hero-screen.utils.js'

const aSturdyCreature = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(50)
    .withDamage({ min: 1, max: 1 })
    .withHealth(1000)

const aBattleWarMachine = (name, abilities) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(10)
    .withDamage({ min: 0, max: 0 })
    .withHealth(1000)
    .withSpeed(0)
    .withAbilities(['warMachine', ...abilities])
    .build()

const RUNNER = aSturdyCreature('Runner').withSpeed(20).build()
const BRUTE = aSturdyCreature('Brute').withSpeed(1).build()
const STRIKER = aSturdyCreature('Striker')
  .withSpeed(20)
  .withAttack(10)
  .withDamage({ min: 10, max: 10 })
  .build()
const ARCHER = aSturdyCreature('Archer')
  .withSpeed(1)
  .withAttack(10)
  .withDamage({ min: 10, max: 10 })
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
const WRECKER = aCreatureDefinition()
  .withName('Wrecker')
  .withNamePlural('Wreckers')
  .withAttack(10)
  .withDefense(0)
  .withDamage({ min: 10, max: 10 })
  .withHealth(1)
  .withSpeed(20)
  .build()
const KILLER = aSturdyCreature('Killer')
  .withSpeed(20)
  .withAttack(50)
  .withDamage({ min: 100, max: 100 })
  .build()

const GUARD = aSturdyCreature('Guard')
  .withSpeed(5)
  .withAttack(50)
  .withDamage({ min: 100, max: 100 })
  .build()

const BALLISTA = 'BALLISTA'
const AMMO_CART = 'AMMO_CART'
const FIRST_AID_TENT = 'FIRST_AID_TENT'
const ALL_WAR_MACHINES = [BALLISTA, AMMO_CART, FIRST_AID_TENT]
const CHARM = 'CHARM'

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  spells: readGameData('spells.json'),
  heroes: readGameData('heroes.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json'),
  monsters: {
    ...readGameData('monsters.json'),
    RUNNER,
    BRUTE,
    STRIKER,
    ARCHER,
    WEAKLING,
    WRECKER,
    KILLER,
    GUARD,
    TEST_BALLISTA: aBattleWarMachine('Ballista', ['doubleWide']),
    TEST_AMMO_CART: aBattleWarMachine('Ammo Cart', []),
    TEST_FIRST_AID_TENT: aBattleWarMachine('First Aid Tent', ['doubleWide'])
  },
  artifacts: {
    [CHARM]: anArtifactDefinition().withName('Charm').withSlot('MISC').build(),
    [BALLISTA]: aWarMachineDefinition()
      .withName('Ballista')
      .withSlot('BALLISTA')
      .withCreature('TEST_BALLISTA')
      .build(),
    [AMMO_CART]: aWarMachineDefinition()
      .withName('Ammo Cart')
      .withSlot('AMMO_CART')
      .withCreature('TEST_AMMO_CART')
      .build(),
    [FIRST_AID_TENT]: aWarMachineDefinition()
      .withName('First Aid Tent')
      .withSlot('FIRST_AID_TENT')
      .withCreature('TEST_FIRST_AID_TENT')
      .build()
  }
}

const stack = (creature, count = 1) => ({ creature, count })

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }
const HERO = 'Lord Haart'
const ENEMY_HERO = 'Valeska'
const MULLICH = 'Sir Mullich'

const OWN_STACK = { row: 6, column: 1 }
const ENEMY_STACK = { row: 6, column: 15 }
const ENEMY_BALLISTA = { row: 4, column: 15 }
const ENEMY_AMMO_CART = { row: 2, column: 15 }
const ENEMY_FIRST_AID_TENT = { row: 10, column: 15 }
const BOTTOM_LEFT_CORNER = { row: 11, column: 1 }

const aRedHero = ({ army, warMachines = [] }) =>
  aHero().withName(HERO).withPrimarySkills(NO_SKILLS).withArmy(army).withArtifacts(warMachines)

const aBlueHero = ({ army = [stack('BRUTE')], warMachines = [], skills = NO_SKILLS } = {}) =>
  aHero()
    .withId('hero-2')
    .withName(ENEMY_HERO)
    .ownedBy('blue')
    .withPrimarySkills(skills)
    .withArmy(army)
    .withArtifacts(warMachines)

const aFightWithAMonster = ({ hero }) =>
  aScenario()
    .withSize(3)
    .withEntities(hero.at(0, 0), aMonster().withType('BRUTE').withCount(1).withStacks(1).at(1, 0))
    .withDefinitions(definitions)

const aFightWithAHero = ({ hero, enemy, others = [] }) =>
  aScenario()
    .withSize(3, 3)
    .withEntities(hero.at(0, 0), enemy.at(1, 0), ...others)
    .withDefinitions(definitions)

const fight = (scenario, options) => startBattle(scenario, { battleStepDelayMs: 0, ...options })

const stackOf = (name) => readBattleStacks().find(({ stack }) => stack.startsWith(name))

const stackNames = () =>
  readBattleStacks()
    .map(({ stack }) => stack)
    .sort()

async function passTheRound(user) {
  await clickBattleButton(user, 'Defend')
  await waitMs(1000)
}

async function attackFromTheLeft(user, { row, column }) {
  await attackBattleHexFrom(user, row, column, 'left')
  await waitMs(1000)
}

async function attackStackOf(user, name) {
  const { row, column } = stackOf(name)
  await attackBattleHexFrom(user, row, column, 'left')
  await waitForBattleResults()
}

async function closeResultsAndLevelUp(user, heroName) {
  await closeBattleResults(user)
  await waitMs(1000)
  if (queryLevelUpPopup(heroName)) {
    await closeLevelUpPopup(user, heroName)
  }
}

describe('war machines in battle behavior', () => {
  describe('on the battlefield', () => {
    test("the attacking hero's Ammo Cart, Ballista and First Aid Tent stand in their places on the left", async () => {
      await fight(
        aFightWithAMonster({
          hero: aRedHero({ army: [stack('RUNNER')], warMachines: ALL_WAR_MACHINES })
        })
      )

      expect(readBattleStacks()).toContainEqual({ stack: 'Ammo Cart 1', row: 2, column: 1 })
      expect(readBattleStacks()).toContainEqual({ stack: 'Ballista 1', row: 4, column: 1 })
      expect(readBattleStacks()).toContainEqual({ stack: 'First Aid Tent 1', row: 10, column: 1 })
    })

    test('the Ballista and the First Aid Tent take two hexes, their back halves on the edge column', async () => {
      await fight(
        aFightWithAMonster({
          hero: aRedHero({ army: [stack('RUNNER')], warMachines: ALL_WAR_MACHINES })
        })
      )

      expect(readBattleStacks()).toContainEqual({
        stack: 'Ballista (back half)',
        row: 4,
        column: 0
      })
      expect(readBattleStacks()).toContainEqual({
        stack: 'First Aid Tent (back half)',
        row: 10,
        column: 0
      })
    })

    test("the defending hero's war machines stand in their places on the right", async () => {
      await fight(
        aFightWithAHero({
          hero: aRedHero({ army: [stack('RUNNER')] }),
          enemy: aBlueHero({ warMachines: ALL_WAR_MACHINES })
        })
      )

      expect(readBattleStacks()).toContainEqual({ stack: 'Ammo Cart 1', ...ENEMY_AMMO_CART })
      expect(readBattleStacks()).toContainEqual({ stack: 'Ballista 1', ...ENEMY_BALLISTA })
      expect(readBattleStacks()).toContainEqual({
        stack: 'First Aid Tent 1',
        ...ENEMY_FIRST_AID_TENT
      })
    })

    test('a hero with no war machines has none in battle, and a monster has none', async () => {
      await fight(aFightWithAMonster({ hero: aRedHero({ army: [stack('RUNNER')] }) }))

      expect(stackNames()).toEqual(['Brute 1', 'Runner 1'])
    })
  })

  describe('as targets', () => {
    test("the hero's stack walks to the enemy hero's Ballista and attacks it, the log says the damage, and the Ballista doesn't strike back", async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero({ army: [stack('STRIKER', 10)] }),
          enemy: aBlueHero({ warMachines: [BALLISTA] })
        })
      )

      await attackFromTheLeft(user, ENEMY_BALLISTA)

      expect(readCombatMessages()).toContain('The Strikers do 100 damage.')
      expect(readCombatMessages().filter((message) => message.startsWith('The Ballista'))).toEqual(
        []
      )
    })

    test("the hero's shooter shoots the enemy hero's Ammo Cart", async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero({ army: [stack('ARCHER', 10)] }),
          enemy: aBlueHero({ warMachines: [AMMO_CART] })
        })
      )

      await shootAt(user, ENEMY_AMMO_CART.row, ENEMY_AMMO_CART.column)

      expect(readCombatMessages()).toContain('The Archers do 50 damage.')
    })

    test("the enemy hero's Defense lowers the damage its Ballista takes", async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero({ army: [stack('STRIKER', 10)] }),
          enemy: aBlueHero({ warMachines: [BALLISTA], skills: { ...NO_SKILLS, defense: 10 } })
        })
      )

      await attackFromTheLeft(user, ENEMY_BALLISTA)

      expect(readCombatMessages()).toContain('The Strikers do 75 damage.')
    })

    test('a destroyed First Aid Tent is shown destroyed and the log says so', async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero({ army: [stack('STRIKER', 100)] }),
          enemy: aBlueHero({ warMachines: [FIRST_AID_TENT] })
        })
      )

      await attackFromTheLeft(user, ENEMY_FIRST_AID_TENT)

      expect(readCombatMessages()).toContain('The First Aid Tent is destroyed.')
      expect(readBattleStacks()).toContainEqual({
        stack: 'Destroyed First Aid Tent',
        ...ENEMY_FIRST_AID_TENT
      })
    })
  })

  describe('the battle', () => {
    test('the war machines take no turn: the first creature acts first, every round', async () => {
      const { user } = await fight(
        aFightWithAMonster({
          hero: aRedHero({ army: [stack('RUNNER')], warMachines: ALL_WAR_MACHINES })
        })
      )

      await passTheRound(user)

      expect(readActiveStack()).toEqual({ stack: 'Runner 1', ...OWN_STACK })
    })

    test("when the enemy hero's last creature dies with its war machines standing, the hero wins", async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero({ army: [stack('KILLER', 10)] }),
          enemy: aBlueHero({ army: [stack('WEAKLING')], warMachines: ALL_WAR_MACHINES })
        })
      )

      await attackBattleHexFrom(user, ENEMY_STACK.row, ENEMY_STACK.column, 'left')
      await waitForBattleResults()

      expect(readBattleResultsMessage()[0]).toBe('A glorious victory!')
    })

    test("the results window lists a destroyed war machine among its side's casualties", async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero({ army: [stack('STRIKER', 100)] }),
          enemy: aBlueHero({ army: [stack('WEAKLING')], warMachines: [AMMO_CART] })
        })
      )
      await attackFromTheLeft(user, ENEMY_AMMO_CART)

      await attackStackOf(user, 'Weakling')

      expect(readBattleCasualties('Defender')).toEqual(['Weakling 1', 'Ammo Cart 1'])
    })

    test('after a reload a damaged war machine keeps its damage: the next hit destroys it', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFightWithAHero({
        hero: aRedHero({ army: [stack('STRIKER', 50)] }),
        enemy: aBlueHero({ warMachines: [BALLISTA] })
      })
      const { user } = await fight(scenario, { eventLog })
      await attackFromTheLeft(user, ENEMY_BALLISTA)
      const reloaded = await reloadBattle(scenario, { eventLog })

      await attackFromTheLeft(reloaded.user, ENEMY_BALLISTA)

      expect(readCombatMessages()).toContain('The Ballista is destroyed.')
    })

    test('after a reload a destroyed war machine is still shown destroyed', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFightWithAHero({
        hero: aRedHero({ army: [stack('STRIKER', 100)] }),
        enemy: aBlueHero({ warMachines: [AMMO_CART] })
      })
      const { user } = await fight(scenario, { eventLog })
      await attackFromTheLeft(user, ENEMY_AMMO_CART)

      await reloadBattle(scenario, { eventLog })

      expect(readBattleStacks()).toContainEqual({
        stack: 'Destroyed Ammo Cart',
        ...ENEMY_AMMO_CART
      })
    })
  })

  describe('after the battle', () => {
    // The Killers hide in the corner, so the Ballista is the Wreckers' nearest target; the
    // Killers then beat the Wreckers next to it.
    const aFightLosingTheBallista = () =>
      aFightWithAHero({
        hero: aRedHero({ army: [stack('KILLER', 10)], warMachines: [BALLISTA, AMMO_CART] }),
        enemy: aBlueHero({ army: [stack('WRECKER', 100)] })
      })

    async function winLosingTheBallista(user) {
      await moveActiveStackTo(user, BOTTOM_LEFT_CORNER.row, BOTTOM_LEFT_CORNER.column)
      await waitMs(1000)
      await attackStackOf(user, 'Wrecker')
      await closeResultsAndLevelUp(user, HERO)
    }

    test("a destroyed Ballista is gone from the hero's frame after winning, and the Ammo Cart that stood is still there", async () => {
      const { user } = await fight(aFightLosingTheBallista())
      await winLosingTheBallista(user)

      await clickHeroInHeroList(user, HERO)

      expect(readHeroScreenWarMachines()).toEqual({ 'Ammo Cart': 'Ammo Cart' })
    })

    test('after a reload the destroyed Ballista is still gone', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFightLosingTheBallista()
      const { user } = await fight(scenario, { eventLog })
      await winLosingTheBallista(user)

      const reloaded = await reloadBattle(scenario, { eventLog })
      await clickHeroInHeroList(reloaded.user, HERO)

      expect(readHeroScreenWarMachines()).toEqual({ 'Ammo Cart': 'Ammo Cart' })
    })

    test('a hero who beats another hero captures their artifacts but none of their war machines', async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero({ army: [stack('KILLER', 10)] }),
          enemy: aBlueHero({ army: [stack('WEAKLING')], warMachines: [BALLISTA, CHARM] })
        })
      )
      await attackStackOf(user, 'Weakling')

      await closeBattleResults(user)
      await waitMs(1000)

      expect(readMessagePictures()).toEqual(['Charm'])
    })

    test('an enemy hero who beat the hero has lost the war machine the hero destroyed', async () => {
      const { user } = await fight(
        aFightWithAHero({
          hero: aRedHero({ army: [stack('WRECKER', 100)] }),
          enemy: aBlueHero({ army: [stack('GUARD', 10)], warMachines: [BALLISTA, AMMO_CART] }),
          others: [aHero().withId('hero-3').withName(MULLICH).withArmy(ARMY_THAT_WINS).at(0, 2)]
        })
      )
      await attackFromTheLeft(user, ENEMY_BALLISTA)
      await waitForBattleResults()
      await closeBattleResults(user)
      await waitMs(1000)

      confirmTileClickByDispatch(1, 0)
      await waitMs()

      expect(stackNames()).toEqual(['Ammo Cart 1', 'Angels 10', 'Guards 10'])
    })
  })

  describe('a hero defending a town', () => {
    const PLAYERS_GATE = { x: 20, y: 2 }
    const COMPUTER_TURN_MS = 2000

    const aDefenceScenario = () =>
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
            .at(PLAYERS_GATE.x, PLAYERS_GATE.y),
          aBlueHero({ army: [stack('WEAKLING')] }).at(20, 5),
          aRedHero({ army: [stack('STRIKER', 100)], warMachines: ALL_WAR_MACHINES }).at(
            PLAYERS_GATE.x,
            PLAYERS_GATE.y
          )
        )
        .withDefinitions(definitions)

    test('has their Ammo Cart and First Aid Tent but no Ballista', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aDefenceScenario().build(),
        appConfig: {
          random: LOWEST_ROLLS,
          catapultRandom: LOWEST_ROLLS,
          battleStepDelayMs: 0,
          interactionModalTransitionMs: 0
        }
      })

      await clickEndTurn(user)
      await waitMs(COMPUTER_TURN_MS)

      expect(readBattleStacks()).toContainEqual({ stack: 'Ammo Cart 1', ...ENEMY_AMMO_CART })
      expect(readBattleStacks()).toContainEqual({
        stack: 'First Aid Tent 1',
        ...ENEMY_FIRST_AID_TENT
      })
      expect(stackNames().filter((name) => name.startsWith('Ballista'))).toEqual([])
    })
  })
})
