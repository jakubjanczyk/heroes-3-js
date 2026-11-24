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
  castSpellAt,
  clickBattleButton,
  clickBattleHex,
  getBattleButton,
  getBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
  LOWEST_ROLLS,
  readActiveStack,
  readActiveTower,
  readCombatMessages,
  readTowerArrows
} from './battle.utils.js'
import {
  aCreatureDefinition,
  aHero,
  anArrowTower,
  aScenario,
  aTown,
  aTownDefinition
} from './builders.js'

const aCreature = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(0)
    .withDamage({ min: 1, max: 1 })

const ONE_KEEP_SHOT_KILLS_ONE = 10

const GUARD = aCreature('Guard').withHealth(1000).withSpeed(1).withAiValue(1).build()
const RAIDER = aCreature('Raider')
  .withHealth(ONE_KEEP_SHOT_KILLS_ONE)
  .withSpeed(2)
  .withAiValue(1000)
  .build()

const MARKSMAN = aCreature('Marksman')
  .withHealth(ONE_KEEP_SHOT_KILLS_ONE)
  .withSpeed(2)
  .withAiValue(1000)
  .withShots(99)
  .withAbilities(['ranged'])
  .build()

const AIR_SHIELD = readGameData('spells.json').AIR_SHIELD
const ARROW_WARD = {
  ...AIR_SHIELD,
  name: 'Arrow Ward',
  lasting: { ...AIR_SHIELD.lasting, target: 'enemy' }
}

const TOWERED = 'TOWERED'

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: { ...readGameData('monsters.json'), GUARD, RAIDER, MARKSMAN },
  spells: { ...readGameData('spells.json'), ARROW_WARD },
  heroes: readGameData('heroes.json'),
  towns: {
    [TOWERED]: aTownDefinition()
      .withName('Towered')
      .withArrowTowers([
        anArrowTower().build(),
        anArrowTower().upper().build(),
        anArrowTower().lower().build()
      ])
      .build()
  },
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const stack = (creature, count = 1) => ({ creature, count })

const CITADEL = ['FORT', 'CITADEL']
const CASTLE = ['FORT', 'CITADEL', 'CASTLE']

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }
const CASTER_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 5 }

const ENOUGH_TO_ATTACK_A_CASTLE = 20

const RAIDERS = { row: 6, column: 1 }
const CATAPULT = { row: 8, column: 1 }
const GUARDS = { row: 6, column: 15 }
const EMPTY_HEX = { row: 6, column: 5 }

const HITS = 0
const TWO_POINTS = 0.9
const AT_THE_FIRST = 0
const CITADEL_WALLS_DESTROYED = [
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[AT_THE_FIRST, HITS, TWO_POINTS],
  ...[HITS, TWO_POINTS],
  ...[HITS, TWO_POINTS]
]
const ROUNDS_TO_DESTROY_CITADEL_WALLS = 5
const KEEP_DESTROYED = [HITS, TWO_POINTS]

function rollsOf(values) {
  const rolls = [...values]
  return () => rolls.shift() ?? 0
}

const FLIGHT_MS = 400
const COMPUTER_TURN_MS = 2000
const PLAYERS_GATE = { x: 20, y: 2 }

const artillery = (level) => (level ? [{ skill: 'ARTILLERY', level }] : [])

const aDefender = ({ level = 'BASIC' } = {}) =>
  aHero()
    .withName('Lord Haart')
    .withPrimarySkills(CASTER_SKILLS)
    .withSecondarySkills(artillery(level))
    .withSpellBook(true)
    .withSpells(['HASTE', 'ARROW_WARD'])
    .withArmy([stack('GUARD')])

const aDefenceScenario = ({
  defender = aDefender(),
  buildings = CITADEL,
  raiders = 5,
  blueCreature = 'RAIDER'
} = {}) =>
  aScenario()
    .withSize(30, 6)
    .withRockAround(2, 5)
    .withEntities(
      defender.at(PLAYERS_GATE.x, PLAYERS_GATE.y),
      aTown()
        .withId('town-1')
        .withType(TOWERED)
        .named('Whitemoon')
        .ownedByPlayer()
        .withBuildings(buildings)
        .withGarrison([])
        .at(PLAYERS_GATE.x, PLAYERS_GATE.y),
      aHero()
        .withId('hero-2')
        .withName('Valeska')
        .ownedBy('blue')
        .withPrimarySkills(NO_SKILLS)
        .withArmy([stack(blueCreature, raiders)])
        .at(20, 5)
    )
    .withDefinitions(definitions)

