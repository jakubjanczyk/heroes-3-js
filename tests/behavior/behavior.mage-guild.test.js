// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  answerMessage,
  expectResourceTotal,
  getTownInTownList,
  readMessage,
  readMessageButtons,
  readMessagePictures
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  pressKey,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, aScenario, aSpellDefinition, aTown } from './builders.js'
import { clickHeroInHeroList, readHeroScreenSpellBook } from './hero-screen.utils.js'
import {
  clickSpellBookControl,
  getCastSpellButton,
  openSpellBookFromMap,
  readSpellBookSpellNames,
  readSpellPopup
} from './spell-book.utils.js'
import {
  buildInTown,
  clickBuildingOnPicture,
  clickMageGuildSpell,
  closeMageGuild,
  closeMageGuildMessage,
  enterTownAt,
  hireHero,
  holdRightButtonOnMageGuildSpell,
  hoverMageGuildCloseButton,
  hoverMageGuildSpell,
  leaveTown,
  openMageGuild,
  openTavern,
  queryMageGuild,
  queryMageGuildMessage,
  queryTownScreen,
  readMageGuildLevels,
  readMageGuildMessage,
  readMageGuildStatusBar,
  releaseRightButton
} from './town-screen.utils.js'

const spell = (name, level, chance = 10) =>
  aSpellDefinition()
    .withName(name)
    .withLevel(level)
    .describedAs(`${name} description.`)
    .inMageGuildOf('CASTLE', chance)
    .build()

const spellsOf = (names, level) =>
  Object.fromEntries(
    names.map((name) => [name.toUpperCase().replace(' ', '_'), spell(name, level)])
  )

// Exactly as many spells of each level as the guild has places for, so all of them show.
const LEVEL_1 = ['Bless', 'Cure', 'Dispel', 'Haste', 'Shield']
const LEVEL_2 = ['Blind', 'Fortune', 'Ice Bolt', 'Precision']
const LEVEL_3 = ['Fireball', 'Frost Ring', 'Teleport']
const LEVEL_4 = ['Prayer', 'Slayer']
const LEVEL_5 = ['Fly']

const guildSpells = {
  ...spellsOf(LEVEL_1, 1),
  ...spellsOf(LEVEL_2, 2),
  ...spellsOf(LEVEL_3, 3),
  ...spellsOf(LEVEL_4, 4),
  ...spellsOf(LEVEL_5, 5)
}

// Seven level 1 spells for five places: which five come up depends on the roll.
const MORE_LEVEL_1 = ['Bless', 'Cure', 'Dispel', 'Haste', 'Shield', 'Slow', 'Stone Skin']

const castle = readGameData('towns.json').CASTLE

const gameDefinitions = (spells = guildSpells, towns = { CASTLE: castle }) => ({
  hero: { name: 'Sir Christian' },
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  buildings: readGameData('buildings.json'),
  towns,
  spells
})

// Castle's guild stops at level 4; this one, in the Hall's place for it, goes up to level 5.
const aCastleWithFiveGuildLevels = () => ({
  CASTLE: {
    ...castle,
    hall: castle.hall.map((row) =>
      row.map((chain) => (chain.includes('MAGE_GUILD_1') ? [...chain, 'MAGE_GUILD_5'] : chain))
    )
  }
})

const guildUpTo = (level) => Array.from({ length: level }, (_, index) => `MAGE_GUILD_${index + 1}`)

const aWhitemoon = ({ guildLevel = 1 } = {}) =>
  aTown().named('Whitemoon').ownedByPlayer().withBuildings(guildUpTo(guildLevel))

const PLENTY_OF_RESOURCES = {
  GOLD_PILE: 20000,
  WOOD_PILE: 50,
  ORE_PILE: 50,
  MERCURY_PILE: 50,
  SULFUR_PILE: 50,
  CRYSTAL_PILE: 50,
  GEMS_PILE: 50
}

const aGuildScenario = ({ town = aWhitemoon(), definitions = gameDefinitions() } = {}) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(aHero().at(4, 5), town.at(4, 3))
    .withDefinitions(definitions)
    .withStartingResources(PLENTY_OF_RESOURCES)

// The first roll picks from the start of the spells, any later one from their end, so spells
// rolled twice come out different.
const firstRollThenAnother = () => {
  let rolls = 0
  return () => (rolls++ < 5 ? 0 : 0.99)
}

async function setupApp(scenario = aGuildScenario(), { random, eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0, ...(random ? { random } : {}) },
    eventLog
  })
}

