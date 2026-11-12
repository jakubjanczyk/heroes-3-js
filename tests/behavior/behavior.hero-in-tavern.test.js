// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { attackMonsterAt } from './adventure-map.utils.js'
import {
  endTurns,
  getHeroInHeroList,
  getTownInTownList,
  readArmySlots,
  readHeroList,
  readPrimarySkills
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  attackBattleHexFrom,
  closeBattleResults,
  retreat,
  startBattle,
  surrender
} from './battle.utils.js'
import { aHero, aMonster, anArtifactDefinition, aScenario, aTown } from './builders.js'
import {
  clickHeroInHeroList,
  clickHeroScreenSpellBook,
  readHeroScreenArmy,
  readHeroScreenArtifacts,
  readHeroScreenPrimarySkills,
  readHeroScreenSecondarySkills,
  readHeroScreenSpellBook,
  readHeroScreenTitle
} from './hero-screen.utils.js'
import { clickSpellBookControl, readSpellBookSpellNames } from './spell-book.utils.js'
import {
  hireHero,
  holdRightButtonOnHeroForHire,
  leaveTown,
  openTavern,
  readHeroesForHire,
  readHeroForHireDescription,
  selectHeroForHire
} from './town-screen.utils.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  spells: readGameData('spells.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json'),
  artifacts: {
    AXE: anArtifactDefinition().withName("Centaur's Axe").withSlot('WEAPON').build(),
    HELM: anArtifactDefinition()
      .withName('Helm of the Alabaster Unicorn')
      .withSlot('HELMET')
      .build()
  }
}

const HERO = 'Christian'
const OTHER_HERO = 'Sir Mullich'
const ENEMY_HERO = 'Gunnar'

// Every roll the lowest: the tavern offers the first heroes of its pool still free (Orrin, then
// Valeska, then Edric), each tie between two tavern slots goes to the left one, and damage rolls
// are at the bottom of their range.
const LOWEST_ROLLS = () => 0

const stack = (creature, count) => ({ creature, count })

// The Archers (speed 6) act before the Swordsmen (speed 5), so the player can retreat at once.
const PIKEMEN_AND_ARCHERS = [stack('PIKEMAN', 10), stack('ARCHER', 5)]

// Christian, a level 3 Knight with skills, artifacts and a spell book of his own, stands next to
// the Swordsmen at (1, 0). Whitemoon's entrance is at (4, 3), away from the heroes.
const aChristian = () =>
  aHero()
    .withName(HERO)
    .withExperience(3000)
    .withPrimarySkills({ attack: 6, defense: 5, power: 3, knowledge: 2 })
    .withSecondarySkills([
      { skill: 'LEADERSHIP', level: 'EXPERT' },
      { skill: 'ARTILLERY', level: 'ADVANCED' }
    ])
    .withArtifacts(['AXE', 'HELM'])
    .withSpellBook(true)
    .withSpells(['MAGIC_ARROW'])
    .withArmy(PIKEMEN_AND_ARCHERS)
    .at(0, 0)

const aWhitemoon = () =>
  aTown().named('Whitemoon').ownedByPlayer().withBuildings(['TAVERN']).at(4, 3)

const aTavernScenario = (...entities) =>
  aScenario()
    .withSize(16, 7)
    .withEntities(...entities)
    .withDefinitions(gameDefinitions)
    .withStartingResources({ GOLD_PILE: 20000 })

const aRetreatScenario = () =>
  aTavernScenario(
    aChristian(),
    aMonster().withType('SWORDSMAN').withCount(20).withStacks(1).at(1, 0),
    aWhitemoon()
  )

// A blue hero with one Angel. It flies up to Christian's Pikemen, who attack it, and its
// retaliation at the lowest damage roll leaves 2 of the 10; then Christian surrenders.
const aSurrenderScenario = () =>
  aTavernScenario(
    aChristian(),
    aHero()
      .withId('hero-2')
      .withName(ENEMY_HERO)
      .ownedBy('blue')
      .withArmy([stack('ANGEL', 1)])
      .at(1, 0),
    aWhitemoon()
  )

const appConfig = { interactionModalTransitionMs: 0 }

async function retreatFromBattle(scenario = aRetreatScenario(), options = {}) {
  const app = await startBattle(scenario, { random: LOWEST_ROLLS, appConfig, ...options })
  await retreat(app.user)
  await closeBattleResults(app.user)
  return app
}

async function surrenderInBattle(scenario = aSurrenderScenario()) {
  const app = await startBattle(scenario, { random: LOWEST_ROLLS, appConfig })
  await waitMs(5000)
  await attackBattleHexFrom(app.user, 3, 4, 'left')
  await waitMs(5000)
  await surrender(app.user)
  await closeBattleResults(app.user)
  return app
}

