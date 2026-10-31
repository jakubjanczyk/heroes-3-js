// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  createMemoryEventLog,
  pressKey,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, aScenario, aSpellDefinition } from './builders.js'
import {
  clickHeroInHeroList,
  clickHeroScreenSpellBook,
  queryHeroScreen,
  readHeroScreenSpellBook
} from './hero-screen.utils.js'
import {
  clickSpell,
  clickSpellBookControl,
  getCastSpellButton,
  holdRightButtonOnSpell,
  hoverSpell,
  hoverSpellBookControl,
  openSpellBookFromMap,
  querySpellBook,
  readSelectedSpellBookTabs,
  readSpellBookMessage,
  readSpellBookPages,
  readSpellBookSchoolHeading,
  readSpellBookSpellNames,
  readSpellBookSpellPoints,
  readSpellBookSpells,
  readSpellBookStatusBar,
  readSpellPopup,
  readUnaffordableSpells
} from './spell-book.utils.js'

const ALL_SCHOOLS = ['AIR', 'EARTH', 'FIRE', 'WATER']

const spell = ({ name, level = 1, schools = ['AIR'], kind = 'combat', costs = [5, 4, 4, 4] }) =>
  aSpellDefinition()
    .withName(name)
    .withLevel(level)
    .withSchools(schools)
    .withKind(kind)
    .withCosts(costs)
    .describedAs(`${name} description.`)
    .build()

const spellDefinitions = {
  MAGIC_ARROW: spell({ name: 'Magic Arrow', schools: ALL_SCHOOLS }),
  HASTE: spell({ name: 'Haste', costs: [6, 5, 5, 5] }),
  CURSE: spell({ name: 'Curse', schools: ['FIRE'], costs: [6, 5, 5, 5] }),
  SLOW: spell({ name: 'Slow', schools: ['EARTH'], costs: [6, 5, 5, 5] }),
  BLESS: spell({ name: 'Bless', schools: ['WATER'] }),
  LIGHTNING_BOLT: spell({ name: 'Lightning Bolt', level: 2, costs: [10, 8, 8, 8] }),
  FIREBALL: spell({ name: 'Fireball', level: 3, schools: ['FIRE'], costs: [15, 12, 12, 12] }),
  TELEPORT: spell({ name: 'Teleport', level: 3, schools: ['WATER'], costs: [15, 12, 6, 3] }),
  VIEW_AIR: spell({ name: 'View Air', kind: 'adventure', costs: [2, 1, 1, 1] }),
  VIEW_EARTH: spell({
    name: 'View Earth',
    schools: ['EARTH'],
    kind: 'adventure',
    costs: [2, 1, 1, 1]
  }),
  ...Object.fromEntries(
    Array.from({ length: 13 }, (_, index) => {
      const name = `Air ${String(index + 1).padStart(2, '0')}`
      return [name.toUpperCase().replace(' ', '_'), spell({ name })]
    })
  )
}

// Air 01 to Air 13: thirteen level 1 Air spells, sorted by their names.
const airSpells = (count) =>
  Array.from({ length: count }, (_, index) => `AIR_${String(index + 1).padStart(2, '0')}`)

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  spells: spellDefinitions
}

const HERO = 'Christian'

const basic = (skill) => ({ skill, level: 'BASIC' })
const advanced = (skill) => ({ skill, level: 'ADVANCED' })
const expert = (skill) => ({ skill, level: 'EXPERT' })

// A Knight, Knowledge 1, so 10 spell points.
const aHeroWithSpells = (spells, skills = []) =>
  aHero().withName(HERO).withSecondarySkills(skills).withSpellBook(true).withSpells(spells)

const aSpellBookScenario = (hero = aHeroWithSpells(['MAGIC_ARROW', 'VIEW_AIR'])) =>
  aScenario().withSize(4).withEntities(hero.at(0, 0)).withDefinitions(gameDefinitions)

async function setupApp(scenario = aSpellBookScenario(), { eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    eventLog
  })
}

async function startInSpellBook(hero, { kind = 'Combat spells' } = {}) {
  const app = await setupApp(aSpellBookScenario(hero))
  await openSpellBookFromMap(app.user)
  if (kind === 'Combat spells') {
    await clickSpellBookControl(app.user, kind)
  }
  return app
}