async function startInWhitemoon(scenario, options) {
  const app = await setupApp(scenario, options)
  await app.user.dblClick(getTownInTownList('Whitemoon'))
  return app
}

async function startInMageGuild(scenario, options) {
  const app = await startInWhitemoon(scenario, options)
  await openMageGuild(app.user, guildNameOnPicture(scenario))
  return app
}

function guildNameOnPicture(scenario) {
  const [town] = scenario.build().entities.filter(({ kind }) => kind === 'TOWN')
  return `Mage Guild Level ${town.buildings.length}`
}

const closedScrolls = (count) => new Array(count).fill('Closed scroll')

describe('mage guild behavior', () => {
  describe('opening it', () => {
    test('clicking the Mage Guild on the town picture opens the Mage Guild screen', async () => {
      const { user } = await startInWhitemoon()

      await openMageGuild(user)

      expect(queryMageGuild()).not.toBeNull()
    })

    test('Close shuts the Mage Guild screen, back to the town', async () => {
      const { user } = await startInMageGuild(aGuildScenario())

      await closeMageGuild(user)

      expect(queryMageGuild()).toBeNull()
      expect(queryTownScreen()).not.toBeNull()
    })

    test('Escape shuts the Mage Guild screen, back to the town', async () => {
      const { user } = await startInMageGuild(aGuildScenario())

      await pressKey(user, '{Escape}')

      expect(queryMageGuild()).toBeNull()
      expect(queryTownScreen()).not.toBeNull()
    })

    test('hovering Close says "Exit Mage Guild" in the status bar', async () => {
      const { user } = await startInMageGuild(aGuildScenario())

      await hoverMageGuildCloseButton(user)

      expect(readMageGuildStatusBar()).toBe('Exit Mage Guild')
    })
  })

  describe('its spells', () => {
    test('a level 1 guild shows five level 1 spells', async () => {
      await startInMageGuild(aGuildScenario())

      expect(readMageGuildLevels()['Level 1']).toEqual(LEVEL_1)
    })

    test('a level 4 guild shows five, four, three and two spells of levels 1 to 4', async () => {
      await startInMageGuild(aGuildScenario({ town: aWhitemoon({ guildLevel: 4 }) }))

      expect(readMageGuildLevels()).toEqual({
        'Level 1': LEVEL_1,
        'Level 2': LEVEL_2,
        'Level 3': LEVEL_3,
        'Level 4': LEVEL_4
      })
    })

    test('a level 5 guild shows one level 5 spell', async () => {
      await startInMageGuild(
        aGuildScenario({
          town: aWhitemoon({ guildLevel: 5 }),
          definitions: gameDefinitions(guildSpells, aCastleWithFiveGuildLevels())
        })
      )

      expect(readMageGuildLevels()['Level 5']).toEqual(LEVEL_5)
    })

    test('the levels not built yet show as many closed scrolls as they will have spells', async () => {
      await startInMageGuild(
        aGuildScenario({ definitions: gameDefinitions(guildSpells, aCastleWithFiveGuildLevels()) })
      )

      expect(readMageGuildLevels()).toEqual({
        'Level 1': LEVEL_1,
        'Level 2': closedScrolls(4),
        'Level 3': closedScrolls(3),
        'Level 4': closedScrolls(2),
        'Level 5': closedScrolls(1)
      })
    })

    test('a town whose guild stops at level 4 has no scrolls for level 5', async () => {
      await startInMageGuild(aGuildScenario())

      expect(Object.keys(readMageGuildLevels())).toEqual([
        'Level 1',
        'Level 2',
        'Level 3',
        'Level 4'
      ])
    })

    test('a spell with no chance in the town never comes up', async () => {
      const curse = aSpellDefinition().withName('Curse').withLevel(1).inMageGuildOf('INFERNO', 90)
      await startInMageGuild(
        aGuildScenario({ definitions: gameDefinitions({ ...guildSpells, CURSE: curse.build() }) })
      )

      expect(readMageGuildLevels()['Level 1']).toEqual(LEVEL_1)
    })

    test('shows the same spells when the screen is opened again', async () => {
      const { user } = await startInMageGuild(
        aGuildScenario({ definitions: gameDefinitions(spellsOf(MORE_LEVEL_1, 1)) }),
        { random: firstRollThenAnother() }
      )
      const firstSpells = readMageGuildLevels()['Level 1']
      await closeMageGuild(user)

      await openMageGuild(user)

      expect(readMageGuildLevels()['Level 1']).toEqual(firstSpells)
    })

    test("building the next level keeps the spells shown and adds the new level's", async () => {
      const spells = { ...spellsOf(MORE_LEVEL_1, 1), ...spellsOf(LEVEL_2, 2) }
      const { user } = await startInMageGuild(
        aGuildScenario({ definitions: gameDefinitions(spells) }),
        { random: firstRollThenAnother() }
      )
      const levelOneSpells = readMageGuildLevels()['Level 1']
      await closeMageGuild(user)

      await buildInTown(user, 'Mage Guild Level 2')
      await openMageGuild(user, 'Mage Guild Level 2')

      expect(readMageGuildLevels()).toMatchObject({ 'Level 1': levelOneSpells, 'Level 2': LEVEL_2 })
    })

    test('shows the same spells after a reload', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aGuildScenario({ definitions: gameDefinitions(spellsOf(MORE_LEVEL_1, 1)) })
      await startInMageGuild(scenario, { random: firstRollThenAnother(), eventLog })
      const levelOneSpells = readMageGuildLevels()['Level 1']

      await startInMageGuild(scenario, { random: () => 0.99, eventLog })

      expect(readMageGuildLevels()['Level 1']).toEqual(levelOneSpells)
    })
  })

  describe('a spell', () => {
    test('hovering a spell shows its name in the status bar', async () => {
      const { user } = await startInMageGuild(aGuildScenario())

      await hoverMageGuildSpell(user, 'Haste')

      expect(readMageGuildStatusBar()).toBe('Haste')
    })

    test('clicking a spell shows its description', async () => {
      const { user } = await startInMageGuild(aGuildScenario())

      await clickMageGuildSpell(user, 'Haste')

      expect(readMageGuildMessage()).toEqual(['Haste', 'Haste description.'])
    })

    test("OK closes the spell's description", async () => {
      const { user } = await startInMageGuild(aGuildScenario())
      await clickMageGuildSpell(user, 'Haste')

      await closeMageGuildMessage(user)

      expect(queryMageGuildMessage()).toBeNull()
    })

    test("while a spell's description is open, clicking another spell keeps it", async () => {
      const { user } = await startInMageGuild(aGuildScenario())
      await clickMageGuildSpell(user, 'Haste')

      await clickMageGuildSpell(user, 'Bless')

      expect(readMageGuildMessage()).toEqual(['Haste', 'Haste description.'])
    })

    test("while a spell's description is open, Close leaves the guild open", async () => {
      const { user } = await startInMageGuild(aGuildScenario())
      await clickMageGuildSpell(user, 'Haste')

      await closeMageGuild(user)

      expect(queryMageGuild()).not.toBeNull()
    })

    test('holding the right button on a spell shows its description', async () => {
      const { user } = await startInMageGuild(aGuildScenario())

      await holdRightButtonOnMageGuildSpell(user, 'Haste')

      expect(readSpellPopup()).toEqual(['Haste', 'Haste description.'])
    })

    test('letting the right button go hides the description', async () => {
      const { user } = await startInMageGuild(aGuildScenario())
      await holdRightButtonOnMageGuildSpell(user, 'Haste')

      await releaseRightButton(user)

      expect(screen.queryByRole('tooltip')).toBeNull()
    })
  })

  describe('learning its spells', () => {
    test('a hero with a spell book who walks into a town with a level 2 guild learns its level 1 and 2 spells', async () => {
      const { user } = await setupApp(aLearningScenario({ guildLevel: 2 }))

      await enterTownAt(4, 3)

      expect(await readSpellsInBook(user)).toEqual(LEARNED_UP_TO_LEVEL_2)
    })

    test('a hero without Wisdom who walks into a level 3 guild does not learn its level 3 spell', async () => {
      const { user } = await setupApp(aLearningScenario({ guildLevel: 3 }))

      await enterTownAt(4, 3)

      expect(await readSpellsInBook(user)).toEqual(LEARNED_UP_TO_LEVEL_2)
    })

    test.each([
      ['BASIC', ['Fireball']],
      ['ADVANCED', ['Fireball', 'Prayer']],
      ['EXPERT', ['Fireball', 'Prayer', 'Fly']]
    ])('a hero with %s Wisdom in a level 5 guild learns up to its spells %j above level 2', async (wisdom, aboveLevel2) => {
      const { user } = await setupApp(
        aLearningScenario({
          guildLevel: 5,
          hero: aHeroWithSpellBook().withSecondarySkills([{ skill: 'WISDOM', level: wisdom }])
        })
      )

      await enterTownAt(4, 3)

      expect(await readSpellsInBook(user)).toEqual([...LEARNED_UP_TO_LEVEL_2, ...aboveLevel2])
    })

    test("a hero who already knows one of the guild's spells has it once in their book", async () => {
      const { user } = await setupApp(
        aLearningScenario({ hero: aHeroWithSpellBook(['CURE']), guildLevel: 1 })
      )

      await enterTownAt(4, 3)

      expect(await readSpellsInBook(user)).toEqual(['Bless', 'Cure'])
    })

    test('the spells learned in a guild never opened before are the ones its screen then shows', async () => {
      const { user } = await setupApp(
        aLearningScenario({ guildLevel: 1, spells: spellsOf(MORE_LEVEL_1, 1) }),
        { random: firstRollThenAnother() }
      )
      await enterTownAt(4, 3)

      await openMageGuild(user)

      const shownInGuild = readMageGuildLevels()['Level 1']
      expect(await readSpellsInBook(user)).toEqual(shownInGuild)
    })

    test('building the next guild level while the hero is in the town teaches its spells', async () => {
      const { user } = await setupApp(aLearningScenario({ guildLevel: 1 }))
      await enterTownAt(4, 3)

      await buildInTown(user, 'Mage Guild Level 2')

      expect(await readSpellsInBook(user)).toEqual(LEARNED_UP_TO_LEVEL_2)
    })

    test("a hero with a spell book hired in the tavern learns the guild's spells", async () => {
      const { user } = await setupApp(aHiringScenario())
      await user.dblClick(getTownInTownList('Whitemoon'))
      await openTavern(user)

      await hireHero(user, 'Adela')

      expect(await readSpellsInBook(user)).toEqual(['Bless', 'Cure'])
    })

    test('the learned spells are still in the book after a reload', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aLearningScenario({ guildLevel: 2 })
      await setupApp(scenario, { eventLog })
      await enterTownAt(4, 3)

      const { user } = await setupApp(scenario, { eventLog })

      expect(await readSpellsInBook(user)).toEqual(LEARNED_UP_TO_LEVEL_2)
    })
  })

  describe('buying a spell book', () => {
    test('with a hero without a spell book in the town, clicking the Mage Guild asks to buy one for 500 gold', async () => {
      const { user } = await startInWhitemoon(aBookBuyingScenario())

      await clickMageGuildOnPicture(user)

      expect({
        message: readMessage(),
        pictures: readMessagePictures(),
        buttons: readMessageButtons()
      }).toEqual({
        message: BUY_SPELL_BOOK_QUESTION,
        pictures: ['Spell Book'],
        buttons: ['Yes', 'No']
      })
    })

    test('Yes takes 500 gold and opens the Mage Guild', async () => {
      const { user } = await startInWhitemoon(aBookBuyingScenario())
      await clickMageGuildOnPicture(user)

      await answerMessage(user, 'Yes')

      expectResourceTotal('Gold', 1500)
      expect(queryMageGuild()).not.toBeNull()
    })

    test("after Yes, the hero has the spell book with the guild's spells up to their Wisdom", async () => {
      const { user } = await startInWhitemoon(aBookBuyingScenario({ guildLevel: 3 }))
      await clickMageGuildOnPicture(user, 'Mage Guild Level 3')

      await answerMessage(user, 'Yes')

      expect(await readSpellsInBook(user)).toEqual(LEARNED_UP_TO_LEVEL_2)
    })

    test('after Yes, the hero screen shows the spell book', async () => {
      const { user } = await startInWhitemoon(aBookBuyingScenario())
      await clickMageGuildOnPicture(user)
      await answerMessage(user, 'Yes')

      await closeMageGuild(user)
      await leaveTown(user)
      await clickHeroInHeroList(user, HERO)

      expect(readHeroScreenSpellBook()).toBe('Spell Book')
    })

    test('No opens the Mage Guild and keeps the gold, the hero still without a spell book', async () => {
      const { user } = await startInWhitemoon(aBookBuyingScenario())
      await clickMageGuildOnPicture(user)

      await answerMessage(user, 'No')

      expect(queryMageGuild()).not.toBeNull()
      expectResourceTotal('Gold', 2000)
      await closeMageGuild(user)
      await leaveTown(user)
      expect(getCastSpellButton().disabled).toBe(true)
    })

    test('with less than 500 gold, clicking the Mage Guild opens it and says the hero is short of cash', async () => {
      const { user } = await startInWhitemoon(aBookBuyingScenario({ gold: 499 }))

      await clickMageGuildOnPicture(user)

      expect(queryMageGuild()).not.toBeNull()
      expect({ message: readMessage(), buttons: readMessageButtons() }).toEqual({
        message: SHORT_OF_CASH,
        buttons: ['OK']
      })
    })

    test('with a hero with a spell book in the town, clicking the Mage Guild opens it without asking', async () => {
      const { user } = await startInWhitemoon(
        aBookBuyingScenario({ hero: aHeroWithSpellBook().at(4, 3) })
      )

      await clickMageGuildOnPicture(user)

      expect(queryMageGuild()).not.toBeNull()
      expect(readMessage()).toBeNull()
    })

    test('the bought spell book and its spells are kept after a reload', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aBookBuyingScenario()
      const { user: firstUser } = await startInWhitemoon(scenario, { eventLog })
      await clickMageGuildOnPicture(firstUser)
      await answerMessage(firstUser, 'Yes')

      const { user } = await setupApp(scenario, { eventLog })

      expect(await readSpellsInBook(user)).toEqual(['Bless', 'Cure'])
    })
  })
})

