// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import { clickEndTurn } from './adventure-panels.utils.js'
import { getCursorOver, readGameData, setupMovementBehaviorApp, waitMs } from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import {
  clickBattleHex,
  getBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
  LOWEST_ROLLS,
  pickSpell,
  playOnToNextRound,
  readBattleSpellPoints,
  readBattleStacks,
  readCombatMessages,
  readHighlightedBattleHexes
} from './battle.utils.js'
import { aCreatureDefinition, aHero, aScenario, aSpellDefinition, aTown } from './builders.js'

const aCreature = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(0)
    .withDamage({ min: 1, max: 1 })
    .withHealth(1000)
const RUNNER = aCreature('Runner').withSpeed(10).withAiValue(1).build()
const SLUG = aCreature('Slug').withSpeed(1).withAiValue(1).build()
const BRUTE = aCreature('Brute').withSpeed(1).withAiValue(100000).build()

const TELEPORT = aSpellDefinition()
  .withName('Teleport')
  .withLevel(3)
  .withSchools(['WATER'])
  .withCosts([15, 12, 6, 3])
  .withTeleports({
    acrossWalls: [false, false, false, true],
    acrossMoat: [false, false, true, true]
  })
  .describedAs('Teleport description.')
  .build()

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: { ...readGameData('monsters.json'), RUNNER, SLUG, BRUTE },
  spells: { TELEPORT },
  heroes: readGameData('heroes.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const stack = (creature, count = 1) => ({ creature, count })

const BASIC = 'BASIC'
const ADVANCED = 'ADVANCED'
const EXPERT = 'EXPERT'

const SPELL_POINTS = 20

const aTeleporter = (level) =>
  aHero()
    .withName('Lord Haart')
    .withPrimarySkills({ attack: 0, defense: 0, power: 1, knowledge: 2 })
    .withSecondarySkills([{ skill: 'WATER_MAGIC', level }])
    .withSpellBook(true)
    .withSpells(['TELEPORT'])
    .withArmy([stack('RUNNER')])

const ATTACKER_START = { row: 6, column: 1 }
const DEFENDER_START = { row: 6, column: 15 }
const OUTSIDE = { row: 2, column: 5 }
const INSIDE = { row: 2, column: 13 }
const INNER_DRAWBRIDGE = { row: 6, column: 11 }

const KIRKWALL_GATE = { x: 4, y: 3 }

const anAttackScenario = (level, buildings = ['FORT']) =>
  aScenario()
    .withSize(9, 7)
    .withEntities(
      aTeleporter(level).at(4, 5),
      aTown()
        .named('Kirkwall')
        .ownedBy('blue')
        .withBuildings(buildings)
        .withGarrison([stack('SLUG')])
        .at(KIRKWALL_GATE.x, KIRKWALL_GATE.y)
    )
    .withDefinitions(definitions)

const COMPUTER_TURN_MS = 2000
const WHITEMOON_GATE = { x: 20, y: 2 }

const aDefenceScenario = (level) =>
  aScenario()
    .withSize(30, 6)
    .withEntities(
      aTeleporter(level).at(WHITEMOON_GATE.x, WHITEMOON_GATE.y),
      aTown()
        .withId('town-1')
        .named('Whitemoon')
        .ownedByPlayer()
        .withBuildings(['FORT'])
        .at(WHITEMOON_GATE.x, WHITEMOON_GATE.y),
      aHero()
        .withId('hero-2')
        .withName('Valeska')
        .ownedBy('blue')
        .withPrimarySkills({ attack: 0, defense: 0, power: 1, knowledge: 1 })
        .withArmy([stack('BRUTE')])
        .at(20, 5)
    )
    .withDefinitions(definitions)

// The catapult's first shot, as the battle opens, aims at the third of the four equally strong
// segments, the Mid-Lower Wall, hits it and does 2 damage, which brings it down. Later shots do
// no damage.
const MID_LOWER_WALL_DESTROYED = [0.5, 0, 0.9]

function catapultRolls(values = []) {
  const rolls = [...values]
  return () => rolls.shift() ?? 0
}

const setupApp = (scenario, catapult) =>
  setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: {
      random: LOWEST_ROLLS,
      catapultRandom: catapultRolls(catapult),
      interactionModalTransitionMs: 0
    }
  })

