// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { attackMonsterAt, confirmTileClickByDispatch } from './adventure-map.utils.js'
import {
  closeInteractionModal,
  getHeroInfoBox,
  getHeroInHeroList,
  getTownInTownList,
  readArmySlots,
  readHeroList,
  readMessage,
  readMessageRewards,
  readPrimarySkills,
  readSelectedHeroInHeroList,
  readSpellPoints
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  castSpellAt,
  clickBattleButton,
  closeBattleResults,
  startBattle,
  waitForBattleResults
} from './battle.utils.js'
import {
  aBonusObject,
  aHero,
  aMonster,
  anArtifactDefinition,
  aScenario,
  aTown
} from './builders.js'
import {
  clickHeroInHeroList,
  clickHeroScreenSpellBook,
  closeHeroScreen,
  readHeroScreenArmy,
  readHeroScreenArtifacts,
  readHeroScreenBackpack,
  readHeroScreenBox,
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
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json'),
  bonusObjects: readGameData('bonus-objects.json'),
  spells: readGameData('spells.json'),
  artifacts: {
    AXE: anArtifactDefinition().withName("Centaur's Axe").withSlot('WEAPON').build(),
    SWORD: anArtifactDefinition().withName('Sword of Judgement').withSlot('WEAPON').build()
  }
}

const BEATEN_HERO = 'Christian'
const OTHER_HERO = 'Sir Mullich'

// Every roll the highest: the tavern offers the last heroes of its pool still free, Christian first.
// A hired hero's starting army rolls 100, so only the first stack comes, at its largest.
const HIGHEST_ROLLS = () => 0.99

// Christian, a level 3 Knight with primary and secondary skills of his own, attacks the Swordsmen
// with a lone Skeleton and loses. Whitemoon's entrance is at (4, 3), away from both heroes.
const aDefeatScenario = ({ artifacts = [], spells = [] } = {}) =>
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
        .withArtifacts(artifacts)
        .withSpellBook(spells.length > 0)
        .withSpells(spells)
        .at(0, 0),
      aHero().withId('hero-2').withName(OTHER_HERO).at(0, 6),
      aMonster().withType('SWORDSMAN').withCount(2).withStacks(1).at(1, 0),
      aTown().named('Whitemoon').ownedByPlayer().withBuildings(['TAVERN']).at(4, 3)
    )
    .withDefinitions(gameDefinitions)
    .withStartingResources({ GOLD_PILE: 10000 })

const appConfig = { interactionModalTransitionMs: 0 }

// A lone stack stands in the middle of the hero's side of the battlefield.
const OWN_HEX = { row: 6, column: 1 }

const MERCENARY_CAMP_ALREADY_VISITED =
  'You\'ve come upon a camp of mercenaries practicing their combat tactics. "You\'re too advanced for us," the mercenary captain says. "We can teach you nothing more."'