const HERO = 'Sir Christian'

const BUY_SPELL_BOOK_QUESTION =
  'To cast spells, your hero must first buy a spell book for 500 gold.  Do you wish to buy one?'
const SHORT_OF_CASH =
  'To cast spells, your hero must first buy a spell book for 500 gold.  Unfortunately, you seem to be a little short of cash at the moment.'

// Fewer spells than the places of each level, so a guild has them all whatever the roll, and the
// book shows them on one page: by level, then by name.
const learnableSpells = {
  ...spellsOf(['Bless', 'Cure'], 1),
  ...spellsOf(['Blind', 'Ice Bolt'], 2),
  ...spellsOf(['Fireball'], 3),
  ...spellsOf(['Prayer'], 4),
  ...spellsOf(['Fly'], 5)
}

const LEARNED_UP_TO_LEVEL_2 = ['Bless', 'Cure', 'Blind', 'Ice Bolt']

const aHeroWithSpellBook = (spells = []) =>
  aHero().withName(HERO).withSecondarySkills([]).withSpellBook(true).withSpells(spells)

// The hero starts two tiles below Whitemoon's entrance, at (4, 3).
const aLearningScenario = ({ hero = aHeroWithSpellBook(), guildLevel, spells = learnableSpells }) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(hero.at(4, 5), aWhitemoon({ guildLevel }).at(4, 3))
    .withDefinitions(gameDefinitions(spells, aCastleWithFiveGuildLevels()))
    .withStartingResources(PLENTY_OF_RESOURCES)