async function attackKirkwall(level, catapult, buildings) {
  const app = await setupApp(anAttackScenario(level, buildings), catapult)
  await loadAppStyles()
  confirmTileClickByDispatch(KIRKWALL_GATE.x, KIRKWALL_GATE.y)
  await waitMs()
  return app
}

async function defendWhitemoon(level) {
  const app = await setupApp(aDefenceScenario(level))
  await loadAppStyles()
  await clickEndTurn(app.user)
  await waitMs(COMPUTER_TURN_MS)
  return app
}

async function pickToTeleport(user, from) {
  await pickSpell(user, 'Teleport')
  await clickBattleHex(user, from.row, from.column)
}

async function aimAt(user, { row, column }) {
  await hoverBattleHex(user, row, column)
  return {
    status: getBattleStatusBarText(),
    cursor: getCursorOver(getBattleHex(row, column)),
    shaded: readHighlightedBattleHexes()
  }
}

async function teleportTo(user, { row, column }) {
  await clickBattleHex(user, row, column)
  await waitMs()
}

const runnerAt = () => {
  const { row, column } = readBattleStacks().find(({ stack }) => stack.startsWith('Runner'))
  return { row, column }
}

const REFUSED = { status: 'Invalid Teleport Destination', cursor: 'battle-blocked', shaded: [] }