const setupApp = (scenario, { rolls = [], stepDelayMs = 0, eventLog } = {}) =>
  setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: {
      random: LOWEST_ROLLS,
      catapultRandom: rollsOf(rolls),
      towerRandom: LOWEST_ROLLS,
      battleStepDelayMs: stepDelayMs,
      interactionModalTransitionMs: 0
    },
    ...(eventLog ? { eventLog } : {})
  })

async function defendAgainstBlue(scenario = aDefenceScenario(), options) {
  const app = await setupApp(scenario, options)
  await clickEndTurn(app.user)
  await waitMs(COMPUTER_TURN_MS)
  return app
}

async function defendCastle(options) {
  return defendAgainstBlue(
    aDefenceScenario({ buildings: CASTLE, raiders: ENOUGH_TO_ATTACK_A_CASTLE }),
    options
  )
}

async function shootAt(user, hex) {
  await clickBattleHex(user, hex.row, hex.column)
  await waitMs(1000)
}

async function press(user, button) {
  await clickBattleButton(user, button)
  await waitMs(1000)
}

async function passRounds(user, rounds) {
  for (let round = 0; round < rounds; round += 1) {
    await press(user, 'Defend')
    await press(user, 'Defend')
  }
}

const towerLines = () =>
  readCombatMessages().filter((message) => message.startsWith('The Arrow Tower'))

const catapultMessages = () =>
  readCombatMessages().filter((message) => message.startsWith('The Catapult'))

const marksmanLines = () =>
  readCombatMessages().filter((message) => message.startsWith('The Marksm'))