// A hero without a spell book stands in Whitemoon; the player opens it from the town list.
const aBookBuyingScenario = ({
  hero = aHero().withName(HERO).withSecondarySkills([]).at(4, 3),
  guildLevel = 1,
  gold = 2000
} = {}) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(hero, aWhitemoon({ guildLevel }).at(4, 3))
    .withDefinitions(gameDefinitions(learnableSpells))
    .withStartingResources({ GOLD_PILE: gold })

// Adela, the only hero for hire, comes with a spell book; the map's hero stays away from the town.
const aHiringScenario = () =>
  aScenario()
    .withSize(8, 7)
    .withEntities(
      aHero().withName(HERO).at(0, 6),
      aWhitemoon().withBuildings(['TAVERN', 'MAGE_GUILD_1']).at(4, 3)
    )
    .withDefinitions({
      ...gameDefinitions(learnableSpells),
      heroClasses: readGameData('hero-classes.json'),
      heroes: {
        ADELA: { name: 'Adela', heroClass: 'KNIGHT', secondarySkills: [], spellBook: true }
      },
      tavern: readGameData('tavern.json')
    })
    .withStartingResources({ GOLD_PILE: 10000 })

async function clickMageGuildOnPicture(user, buildingName = 'Mage Guild Level 1') {
  await clickBuildingOnPicture(user, buildingName)
}

// The spells in the selected hero's book, read from the adventure map: the town and its guild are
// closed first.
async function readSpellsInBook(user) {
  if (queryMageGuild()) {
    await closeMageGuild(user)
  }
  if (queryTownScreen()) {
    await leaveTown(user)
  }
  await openSpellBookFromMap(user)
  await clickSpellBookControl(user, 'Combat spells')
  return readSpellBookSpellNames()
}