async function loseBattle(
  scenario = aDefeatScenario(),
  { eventLog, beforeAttack, beforeAutoCombat } = {}
) {
  const app = await startBattle(scenario, {
    random: HIGHEST_ROLLS,
    appConfig,
    eventLog,
    beforeAttack
  })
  await beforeAutoCombat?.(app)
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

  test('given a beaten hero is offered again then the tavern describes them with their level and number of artifacts', async () => {
    const { user } = await loseBattle(aDefeatScenario({ artifacts: ['AXE'] }))
    await openTavernInWhitemoon(user)

    await selectHeroForHire(user, BEATEN_HERO)

    expect(readHeroForHireDescription()).toBe(
      `${BEATEN_HERO} is a level 3 Knight with 1 artifacts.`
    )
  })

  test('given a beaten hero is hired again then they have their level, experience, primary and secondary skills', async () => {
    const { user } = await loseBattle()

    await hireBeatenHeroAgain(user)

    expect(readHeroScreenTitle()).toEqual([BEATEN_HERO, 'Level 3 Knight'])
    expect(readHeroScreenBox('Experience')).toBe('Experience 3000')
    expect(readHeroScreenPrimarySkills()).toEqual([
      'Attack 6',
      'Defense 5',
      'Power 3',
      'Knowledge 2'
    ])
    expect(readHeroScreenSecondarySkills().slice(0, 4)).toEqual([
      'Expert Leadership',
      'Advanced Artillery',
      'Basic Logistics',
      ''
    ])
  })

  test('given a beaten hero is hired again then they have their spell book and spells', async () => {
    const { user } = await loseBattle(aDefeatScenario({ spells: ['MAGIC_ARROW'] }))

    await hireBeatenHeroAgain(user)

    expect(readHeroScreenSpellBook()).toBe('Spell Book')
    await clickHeroScreenSpellBook(user)
    await clickSpellBookControl(user, 'Combat spells')
    expect(readSpellBookSpellNames()).toEqual(['Magic Arrow'])
  })

  test('given a hero beaten by monsters is hired again then they wear and carry the same artifacts', async () => {
    const { user } = await loseBattle(aDefeatScenario({ artifacts: ['AXE', 'SWORD'] }))

    await hireBeatenHeroAgain(user)

    expect(readHeroScreenArtifacts()).toEqual({ Weapon: "Centaur's Axe" })
    expect(readHeroScreenBackpack()).toEqual(['Sword of Judgement'])
  })

  test("given a beaten hero offered at the start of a week is hired then they come with their class's starting army", async () => {
    const { user } = await loseBattle()

    await hireBeatenHeroAgain(user)

    expect(readHeroScreenArmy()).toEqual(['Pikemen 20', '', '', '', '', '', ''])
  })

  // The tavern was opened before the battle, offering Sorsha and Lord Haart. Hiring Sorsha after
  // the battle brings Christian in her place.
  test("given a beaten hero is offered in a hired hero's place then they bring one creature of their first starting stack", async () => {
    const { user } = await loseBattle(aDefeatScenario(), {
      beforeAttack: async (app) => {
        await openTavernInWhitemoon(app.user)
        await leaveTown(app.user)
        await app.user.click(getHeroInHeroList(BEATEN_HERO))
      }
    })
    await openTavernInWhitemoon(user)
    await hireHero(user, 'Sorsha')
    await openTavern(user)

    await holdRightButtonOnHeroForHire(user, BEATEN_HERO)

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

  // Christian casts Shield (5 spell points of his 20) on his Skeleton before he loses.
  test('given a beaten hero is hired again then they have full movement points and spell points', async () => {
    const { user } = await loseBattle(aDefeatScenario({ spells: ['SHIELD'] }), {
      beforeAutoCombat: async (app) => {
        await waitMs(5000)
        await castSpellAt(app.user, 'Shield', OWN_HEX)
        await waitMs(1000)
      }
    })

    await openTavernInWhitemoon(user)
    await hireHero(user, BEATEN_HERO)
    await leaveTown(user)

    expect(readHeroList()).toContain(`${BEATEN_HERO} 1500`)
    expect(readSpellPoints(getHeroInfoBox())).toBe('20')
  })

  test('given a hero lost a battle when the page reloads then the tavern still offers them as they left', async () => {
    const scenario = aDefeatScenario()
    const eventLog = createMemoryEventLog()
    await loseBattle(scenario, { eventLog })

    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: scenario.build(),
      eventLog,
      appConfig: { ...appConfig, random: HIGHEST_ROLLS }
    })
    await openTavernInWhitemoon(user)
    await hireHero(user, BEATEN_HERO)
    await leaveTown(user)
    await clickHeroInHeroList(user, BEATEN_HERO)

    expect(readHeroScreenTitle()).toEqual([BEATEN_HERO, 'Level 3 Knight'])
  })

  // Christian visits the Mercenary Camp at (8, 5) from below, then loses to the Swordsmen at
  // (12, 6). Hired again in Whitemoon, he walks back to the camp.
  test("given a beaten hero is hired again then a Mercenary Camp they had visited doesn't train them again", async () => {
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

    expect(readMessage()).toBe(MERCENARY_CAMP_ALREADY_VISITED)
    expect(readPrimarySkills(getHeroInfoBox())[0]).toBe('Attack 3')
  })
})