describe('siege teleport behavior', () => {
  describe('the player attacks a town with a Fort', () => {
    test('given Basic Water Magic when Teleport is aimed from outside the walls at a hex inside then it is an invalid destination', async () => {
      const { user } = await attackKirkwall(BASIC)
      await pickToTeleport(user, ATTACKER_START)

      expect(await aimAt(user, INSIDE)).toEqual(REFUSED)
    })

    test('given Basic Water Magic when a hex inside the walls is clicked then the stack stays and a hex outside still takes it there', async () => {
      const { user } = await attackKirkwall(BASIC)
      await pickToTeleport(user, ATTACKER_START)

      await teleportTo(user, INSIDE)
      const afterInvalidClick = runnerAt()
      await teleportTo(user, OUTSIDE)

      expect([afterInvalidClick, runnerAt()]).toEqual([ATTACKER_START, OUTSIDE])
    })

    test('given Basic Water Magic when a hex inside the walls is clicked then no spell points are spent', async () => {
      const { user } = await attackKirkwall(BASIC)
      await pickToTeleport(user, ATTACKER_START)

      await teleportTo(user, INSIDE)
      await user.keyboard('{Escape}')

      expect(await readBattleSpellPoints(user)).toBe(String(SPELL_POINTS))
    })

    test('given Advanced Water Magic when Teleport is aimed from outside the walls at a hex inside then it is an invalid destination', async () => {
      const { user } = await attackKirkwall(ADVANCED)
      await pickToTeleport(user, ATTACKER_START)

      expect(await aimAt(user, INSIDE)).toEqual(REFUSED)
    })

    test('given Basic Water Magic when the stack is teleported to another hex outside the walls then it stands there', async () => {
      const { user } = await attackKirkwall(BASIC)
      await pickToTeleport(user, ATTACKER_START)

      await teleportTo(user, OUTSIDE)

      expect(runnerAt()).toEqual(OUTSIDE)
    })

    test('given Expert Water Magic when the stack is teleported to a hex inside the walls then it stands there and 3 spell points are spent', async () => {
      const { user } = await attackKirkwall(EXPERT)
      await pickToTeleport(user, ATTACKER_START)

      await teleportTo(user, INSIDE)
      const runner = runnerAt()
      await playOnToNextRound(user)

      expect([runner, await readBattleSpellPoints(user)]).toEqual([
        INSIDE,
        String(SPELL_POINTS - 3)
      ])
    })
  })

  describe('the player attacks a town whose Mid-Lower Wall is destroyed', () => {
    // From row 8, column 8 the way to row 8, column 13 goes through the gap where the Mid-Lower
    // Wall was; the way to row 2, column 13 crosses the walls above it.
    const BY_THE_GAP = { row: 8, column: 8 }
    const THROUGH_THE_GAP = { row: 8, column: 13 }

    async function runnerByTheGap(level) {
      const app = await attackKirkwall(level, MID_LOWER_WALL_DESTROYED)
      await clickBattleHex(app.user, BY_THE_GAP.row, BY_THE_GAP.column)
      await waitMs(1000)
      return app
    }

    test('given Basic Water Magic when the stack is teleported through the gap to a hex inside then it stands there', async () => {
      const { user } = await runnerByTheGap(BASIC)
      await pickToTeleport(user, BY_THE_GAP)

      await teleportTo(user, THROUGH_THE_GAP)

      expect(runnerAt()).toEqual(THROUGH_THE_GAP)
    })

    test('given Basic Water Magic when Teleport is aimed across a standing part of the walls then it is an invalid destination', async () => {
      const { user } = await runnerByTheGap(BASIC)
      await pickToTeleport(user, BY_THE_GAP)

      expect(await aimAt(user, INSIDE)).toEqual(REFUSED)
    })
  })

  describe('the player attacks a town with a Citadel whose Mid-Lower Wall is destroyed', () => {
    const BY_THE_MOAT = { row: 8, column: 8 }
    const ACROSS_THE_MOAT = { row: 8, column: 13 }
    const IN_THE_MOAT = { row: 5, column: 9 }

    async function runnerByTheMoat(level) {
      const app = await attackKirkwall(level, MID_LOWER_WALL_DESTROYED, ['FORT', 'CITADEL'])
      await clickBattleHex(app.user, BY_THE_MOAT.row, BY_THE_MOAT.column)
      await waitMs(1000)
      return app
    }

    test('given Basic Water Magic when Teleport is aimed through the gap across the moat then it is an invalid destination', async () => {
      const { user } = await runnerByTheMoat(BASIC)
      await pickToTeleport(user, BY_THE_MOAT)

      expect(await aimAt(user, ACROSS_THE_MOAT)).toEqual(REFUSED)
    })

    test('given Advanced Water Magic when the stack is teleported through the gap across the moat then it stands inside', async () => {
      const { user } = await runnerByTheMoat(ADVANCED)
      await pickToTeleport(user, BY_THE_MOAT)

      await teleportTo(user, ACROSS_THE_MOAT)

      expect(runnerAt()).toEqual(ACROSS_THE_MOAT)
    })

    test('given Basic Water Magic when the stack is teleported into the moat then it stands there and the moat does it no damage', async () => {
      const { user } = await attackKirkwall(BASIC, [], ['FORT', 'CITADEL'])
      await pickToTeleport(user, ATTACKER_START)

      await teleportTo(user, IN_THE_MOAT)

      expect(runnerAt()).toEqual(IN_THE_MOAT)
      expect(readCombatMessages().filter((line) => line.startsWith('The Moat'))).toEqual([])
    })
  })

  describe("the player's hero defends a town with a Fort", () => {
    test('given Basic Water Magic when Teleport is aimed from inside the walls at a hex outside then it is an invalid destination', async () => {
      const { user } = await defendWhitemoon(BASIC)
      await pickToTeleport(user, DEFENDER_START)

      expect(await aimAt(user, OUTSIDE)).toEqual(REFUSED)
    })

    test('given Basic Water Magic when the stack is teleported to another hex inside the walls then it stands there', async () => {
      const { user } = await defendWhitemoon(BASIC)
      await pickToTeleport(user, DEFENDER_START)

      await teleportTo(user, INSIDE)

      expect(runnerAt()).toEqual(INSIDE)
    })

    test('given Basic Water Magic when Teleport is aimed from inside the walls at the shut drawbridge then it is an invalid destination', async () => {
      const { user } = await defendWhitemoon(BASIC)
      await pickToTeleport(user, DEFENDER_START)

      expect(await aimAt(user, INNER_DRAWBRIDGE)).toEqual(REFUSED)
    })
  })
})
