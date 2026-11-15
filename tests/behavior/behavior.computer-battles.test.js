// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  expectHeroAt,
  expectMonsterDefeating,
  expectMonsterNotPresent,
  expectMonsterPresent,
  expectResourceNotPresent,
  getDwellingEntity,
  getHeroEntity,
  holdRightButtonOn,
  readOwnerFlags
} from './adventure-map.utils.js'
import {
  clickEndTurn,
  expectCalendarDate,
  readArmySlots,
  readTurnBox
} from './adventure-panels.utils.js'
import { castSpellFromMap } from './adventure-spells.utils.js'
import {
  createMemoryEventLog,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { LOWEST_ROLLS, queryBattleScreen } from './battle.utils.js'
import {
  aCreatureDefinition,
  aDwelling,
  aHero,
  aMonster,
  aResource,
  aScenario,
  aSpellDefinition
} from './builders.js'

const VISIONS = aSpellDefinition()
  .withName('Visions')
  .withLevel(2)
  .withSchools(['AIR', 'EARTH', 'FIRE', 'WATER'])
  .withKind('adventure')
  .withCosts([4, 2, 2, 2])
  .describedAs('Visions description.')
  .withVisions({
    rangePerPower: [1, 1, 2, 3],
    minimumRange: 3,
    detailsFrom: { MONSTER: 0, HERO: 2, TOWN: 3 }
  })
  .build()

// As strong as a Skeleton by its AI value, and dies to any blow.
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
  dwellings: readGameData('dwellings.json'),
  monsters: { ...readGameData('monsters.json'), WEAKLING, STINGER, PAPER_TIGER },
  spells: { VISIONS }
}

const COMPUTER_TURN_MS = 2000
const STEP_MS = 100

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

// The player's hero at (15, 0) sees 4 tiles with Advanced Visions; blue's hero starts at (15, 2).
const aSeer = () =>
  aHero()
    .withPrimarySkills({ power: 2, knowledge: 10 })
    .withSecondarySkills([{ skill: 'AIR_MAGIC', level: 'ADVANCED' }])
    .withSpellBook(true)
    .withSpells(['VISIONS'])
    .at(15, 0)

const aBlueHero = (army, primarySkills = NO_SKILLS) =>
  aHero().withId('hero-2').ownedBy('blue').withPrimarySkills(primarySkills).withArmy(army).at(15, 2)

const aMonsterOf = (creature, count) => aMonster().withType(creature).withCount(count)

const aBattleScenario = (...entities) =>
  aScenario()
    .withSize(30, 3)
    .withEntities(aSeer(), ...entities)
    .withDefinitions(definitions)

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

async function readBlueArmyAt(user, { x, y }) {
  await castSpellFromMap(user, 'Visions')
  await holdRightButtonOn(user, x, y)
  return readArmySlots(screen.getByRole('tooltip'))
}