describe('spell book behavior', () => {
  describe('having one', () => {
    test('given a hero with a spell book when the hero screen opens then the spell book is in its frame', async () => {
      const { user } = await setupApp()

      await clickHeroInHeroList(user, HERO)

      expect(readHeroScreenSpellBook()).toBe('Spell Book')
    })

    test('given a hero without a spell book when the hero screen opens then the spell book frame is empty', async () => {
      const { user } = await setupApp(
        aSpellBookScenario(aHero().withName(HERO).withSecondarySkills([]))
      )

      await clickHeroInHeroList(user, HERO)

      expect(readHeroScreenSpellBook()).toBeNull()
    })

    test('given a hero without a spell book when the game loads then Cast spell is disabled', async () => {
      await setupApp(aSpellBookScenario(aHero().withName(HERO).withSecondarySkills([])))

      expect(getCastSpellButton().disabled).toBe(true)
    })

    test('given a hero with a spell book when the page reloads then the book still has their spells', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aSpellBookScenario(aHeroWithSpells(['VIEW_AIR', 'VIEW_EARTH']))
      await setupApp(scenario, { eventLog })

      const reloaded = await setupApp(scenario, { eventLog })
      await openSpellBookFromMap(reloaded.user)

      expect(readSpellBookSpellNames()).toEqual(['View Air', 'View Earth'])
    })
  })

  describe('opening and closing', () => {
    test('given a hero with a spell book when the player clicks Cast spell then the book opens on all adventure spells', async () => {
      const { user } = await setupApp()

      await openSpellBookFromMap(user)

      expect(readSelectedSpellBookTabs()).toEqual(['All', 'Adventure spells'])
      expect(readSpellBookSpellNames()).toEqual(['View Air'])
    })

    test('given the hero screen when the player clicks the spell book then it opens', async () => {
      const { user } = await setupApp()
      await clickHeroInHeroList(user, HERO)

      await clickHeroScreenSpellBook(user)

      expect(querySpellBook()).toBeTruthy()
    })

    test('given the spell book over the hero screen when the player closes it then the hero screen stays', async () => {
      const { user } = await setupApp()
      await clickHeroInHeroList(user, HERO)
      await clickHeroScreenSpellBook(user)

      await clickSpellBookControl(user, 'Close')

      expect([querySpellBook(), Boolean(queryHeroScreen())]).toEqual([null, true])
    })

    test('given the spell book open when the player presses Escape then it closes', async () => {
      const { user } = await setupApp()
      await openSpellBookFromMap(user)

      await pressKey(user, '{Escape}')

      expect(querySpellBook()).toBeNull()
    })

    test("given the spell book open when it shows the spell points then they are the hero's", async () => {
      await startInSpellBook(aHeroWithSpells(['MAGIC_ARROW']))

      expect(readSpellBookSpellPoints()).toBe('10')
    })
  })

  describe('each spell', () => {
    test('given a hero without the school when the book shows a spell then it has its name, level and full cost', async () => {
      await startInSpellBook(aHeroWithSpells(['MAGIC_ARROW']))

      expect(readSpellBookSpells()).toEqual(['Magic Arrow 1st lev Spell Points: 5'])
    })

    test("given a hero with Basic Air Magic when the book shows an Air spell then it has the lower cost and the skill's level", async () => {
      await startInSpellBook(aHeroWithSpells(['HASTE'], [basic('AIR_MAGIC')]))

      expect(readSpellBookSpells()).toEqual(['Haste 1st lev/Bas Spell Points: 5'])
    })

    test.each([
      ['no', '3rd lev Spell Points: 15', []],
      ['Basic', '3rd lev/Bas Spell Points: 12', [basic('WATER_MAGIC')]],
      ['Advanced', '3rd lev/Adv Spell Points: 6', [advanced('WATER_MAGIC')]],
      ['Expert', '3rd lev/Exp Spell Points: 3', [expert('WATER_MAGIC')]]
    ])('given a hero with %s Water Magic when the book shows a spell whose cost changes at each level then it has %s', async (_, levelAndCost, skills) => {
      await startInSpellBook(aHeroWithSpells(['TELEPORT'], skills))

      expect(readSpellBookSpells()).toEqual([`Teleport ${levelAndCost}`])
    })

    test('given a hero with Basic Air and Advanced Earth Magic when the book shows a spell of all schools then it uses Advanced', async () => {
      await startInSpellBook(
        aHeroWithSpells(['MAGIC_ARROW'], [basic('AIR_MAGIC'), advanced('EARTH_MAGIC')])
      )

      expect(readSpellBookSpells()).toEqual(['Magic Arrow 1st lev/Adv Spell Points: 4'])
    })

    test('given a hero with 10 spell points when the book shows a spell costing 15 then it is marked as too dear', async () => {
      await startInSpellBook(aHeroWithSpells(['MAGIC_ARROW', 'FIREBALL']))

      expect(readUnaffordableSpells()).toEqual(['Fireball'])
    })

    test('given the spell book when the player hovers over a spell then the status bar names it and its level', async () => {
      const { user } = await startInSpellBook(aHeroWithSpells(['MAGIC_ARROW']))

      await hoverSpell(user, 'Magic Arrow')

      expect(readSpellBookStatusBar()).toBe('Magic Arrow (1st lev)')
    })

    test('given a hero with Advanced Fire Magic when the player holds the right button on a Fire spell then the popup shows its Advanced description', async () => {
      const { user } = await startInSpellBook(
        aHeroWithSpells(['FIREBALL'], [advanced('FIRE_MAGIC')])
      )

      await holdRightButtonOnSpell(user, 'Fireball')

      expect(readSpellPopup()).toEqual(['Advanced Fireball', 'Fireball description.'])
    })

    test('given a hero with 10 spell points when the player clicks a spell costing 15 then the book says they cannot cast it', async () => {
      const { user } = await startInSpellBook(aHeroWithSpells(['FIREBALL']))

      await clickSpell(user, 'Fireball')

      expect(readSpellBookMessage()).toEqual([
        '',
        "That spell costs 15 spell points.  Your hero only has 10 spell points, and therefore can't cast the spell."
      ])
    })

    test('given a hero with enough spell points when the player clicks a spell then the book shows its description', async () => {
      const { user } = await startInSpellBook(aHeroWithSpells(['MAGIC_ARROW']))

      await clickSpell(user, 'Magic Arrow')

      expect(readSpellBookMessage()).toEqual(['Magic Arrow', 'Magic Arrow description.'])
    })
  })

  describe('tabs and pages', () => {
    // Level first; then Air (and the spells of all schools), Fire, Earth and Water; then the name.
    test('given spells of two levels and every school when the book opens then they are sorted by level, school and name', async () => {
      await startInSpellBook(
        aHeroWithSpells(['LIGHTNING_BOLT', 'BLESS', 'SLOW', 'CURSE', 'MAGIC_ARROW', 'HASTE'])
      )

      expect(readSpellBookSpellNames()).toEqual([
        'Haste',
        'Magic Arrow',
        'Curse',
        'Slow',
        'Bless',
        'Lightning Bolt'
      ])
    })

    test('given 13 spells when the player turns to the next page then the first twelve were on the first spread and the last is on the next', async () => {
      const { user } = await startInSpellBook(aHeroWithSpells(airSpells(13)))
      const firstSpread = readSpellBookPages()

      await clickSpellBookControl(user, 'Next page')

      expect([firstSpread, readSpellBookPages()]).toEqual([
        {
          left: ['Air 01', 'Air 02', 'Air 03', 'Air 04', 'Air 05', 'Air 06'],
          right: ['Air 07', 'Air 08', 'Air 09', 'Air 10', 'Air 11', 'Air 12']
        },
        { left: ['Air 13'], right: [] }
      ])
    })

    test('given the second spread when the player turns to the previous page then the first spread is back', async () => {
      const { user } = await startInSpellBook(aHeroWithSpells(airSpells(13)))
      await clickSpellBookControl(user, 'Next page')

      await clickSpellBookControl(user, 'Previous page')

      expect(readSpellBookSpellNames()).toHaveLength(12)
    })

    test("given Air and Fire spells when the player opens the Air bookmark then its first spread has the school's heading and ten Air spells", async () => {
      const { user } = await startInSpellBook(aHeroWithSpells([...airSpells(11), 'CURSE']))

      await clickSpellBookControl(user, 'Air')

      expect([readSpellBookSchoolHeading(), readSpellBookPages()]).toEqual([
        'Air Magic',
        {
          left: ['Air 01', 'Air 02', 'Air 03', 'Air 04'],
          right: ['Air 05', 'Air 06', 'Air 07', 'Air 08', 'Air 09', 'Air 10']
        }
      ])
    })

    test('given the adventure spells when the player turns to the combat spells then the book shows those', async () => {
      const { user } = await setupApp()
      await openSpellBookFromMap(user)

      await clickSpellBookControl(user, 'Combat spells')

      expect(readSpellBookSpellNames()).toEqual(['Magic Arrow'])
    })

    test('given the player left the book on the Earth bookmark when they open it again then it is on the Earth bookmark', async () => {
      const { user } = await setupApp(
        aSpellBookScenario(aHeroWithSpells(['VIEW_AIR', 'VIEW_EARTH']))
      )
      await openSpellBookFromMap(user)
      await clickSpellBookControl(user, 'Earth')
      await clickSpellBookControl(user, 'Close')

      await openSpellBookFromMap(user)

      expect([readSelectedSpellBookTabs(), readSpellBookSpellNames()]).toEqual([
        ['Earth', 'Adventure spells'],
        ['View Earth']
      ])
    })

    test.each([
      ['Air', 'Turn to view Air spells'],
      ['Earth', 'Turn to view Earth spells'],
      ['Fire', 'Turn to view Fire spells'],
      ['Water', 'Turn to view Water spells'],
      ['All', 'Show all spell schools'],
      ['Combat spells', 'Turn to view combat spells'],
      ['Adventure spells', 'Turn to view adventure map spells'],
      ['Previous page', 'Turn to the previous page'],
      ['Next page', 'Turn to the next page'],
      ['Close', 'Close the Spell Book']
    ])('given the spell book when the player hovers over %s then the status bar says "%s"', async (control, text) => {
      const { user } = await setupApp()
      await openSpellBookFromMap(user)

      await hoverSpellBookControl(user, control)

      expect(readSpellBookStatusBar()).toBe(text)
    })
  })
})
