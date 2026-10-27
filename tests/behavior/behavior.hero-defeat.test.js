// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { attackMonsterAt, confirmTileClickByDispatch } from './adventure-map.utils.js'
import {
  closeInteractionModal,
  getHeroInfoBox,
  getTownInTownList,
  readHeroList,
  readMessageRewards,
  readPrimarySkills,
  readSelectedHeroInHeroList
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import {
  clickBattleButton,
  closeBattleResults,
  startBattle,
  waitForBattleResults
} from './battle.utils.js'
import { aBonusObject, aHero, aMonster, aScenario, aTown } from './builders.js'
import {
  clickHeroInHeroList,
  closeHeroScreen,
  readHeroScreenArmy,
  readHeroScreenPrimarySkills,
  readHeroScreenSecondarySkills,
  readHeroScreenTitle
} from './hero-screen.utils.js'
import { hireHero, leaveTown, openTavern, readHeroesForHire } from './town-screen.utils.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json'),
  bonusObjects: readGameData('bonus-objects.json')
}

const BEATEN_HERO = 'Christian'
const OTHER_HERO = 'Sir Mullich'

// Every roll the highest: the tavern offers the last heroes of its pool still free, Christian first.
// A hired hero's starting army rolls 100, so only the first stack comes, at its largest.
const HIGHEST_ROLLS = () => 0.99

// Christian, a level 4 Knight with primary and secondary skills of his own, attacks the Swordsmen
// with a lone Skeleton and loses. Whitemoon's entrance is at (4, 3), away from both heroes.
const aDefeatScenario = () =>
  aScenario()
    .withSize(16, 7)
    .withEntities(
      aHero()
        .withName(BEATEN_HERO)
        .withExperience(3000)
        .withPrimarySkills({ attack: 6, defense: 5, power: 3, knowledge: 2 })
        .withSecondarySkills([
          { skill: 'LEADERSHIP', level: 'EXPERT' },
          { skill: 'ARTILLERY', level: 'ADVANCED' },
          { skill: 'LOGISTICS', level: 'BASIC' }
        ])
        .withArmy([{ creature: 'SKELETON', count: 1 }])
        .at(0, 0),
      aHero().withId('hero-2').withName(OTHER_HERO).at(0, 6),
      aMonster().withType('SWORDSMAN').withCount(2).withStacks(1).at(1, 0),
      aTown().named('Whitemoon').ownedByPlayer().withBuildings(['TAVERN']).at(4, 3)
    )
    .withDefinitions(gameDefinitions)
    .withStartingResources({ GOLD_PILE: 10000 })

const appConfig = { interactionModalTransitionMs: 0 }

async function loseBattle(scenario = aDefeatScenario(), { eventLog } = {}) {
  const app = await startBattle(scenario, { random: HIGHEST_ROLLS, appConfig, eventLog })
  await clickBattleButton(app.user, 'Auto combat')
  await waitForBattleResults()
  await closeBattleResults(app.user)
  return app
}

async function openTavernInWhitemoon(user) {
  await user.dblClick(getTownInTownList('Whitemoon'))
  await openTavern(user)
}

async function hireBeatenHeroAgain(user) {
  await openTavernInWhitemoon(user)
  await hireHero(user, BEATEN_HERO)
  await leaveTown(user)
  await clickHeroInHeroList(user, BEATEN_HERO)
}

describe('hero defeat behavior', () => {
  test('given a hero loses a battle when the results window closes then they are gone from the hero list', async () => {
    await loseBattle()

    expect(readHeroList()).toEqual([`${OTHER_HERO} 1500`])
  })

  test("given the selected hero loses a battle when the results window closes then the player's other hero is selected", async () => {
    await loseBattle()

    expect(readSelectedHeroInHeroList()).toEqual([OTHER_HERO])
  })

  test('given a hero the scenario started with lost a battle when the tavern offers new heroes then that hero can be offered', async () => {
    const { user } = await loseBattle()

    await openTavernInWhitemoon(user)

    expect(readHeroesForHire()).toContain(BEATEN_HERO)
  })

  test("given a beaten hero is hired again then they are level 1 with their class's starting primary skills", async () => {
    const { user } = await loseBattle()

    await hireBeatenHeroAgain(user)

    expect(readHeroScreenTitle()).toEqual([BEATEN_HERO, 'Level 1 Knight'])
    expect(readHeroScreenPrimarySkills()).toEqual([
      'Attack 2',
      'Defense 2',
      'Power 1',
      'Knowledge 1'
    ])
  })

  test('given a beaten hero is hired again then they have their starting secondary skills', async () => {
    const { user } = await loseBattle()

    await hireBeatenHeroAgain(user)

    expect(readHeroScreenSecondarySkills().slice(0, 3)).toEqual([
      'Basic Leadership',
      'Basic Artillery',
      ''
    ])
  })

  test("given a beaten hero is hired again then they come with their class's starting army", async () => {
    const { user } = await loseBattle()

    await hireBeatenHeroAgain(user)

    expect(readHeroScreenArmy()).toEqual(['Pikemen 20', '', '', '', '', '', ''])
  })

  test('given a hero lost a battle when the page reloads then the tavern can still offer them', async () => {
    const scenario = aDefeatScenario()
    const eventLog = createMemoryEventLog()
    await loseBattle(scenario, { eventLog })

    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: scenario.build(),
      eventLog,
      appConfig: { ...appConfig, random: HIGHEST_ROLLS }
    })
    await openTavernInWhitemoon(user)

    expect(readHeroesForHire()).toContain(BEATEN_HERO)
  })

  // Christian visits the Mercenary Camp at (8, 5) from below, then loses to the Swordsmen at
  // (12, 6). Hired again in Whitemoon, he walks back to the camp.
  test('given a beaten hero is hired again then a Mercenary Camp they had visited trains them again', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aDefeatScenario()
        .withEntities(
          aHero()
            .withName(BEATEN_HERO)
            .withArmy([{ creature: 'SKELETON', count: 1 }])
            .at(8, 6),
          aHero().withId('hero-2').withName(OTHER_HERO).at(0, 6),
          aMonster().withType('SWORDSMAN').withCount(2).withStacks(1).at(12, 6),
          aBonusObject().withType('MERCENARY_CAMP').at(8, 5),
          aTown().named('Whitemoon').ownedByPlayer().withBuildings(['TAVERN']).at(4, 3)
        )
        .build(),
      appConfig: { ...appConfig, random: HIGHEST_ROLLS, fadeOutMsByKind: { MONSTER: 0 } }
    })
    confirmTileClickByDispatch(8, 5)
    await flushMicrotasks()
    expect(readMessageRewards()).toEqual(['+1 Attack'])
    await closeInteractionModal(user)
    await attackMonsterAt(12, 6)
    await clickBattleButton(user, 'Auto combat')
    await waitForBattleResults()
    await closeBattleResults(user)

    await hireBeatenHeroAgain(user)
    await closeHeroScreen(user)
    confirmTileClickByDispatch(8, 5)
    await flushMicrotasks()

    expect(readMessageRewards()).toEqual(['+1 Attack'])
    expect(readPrimarySkills(getHeroInfoBox())[0]).toBe('Attack 3')
  })
})