async function openTavernInWhitemoon(user) {
  await user.dblClick(getTownInTownList('Whitemoon'))
  await openTavern(user)
}

async function hireAgain(user, heroName = HERO) {
  await openTavernInWhitemoon(user)
  await hireHero(user, heroName)
  await leaveTown(user)
}

async function hireAgainAndOpenHeroScreen(user) {
  await hireAgain(user)
  await clickHeroInHeroList(user, HERO)
}

describe('a retreated or surrendered hero in the tavern', () => {
  describe('after a retreat', () => {
    test('given the hero retreated then the tavern offers them straight away', async () => {
      const { user } = await retreatFromBattle()

      await openTavernInWhitemoon(user)

      expect(readHeroesForHire()).toContain(HERO)
    })

    test('given the hero retreated when hired again then they have their level, primary and secondary skills', async () => {
      const { user } = await retreatFromBattle()

      await hireAgainAndOpenHeroScreen(user)

      expect(readHeroScreenTitle()).toEqual([HERO, 'Level 3 Knight'])
      expect(readHeroScreenPrimarySkills()).toEqual([
        'Attack 6',
        'Defense 5',
        'Power 3',
        'Knowledge 2'
      ])
      expect(readHeroScreenSecondarySkills().slice(0, 3)).toEqual([
        'Expert Leadership',
        'Advanced Artillery',
        ''
      ])
    })

    test('given the hero retreated when hired again then they wear and carry the same artifacts', async () => {
      const { user } = await retreatFromBattle()

      await hireAgainAndOpenHeroScreen(user)

      expect(readHeroScreenArtifacts()).toEqual({
        Helmet: 'Helm of the Alabaster Unicorn',
        Weapon: "Centaur's Axe"
      })
    })

    test('given the hero retreated when hired again then they have their spell book and spells', async () => {
      const { user } = await retreatFromBattle()

      await hireAgainAndOpenHeroScreen(user)

      expect(readHeroScreenSpellBook()).toBe('Spell Book')
      await clickHeroScreenSpellBook(user)
      await clickSpellBookControl(user, 'Combat spells')
      expect(readSpellBookSpellNames()).toEqual(['Magic Arrow'])
    })

    test('given the hero retreated when hired again then they bring one creature of their first starting stack', async () => {
      const { user } = await retreatFromBattle()

      await hireAgainAndOpenHeroScreen(user)

      expect(readHeroScreenArmy()).toEqual(['Pikeman 1', '', '', '', '', '', ''])
    })

    test('given the hero retreated when hired the same day then they have the movement points they had left', async () => {
      const { user } = await retreatFromBattle()

      await hireAgain(user)

      expect(readHeroList()).toEqual([`${HERO} 1400`])
    })

    test('given the hero retreated when hired the next day then they have full movement points', async () => {
      const { user } = await retreatFromBattle()
      await endTurns(user, 1)

      await hireAgain(user)

      expect(readHeroList()).toEqual([`${HERO} 1500`])
    })

    test('given the hero retreated when the page reloads then the tavern still offers them', async () => {
      const scenario = aRetreatScenario()
      const eventLog = createMemoryEventLog()
      await retreatFromBattle(scenario, { eventLog })

      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: scenario.build(),
        eventLog,
        appConfig: { ...appConfig, random: LOWEST_ROLLS }
      })
      await openTavernInWhitemoon(user)

      expect(readHeroesForHire()).toContain(HERO)
    })
  })

  describe('after a surrender', () => {
    test('given the hero surrendered then the tavern offers them straight away', async () => {
      const { user } = await surrenderInBattle()

      await openTavernInWhitemoon(user)

      expect(readHeroesForHire()).toContain(HERO)
    })

    test('given the hero surrendered when hired again then they bring the creatures they had left', async () => {
      const { user } = await surrenderInBattle()

      await hireAgainAndOpenHeroScreen(user)

      expect(readHeroScreenArmy()).toEqual(['Pikemen 2', 'Archers 5', '', '', '', '', ''])
    })

    test('given the hero surrendered when hired again then they keep their level and artifacts', async () => {
      const { user } = await surrenderInBattle()

      await hireAgainAndOpenHeroScreen(user)

      expect(readHeroScreenTitle()).toEqual([HERO, 'Level 3 Knight'])
      expect(readHeroScreenArtifacts()).toEqual({
        Helmet: 'Helm of the Alabaster Unicorn',
        Weapon: "Centaur's Axe"
      })
    })
  })

  describe('in the tavern', () => {
    test('the tavern describes a retreated hero with their level and number of artifacts', async () => {
      const { user } = await retreatFromBattle()
      await openTavernInWhitemoon(user)

      await selectHeroForHire(user, HERO)

      expect(readHeroForHireDescription()).toBe(`${HERO} is a level 3 Knight with 2 artifacts.`)
    })

    test('holding the right button on a retreated hero shows their own primary skills and army', async () => {
      const { user } = await retreatFromBattle()
      await openTavernInWhitemoon(user)

      await holdRightButtonOnHeroForHire(user, HERO)

      const popup = screen.getByRole('tooltip')
      expect(readPrimarySkills(popup)).toEqual(['Attack 6', 'Defense 5', 'Power 3', 'Knowledge 2'])
      expect(readArmySlots(popup)).toEqual(['Pikeman 1', '', '', '', '', '', ''])
    })

    test('given the tavern was not opened this week then a retreated hero is offered beside one new hero', async () => {
      const { user } = await retreatFromBattle()

      await openTavernInWhitemoon(user)

      expect(readHeroesForHire()).toEqual([HERO, 'Orrin'])
    })

    // Orrin is hired, and Edric, who takes his place with one creature, is the one sent away.
    test('a retreated hero takes the place of the hero who brings one creature', async () => {
      const { user } = await retreatFromBattle(aRetreatScenario(), {
        beforeAttack: async (app) => {
          await hireAgain(app.user, 'Orrin')
          await app.user.click(getHeroInHeroList(HERO))
        }
      })

      await openTavernInWhitemoon(user)

      expect(readHeroesForHire()).toEqual([HERO, 'Valeska'])
    })

    // Christian retreats while the tavern offers Orrin and Valeska, then Sir Mullich retreats from
    // the Swordsmen at (1, 6): Valeska makes way for him, and Christian stays.
    test('a second retreated hero takes the place of a hero offered at the start of the week, not of the first', async () => {
      const { user } = await retreatFromBattle(
        aTavernScenario(
          aChristian(),
          aMonster().withType('SWORDSMAN').withCount(20).withStacks(1).at(1, 0),
          aHero().withId('hero-2').withName(OTHER_HERO).withArmy(PIKEMEN_AND_ARCHERS).at(0, 6),
          aMonster().withId('monster-2').withType('SWORDSMAN').withCount(20).withStacks(1).at(1, 6),
          aWhitemoon()
        ),
        {
          beforeAttack: async (app) => {
            await openTavernInWhitemoon(app.user)
            await leaveTown(app.user)
            await app.user.click(getHeroInHeroList(HERO))
          }
        }
      )
      await attackMonsterAt(1, 6)
      await retreat(user)
      await closeBattleResults(user)

      await openTavernInWhitemoon(user)

      expect(readHeroesForHire()).toEqual([HERO, OTHER_HERO])
    })

    test('a new week replaces a retreated hero with new heroes', async () => {
      const { user } = await retreatFromBattle()

      await endTurns(user, 7)
      await openTavernInWhitemoon(user)

      expect(readHeroesForHire()).toEqual(['Orrin', 'Valeska'])
    })

    // With no other heroes in the pool, the new week's tavern can offer only Christian. At the
    // lowest roll he brings all three starting stacks at their smallest.
    test('given the hero retreated and a new week began when the tavern offers them again then they keep their level and artifacts and bring a new starting army', async () => {
      const scenario = aRetreatScenario()
      const { user } = await retreatFromBattle(
        scenario.withDefinitions({ ...scenario.build().definitions, heroes: {} })
      )
      await endTurns(user, 7)

      await hireAgainAndOpenHeroScreen(user)

      expect(readHeroScreenTitle()).toEqual([HERO, 'Level 3 Knight'])
      expect(readHeroScreenArtifacts()).toEqual({
        Helmet: 'Helm of the Alabaster Unicorn',
        Weapon: "Centaur's Axe"
      })
      expect(readHeroScreenArmy()).toEqual([
        'Pikemen 10',
        'Archers 4',
        'Griffins 2',
        '',
        '',
        '',
        ''
      ])
    })

    test("the hero who takes a retreated hero's place after they are hired brings a single first-level creature", async () => {
      const { user } = await retreatFromBattle()
      await hireAgain(user)
      await openTavernInWhitemoon(user)

      await holdRightButtonOnHeroForHire(user, 'Valeska')

      expect(readArmySlots(screen.getByRole('tooltip'))).toEqual([
        'Pikeman 1',
        '',
        '',
        '',
        '',
        '',
        ''
      ])
    })
  })
})