describe('controlling the arrow towers behavior', () => {
  describe("the towers' turns", () => {
    test('with Artillery the Keep is outlined as the battle opens, and no arrow flies until the player clicks', async () => {
      await defendAgainstBlue()

      expect(readActiveTower()).toBe('Keep')
      expect(towerLines()).toEqual([])
    })

    test("clicking a stack of the attacker's side across the battlefield shoots it for the full damage, and the log says what the Arrow Tower did", async () => {
      const { user } = await defendAgainstBlue()

      expect(towerLines()).toEqual([])
      await shootAt(user, RAIDERS)

      expect(towerLines()).toEqual(['The Arrow Tower does 10 damage. One Raider perishes.'])
    })

    test('the catapult can be shot', async () => {
      const { user } = await defendAgainstBlue()

      await shootAt(user, CATAPULT)

      expect(towerLines()).toEqual(['The Arrow Tower does 10 damage.'])
    })

    test('with a Castle the Keep, the upper and the lower tower each get a turn in that order, then the catapult shoots', async () => {
      const { user } = await defendCastle()

      await shootAt(user, RAIDERS)
      expect(readActiveTower()).toBe('Upper Tower')
      await shootAt(user, RAIDERS)
      expect(readActiveTower()).toBe('Lower Tower')
      await shootAt(user, RAIDERS)

      expect(catapultMessages()).toHaveLength(1)
    })

    test('a destroyed tower has no turn', async () => {
      const { user } = await defendAgainstBlue(aDefenceScenario(), {
        rolls: [...CITADEL_WALLS_DESTROYED, ...KEEP_DESTROYED]
      })

      await passRounds(user, ROUNDS_TO_DESTROY_CITADEL_WALLS + 1)

      expect(catapultMessages().at(-1)).toBe('The Catapult destroys the Keep.')
      expect(readActiveTower()).toBeNull()
    })

    test('without Artillery the towers shoot by themselves', async () => {
      await defendAgainstBlue(aDefenceScenario({ defender: aDefender({ level: null }) }))

      expect(towerLines()).toEqual(['The Arrow Tower does 10 damage. One Raider perishes.'])
      expect(readActiveTower()).toBeNull()
    })

    test('when the player attacks a town whose hero has Artillery, its towers still shoot by themselves', async () => {
      const TOWN_ENTRANCE = { x: 4, y: 3 }
      const scenario = aScenario()
        .withSize(9, 7)
        .withEntities(
          aHero()
            .withPrimarySkills(NO_SKILLS)
            .withArmy([stack('RAIDER', 5)])
            .at(4, 5),
          aTown()
            .withType(TOWERED)
            .named('Kirkwall')
            .ownedBy('blue')
            .withBuildings(CITADEL)
            .withGarrison([stack('GUARD')])
            .at(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y),
          aHero()
            .withId('hero-2')
            .withName('Valeska')
            .ownedBy('blue')
            .withSecondarySkills(artillery('EXPERT'))
            .withArmy([stack('GUARD')])
            .at(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
        )
        .withDefinitions(definitions)
      await setupApp(scenario)

      confirmTileClickByDispatch(TOWN_ENTRANCE.x, TOWN_ENTRANCE.y)
      await waitMs()

      expect(towerLines()).toEqual(['The Arrow Tower does 10 damage. One Raider perishes.'])
    })
  })

  describe('the cursor and the status bar', () => {
    test("over a stack of the attacker's side the cursor is the shot's", async () => {
      const { user } = await defendAgainstBlue()
      await loadAppStyles()

      await hoverBattleHex(user, RAIDERS.row, RAIDERS.column)

      expect(getCursorOver(getBattleHex(RAIDERS.row, RAIDERS.column))).toBe('battle-shoot')
    })

    test('over it the status bar names it and the damage the tower would do', async () => {
      const { user } = await defendAgainstBlue()

      await hoverBattleHex(user, RAIDERS.row, RAIDERS.column)

      expect(getBattleStatusBarText()).toBe('Shoot Raiders (damage 10-20)')
    })

    test('a spell lessening the damage of shots on the target lowers the range shown', async () => {
      const { user } = await defendAgainstBlue()
      await castSpellAt(user, 'Arrow Ward', RAIDERS)
      await waitMs()

      await hoverBattleHex(user, RAIDERS.row, RAIDERS.column)

      expect(getBattleStatusBarText()).toBe('Shoot Raiders (damage 7-15)')
    })

    test.each([
      ["the hero's own stack", GUARDS],
      ['an empty hex', EMPTY_HEX]
    ])('over %s the cursor is blocked', async (_, hex) => {
      const { user } = await defendAgainstBlue()
      await loadAppStyles()

      await hoverBattleHex(user, hex.row, hex.column)

      expect(getCursorOver(getBattleHex(hex.row, hex.column))).toBe('battle-blocked')
    })

    test.each([
      ["the hero's own stack", GUARDS],
      ['an empty hex', EMPTY_HEX]
    ])('a click on %s does nothing', async (_, hex) => {
      const { user } = await defendAgainstBlue()

      await shootAt(user, hex)

      expect(towerLines()).toEqual([])
      expect(readActiveTower()).toBe('Keep')
    })
  })

  describe("the hero on a tower's turn", () => {
    test("a spell cast on the Keep's turn leaves the turn with the Keep", async () => {
      const { user } = await defendAgainstBlue()

      await castSpellAt(user, 'Haste', GUARDS)
      await waitMs()

      expect(readActiveTower()).toBe('Keep')
    })

    test("the hero can't cast again on the upper tower's turn in the same round", async () => {
      const { user } = await defendCastle()
      await castSpellAt(user, 'Haste', GUARDS)
      await waitMs()

      await shootAt(user, RAIDERS)

      expect(readActiveTower()).toBe('Upper Tower')
      expect(getBattleButton('Cast spell').disabled).toBe(true)
    })

    test("Haste cast on a tower's turn makes the stack move first once the towers and the catapult have shot", async () => {
      const { user } = await defendAgainstBlue(aDefenceScenario({ blueCreature: 'MARKSMAN' }))
      await castSpellAt(user, 'Haste', GUARDS)
      await waitMs()

      await shootAt(user, RAIDERS)

      expect(readActiveStack().stack).toBe('Guard 1')
      expect(marksmanLines()).toEqual([])
    })

    test("Defend passes the tower's turn without a shot", async () => {
      const { user } = await defendAgainstBlue()

      await press(user, 'Defend')

      expect(towerLines()).toEqual([])
      expect(readActiveStack().stack).toBe('Guard 1')
    })

    test('Retreat is greyed out', async () => {
      await defendAgainstBlue()

      expect(getBattleButton('Retreat').disabled).toBe(true)
    })

    test('Surrender is greyed out', async () => {
      await defendAgainstBlue()

      expect(getBattleButton('Surrender').disabled).toBe(true)
    })

    test('Auto combat turned on during its turn lets the tower aim itself', async () => {
      const { user } = await defendAgainstBlue(aDefenceScenario(), { stepDelayMs: 100 })

      expect(towerLines()).toEqual([])
      await user.click(getBattleButton('Auto combat'))
      await waitMs(FLIGHT_MS / 2)

      expect(readTowerArrows()).toEqual(['Keep arrow'])
    })
  })

  describe("a tower's Wait", () => {
    test("Wait on the Keep's turn fires no arrow, and the next tower's turn starts", async () => {
      const { user } = await defendCastle()

      await press(user, 'Wait')

      expect(towerLines()).toEqual([])
      expect(readActiveTower()).toBe('Upper Tower')
    })

    test("the waited Keep's turn comes before the other stacks that waited", async () => {
      const { user } = await defendAgainstBlue()
      await press(user, 'Wait')

      await press(user, 'Wait')

      expect(readActiveTower()).toBe('Keep')
    })

    test('two waited towers come back in their own order, the Keep first', async () => {
      const { user } = await defendCastle()
      await press(user, 'Wait')
      await press(user, 'Wait')
      await shootAt(user, RAIDERS)

      await press(user, 'Wait')
      expect(readActiveTower()).toBe('Keep')
      await shootAt(user, RAIDERS)

      expect(readActiveTower()).toBe('Upper Tower')
    })

    test('clicking a stack on the waited turn shoots it', async () => {
      const { user } = await defendAgainstBlue()
      await press(user, 'Wait')
      await press(user, 'Wait')

      expect(towerLines()).toEqual([])
      await shootAt(user, RAIDERS)

      expect(towerLines()).toEqual(['The Arrow Tower does 10 damage. One Raider perishes.'])
    })

    test('a tower destroyed before its waited turn has no turn back', async () => {
      const { user } = await defendAgainstBlue(aDefenceScenario(), {
        rolls: [...CITADEL_WALLS_DESTROYED, ...KEEP_DESTROYED]
      })
      await passRounds(user, ROUNDS_TO_DESTROY_CITADEL_WALLS)
      await press(user, 'Wait')

      await press(user, 'Wait')

      expect(catapultMessages().at(-1)).toBe('The Catapult destroys the Keep.')
      expect(readActiveStack().stack).toBe('Guard 1')
    })

    test('Wait is greyed out on the waited turn', async () => {
      const { user } = await defendAgainstBlue()
      await press(user, 'Wait')

      await press(user, 'Wait')

      expect(readActiveTower()).toBe('Keep')
      expect(getBattleButton('Wait').disabled).toBe(true)
    })
  })

  describe('reloading', () => {
    test("a reload on the upper tower's turn is still its turn", async () => {
      const eventLog = createMemoryEventLog()
      const scenario = () =>
        aDefenceScenario({ buildings: CASTLE, raiders: ENOUGH_TO_ATTACK_A_CASTLE })
      const { user } = await defendAgainstBlue(scenario(), { eventLog })
      await shootAt(user, RAIDERS)

      await setupApp(scenario(), { eventLog })
      await waitMs(1000)

      expect(readActiveTower()).toBe('Upper Tower')
      expect(towerLines()).toHaveLength(1)
    })

    test("a reload in the wait phase brings the waited tower's turn back", async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await defendAgainstBlue(aDefenceScenario(), { eventLog })
      await press(user, 'Wait')
      await press(user, 'Wait')

      await setupApp(aDefenceScenario(), { eventLog })
      await waitMs(1000)

      expect(readActiveTower()).toBe('Keep')
    })
  })
})