describe('computer heroes fighting monsters behavior', () => {
  describe('choosing a fight', () => {
    test("blue's hero beats a monster its army is stronger than, and the monster is gone from the map", async () => {
      const { user } = await setupApp(
        aBattleScenario(
          aBlueHero([{ creature: 'ANGEL', count: 1 }]),
          aMonsterOf('SKELETON', 10).at(19, 2)
        )
      )

      await endTurn(user)

      expectMonsterNotPresent()
    })

    // 11 Skeletons are worth 660, no more than the 10 Weaklings' 600 and a tenth.
    test("blue's hero leaves alone a monster it isn't stronger than by more than a tenth", async () => {
      const { user } = await setupApp(
        aBattleScenario(
          aBlueHero([{ creature: 'SKELETON', count: 11 }]),
          aMonsterOf('WEAKLING', 10).at(19, 2)
        )
      )

      await endTurn(user)

      expectHeroAt(15, 2, 'hero-2')
      expectMonsterPresent()
    })

    // Attack 2 makes the 660 worth 660 × √1.1 ≈ 692, more than 660.
    test("blue's hero's Attack and Defense count towards its strength", async () => {
      const { user } = await setupApp(
        aBattleScenario(
          aBlueHero([{ creature: 'SKELETON', count: 11 }], { ...NO_SKILLS, attack: 2 }),
          aMonsterOf('WEAKLING', 10).at(19, 2)
        )
      )

      await endTurn(user)

      expectMonsterNotPresent()
    })

    // The Angels at (17, 1) guard every tile of columns 16 to 18.
    test("blue's hero doesn't fight a weak monster it can only reach past a stronger one", async () => {
      const { user } = await setupApp(
        aBattleScenario(
          aBlueHero([{ creature: 'SKELETON', count: 20 }]),
          aMonsterOf('ANGEL', 10).withId('angels').at(17, 1),
          aMonsterOf('WEAKLING', 10).at(22, 1)
        )
      )

      await endTurn(user)

      expectHeroAt(15, 2, 'hero-2')
      expectMonsterPresent()
    })

    // The pile at (12, 2) is two steps away, then the monster's neighbour (23, 2) ten more: 1200
    // of the day's 1500. The other way round, the eight steps to (23, 2) and ten back leave the
    // pile for another day.
    test("blue's hero picks up a pile nearer than a monster first, then fights the monster", async () => {
      const { user } = await setupApp(
        aBattleScenario(
          aBlueHero([{ creature: 'ANGEL', count: 1 }]),
          aResource().withId('pile').at(12, 2),
          aMonsterOf('SKELETON', 10).at(24, 2)
        )
      )

      await endTurn(user)

      expectResourceNotPresent('pile')
      expectMonsterNotPresent()
    })

    test("blue's hero beats a monster guarding a pile, then picks up the pile the same day", async () => {
      const { user } = await setupApp(
        aBattleScenario(
          aBlueHero([{ creature: 'ANGEL', count: 1 }]),
          aResource().withId('pile').at(19, 1),
          aMonsterOf('SKELETON', 10).at(20, 2)
        )
      )

      await endTurn(user)

      expectMonsterNotPresent()
      expectResourceNotPresent('pile')
    })
  })

  describe('how the battle ends', () => {
    // The Stingers strike first: 10 × 6 = 60 damage, less 10% for the Skeletons' Defense 4 over
    // Attack 0, is 54, and kills 9 of the 20 six-health Skeletons. The 11 left strike back
    // for 11 × 1, plus 25% for Attack 5 over Defense 0: 13, killing all ten one-health Stingers.
    test("blue's hero keeps only the creatures that survived its battle", async () => {
      const { user } = await setupApp(
        aBattleScenario(
          aBlueHero([{ creature: 'SKELETON', count: 20 }]),
          aMonsterOf('STINGER', 10).withStacks(1).at(19, 2)
        )
      )

      await endTurn(user)

      expect(await readBlueArmyAt(user, { x: 18, y: 2 })).toEqual([
        'Skeletons 11',
        '',
        '',
        '',
        '',
        '',
        ''
      ])
    })

    test("blue's hero beaten by a monster is gone from the map, and the monster stays", async () => {
      const { user } = await setupApp(
        aBattleScenario(
          aBlueHero([{ creature: 'SKELETON', count: 10 }]),
          aMonsterOf('PAPER_TIGER', 3).at(19, 2)
        )
      )

      await endTurn(user)

      expect(getHeroEntity('hero-2')).toBeFalsy()
      expectMonsterPresent()
    })

    // Blue's hero reaches (18, 2) on its third step and fights there once the step's time is over,
    // then walks on to the pile.
    test("no battle screen opens and the hourglass stays while blue's hero fights", async () => {
      const { user } = await setupApp(
        aBattleScenario(
          aBlueHero([{ creature: 'ANGEL', count: 1 }]),
          aMonsterOf('SKELETON', 10).at(19, 2),
          aResource().withId('pile').at(25, 2)
        ),
        { movementStepDelayMs: STEP_MS }
      )

      await clickEndTurn(user)
      await waitMs(4 * STEP_MS + STEP_MS / 2)

      expectMonsterDefeating()
      expect(queryBattleScreen()).toBeNull()
      expect(readTurnBox().name).toBe("Blue player's turn")
    })

    test("the player's turn starts once blue's hero has fought, with no window open", async () => {
      const { user } = await setupApp(
        aBattleScenario(
          aBlueHero([{ creature: 'ANGEL', count: 1 }]),
          aMonsterOf('SKELETON', 10).at(19, 2)
        )
      )

      await endTurn(user)

      expect(screen.queryAllByRole('dialog')).toEqual([])
      expectCalendarDate({ month: 1, week: 1, day: 2 })
    })

    test("after a reload during blue's walk, blue's hero fights the monster once", async () => {
      const scenario = aBattleScenario(
        aBlueHero([{ creature: 'SKELETON', count: 20 }]),
        aMonsterOf('STINGER', 10).withStacks(1).at(19, 2)
      )
      const eventLog = createMemoryEventLog()
      const options = { eventLog, movementStepDelayMs: STEP_MS }
      const first = await setupApp(scenario, options)
      await clickEndTurn(first.user)
      await waitMs(STEP_MS + STEP_MS / 2)
      const { user } = await setupApp(scenario, options)
      await waitMs(COMPUTER_TURN_MS)

      expectMonsterNotPresent()
      expect((await readBlueArmyAt(user, { x: 18, y: 2 }))[0]).toBe('Skeletons 11')
    })
  })

  describe('guarded dwellings', () => {
    // The Monastery's 9 Monks are worth 4365; two Angels 10038.
    test("blue's hero beats a dwelling's guards it is stronger than and flags the dwelling, with no question asked", async () => {
      const { user } = await setupApp(
        aBattleScenario(
          aBlueHero([{ creature: 'ANGEL', count: 2 }]),
          aDwelling().withType('MONASTERY').at(18, 1)
        )
      )

      await endTurn(user)

      expect(readOwnerFlags(getDwellingEntity())).toEqual(['Blue player flag'])
      expect(screen.queryAllByRole('dialog')).toEqual([])
    })

    // The Monastery holds a week's growth of 3 Monks, and blue's 7500 gold pays for them.
    test("blue's hero recruits at a dwelling once it has beaten the guards", async () => {
      const { user } = await setupApp(
        aBattleScenario(
          aBlueHero([{ creature: 'ANGEL', count: 2 }]),
          aDwelling().withType('MONASTERY').at(18, 1)
        )
      )

      await endTurn(user)

      expect((await readBlueArmyAt(user, { x: 18, y: 1 }))[1]).toBe('Monks 3')
    })

    test("blue's hero leaves alone a dwelling whose guards are stronger", async () => {
      const { user } = await setupApp(
        aBattleScenario(
          aBlueHero([{ creature: 'SKELETON', count: 10 }]),
          aDwelling().withType('MONASTERY').at(18, 1)
        )
      )

      await endTurn(user)

      expectHeroAt(15, 2, 'hero-2')
      expect(readOwnerFlags(getDwellingEntity())).toEqual([])
    })
  })
})
