// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  clickTile,
  confirmMove,
  expectHeroAt,
  expectNoPreview,
  getMapViewCentreTile
} from './adventure-map.utils.js'
import {
  expectMovementPoints,
  getHeroInfoBox,
  getTownInTownList,
  readHeroList,
  readMessage,
  readSpellPoints
} from './adventure-panels.utils.js'
import {
  cancelTownPortalWindow,
  castSpellFromMap,
  pickTownInTownPortalWindow,
  readTownPortalWindowTowns
} from './adventure-spells.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aSpellDefinition, aTown } from './builders.js'
import {
  clickHeroInHeroList,
  clickHeroScreenSpellBook,
  queryHeroScreen
} from './hero-screen.utils.js'
import {
  clickSpell,
  clickSpellBookControl,
  openSpellBookFromMap,
  readSpellBookMessage,
  readSpellBookSpellNames
} from './spell-book.utils.js'
import { getVisitingHero, leaveTown, readTownName } from './town-screen.utils.js'

const HERO = 'Christian'

const spells = {
  TOWN_PORTAL: aSpellDefinition()
    .withName('Town Portal')
    .withLevel(4)
    .withSchools(['EARTH'])
    .withKind('adventure')
    .withCosts([16, 12, 12, 12])
    .describedAs('Town Portal description.')
    .withTownPortal({
      choosesTown: [false, false, true, true],
      movementPoints: [300, 300, 300, 200]
    })
    .build(),
  BLESS: aSpellDefinition()
    .withName('Bless')
    .withSchools(['WATER'])
    .describedAs('Bless description.')
    .inMageGuildOf('CASTLE', 10)
    .build()
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  buildings: readGameData('buildings.json'),
  towns: { CASTLE: readGameData('towns.json').CASTLE },
  spells
}

const earthMagic = (level) => [{ skill: 'EARTH_MAGIC', level }]

// A Knight with Knowledge 5: 50 spell points.
const aCaster = ({ earth = [] } = {}) =>
  aHero()
    .withName(HERO)
    .withPrimarySkills({ knowledge: 5 })
    .withSecondarySkills(earth)
    .withSpellBook(true)
    .withSpells(['TOWN_PORTAL'])

const anotherHero = (id, name) => aHero().withId(id).withName(name)

const whitemoon = () => aTown().withId('town-1').named('Whitemoon').ownedByPlayer()
const greenvale = () => aTown().withId('town-2').named('Greenvale').ownedByPlayer()

// Whitemoon's entrance is at (6, 2), five tiles from the hero at (2, 5); Greenvale's at (16, 2),
// further away. Row 5 is clear of both towns.
const aPortalScenario = ({
  hero = aCaster().at(2, 5),
  near = whitemoon(),
  far = greenvale(),
  others = []
} = {}) =>
  aScenario()
    .withSize(20, 6)
    .withEntities(hero, near.at(6, 2), far.at(16, 2), ...others)
    .withDefinitions(gameDefinitions)

async function setupApp(scenario = aPortalScenario(), { eventLog, viewportSize } = {}) {
  return setupMovementBehaviorApp({ loadGameOptions: scenario.build(), eventLog, viewportSize })
}

async function castTownPortal(scenario = aPortalScenario()) {
  const app = await setupApp(scenario)
  await castSpellFromMap(app.user, 'Town Portal')
  return app
}

const readHeroSpellPoints = () => readSpellPoints(getHeroInfoBox())

describe('adventure spells behavior', () => {
  describe('Town Portal, Basic', () => {
    test('given a hero with Town Portal and two towns when the player casts it then the hero stands in the nearest town', async () => {
      await castTownPortal()

      expectHeroAt(6, 2)
    })

    test("given a neutral town nearer than the player's town when the player casts Town Portal then the hero goes to the player's town", async () => {
      await castTownPortal(aPortalScenario({ near: aTown().withId('town-1').named('Whitemoon') }))

      expectHeroAt(16, 2)
    })

    test('given a hero casting Town Portal when they arrive then the town screen opens', async () => {
      await castTownPortal()

      expect(readTownName()).toBe('Whitemoon')
    })

    test('given a town whose Mage Guild has spells when the hero arrives by Town Portal then they learn them', async () => {
      const { user } = await castTownPortal(
        aPortalScenario({ near: whitemoon().withBuildings(['MAGE_GUILD_1']) })
      )
      await leaveTown(user)

      await openSpellBookFromMap(user)
      await clickSpellBookControl(user, 'Combat spells')

      expect(readSpellBookSpellNames()).toEqual(['Bless'])
    })

    test('given a hero who cast Town Portal when the player leaves the town screen then the map is centred on the hero in the town', async () => {
      const app = await setupApp(
        aScenario()
          .withSize(60, 40)
          .withEntities(aCaster().at(5, 35), whitemoon().at(30, 12))
          .withDefinitions(gameDefinitions),
        { viewportSize: { width: 1000, height: 700 } }
      )
      await castSpellFromMap(app.user, 'Town Portal')

      await leaveTown(app.user)

      expect(getMapViewCentreTile()).toEqual({ x: 30, y: 12 })
    })

    test('given a hero who cast Town Portal when the player clicks a tile next to the town then the hero walks there from the town', async () => {
      const { user } = await castTownPortal()
      await leaveTown(user)

      await confirmMove(user, 6, 3)

      expectHeroAt(6, 3)
      expectMovementPoints(1100)
    })

    test('given a hero with a planned route when they cast Town Portal then the route is gone', async () => {
      const { user } = await setupApp()
      await clickTile(user, 10, 5)

      await castSpellFromMap(user, 'Town Portal')
      await leaveTown(user)

      expectNoPreview()
    })

    test('given a hero without Earth Magic when they cast Town Portal then their spell points go down by its cost', async () => {
      const { user } = await castTownPortal()
      await leaveTown(user)

      expect(readHeroSpellPoints()).toBe('34')
    })
  })

  describe('Town Portal failing', () => {
    const NEAREST_TOWN_OCCUPIED = 'Nearest town occupied.  Spell Failed!'
    const NO_AVAILABLE_TOWN = 'No available town.  Spell Failed!'
    const TOO_TIRED = 'Your hero is too tired to cast this spell today.  Try again tomorrow.'

    // Thirteen steps along row 5 leave the hero 200 of their 1500 movement points.
    const tiredHero = async (user) => confirmMove(user, 15, 5)

    test.each([
      ['fewer than 300 movement points', aPortalScenario(), tiredHero, TOO_TIRED, { x: 15, y: 5 }],
      [
        'a hero in the nearest town',
        aPortalScenario({ others: [anotherHero('hero-2', 'Adela').at(6, 2)] }),
        null,
        NEAREST_TOWN_OCCUPIED,
        { x: 2, y: 5 }
      ],
      [
        'the hero standing in the nearest town',
        aPortalScenario({ hero: aCaster().at(6, 2) }),
        null,
        NEAREST_TOWN_OCCUPIED,
        { x: 6, y: 2 }
      ],
      [
        'no towns of the player',
        aPortalScenario({
          near: aTown().withId('town-1').named('Whitemoon'),
          far: aTown().withId('town-2').named('Greenvale')
        }),
        null,
        NO_AVAILABLE_TOWN,
        { x: 2, y: 5 }
      ],
      [
        'Advanced Earth Magic and a hero in every town',
        aPortalScenario({
          hero: aCaster({ earth: earthMagic('ADVANCED') }).at(2, 5),
          others: [anotherHero('hero-2', 'Adela').at(6, 2), anotherHero('hero-3', 'Rion').at(16, 2)]
        }),
        null,
        NO_AVAILABLE_TOWN,
        { x: 2, y: 5 }
      ]
    ])('given %s when the player casts Town Portal then it says why and the hero stays with their spell points and movement points', async (_case, scenario, before, message, tile) => {
      const { user } = await setupApp(scenario)
      if (before) {
        await before(user)
      }
      const heroListBefore = readHeroList()

      await castSpellFromMap(user, 'Town Portal')

      expect({
        message: readMessage(),
        spellPoints: readHeroSpellPoints(),
        heroList: readHeroList()
      }).toEqual({ message, spellPoints: '50', heroList: heroListBefore })
      expectHeroAt(tile.x, tile.y)
    })
  })

  describe('Town Portal, Advanced', () => {
    const anAdvancedScenario = ({ others = [], near = whitemoon() } = {}) =>
      aPortalScenario({
        hero: aCaster({ earth: earthMagic('ADVANCED') }).at(2, 5),
        near,
        others
      })

    test('given Advanced Earth Magic, an own town with a hero, an empty own town and a neutral town when the player casts Town Portal then the window lists only the empty own town', async () => {
      await castTownPortal(
        anAdvancedScenario({
          others: [
            anotherHero('hero-2', 'Adela').at(6, 2),
            aTown().withId('town-3').named('Redwater').at(10, 2)
          ]
        })
      )

      expect(readTownPortalWindowTowns()).toEqual(['Greenvale'])
    })

    test('given the town window when the player picks the farther town then the hero stands in it', async () => {
      const { user } = await castTownPortal(anAdvancedScenario())

      await pickTownInTownPortalWindow(user, 'Greenvale')

      expectHeroAt(16, 2)
    })

    test.each([
      ['Advanced', 1200, 'ADVANCED'],
      ['Expert', 1300, 'EXPERT']
    ])('given a hero with %s Earth Magic when they cast Town Portal then %i movement points are left', async (_name, movementPointsLeft, level) => {
      const { user } = await castTownPortal(
        aPortalScenario({ hero: aCaster({ earth: earthMagic(level) }).at(2, 5) })
      )
      await pickTownInTownPortalWindow(user, 'Whitemoon')
      await leaveTown(user)

      expectMovementPoints(movementPointsLeft)
    })

    test('given the town window when the player cancels it then the hero stays with their spell points and movement points', async () => {
      const { user } = await castTownPortal(anAdvancedScenario())

      await cancelTownPortalWindow(user)

      expectHeroAt(2, 5)
      expect(readHeroSpellPoints()).toBe('50')
      expectMovementPoints(1500)
    })
  })

  describe('casting from the hero screen', () => {
    test('given the spell book opened from the hero screen when the player clicks Town Portal then the hero screen closes and the hero stands in the nearest town', async () => {
      const { user } = await setupApp()
      await clickHeroInHeroList(user, HERO)
      await clickHeroScreenSpellBook(user)

      await clickSpell(user, 'Town Portal')

      expect(queryHeroScreen()).toBeNull()
      expectHeroAt(6, 2)
    })

    test('given the spell book opened from the town screen when the player clicks Town Portal then it shows its description', async () => {
      const { user } = await setupApp(aPortalScenario({ hero: aCaster().at(16, 2) }))
      await user.dblClick(getTownInTownList('Greenvale'))
      await user.click(getVisitingHero(HERO))
      await user.click(getVisitingHero(HERO))
      await clickHeroScreenSpellBook(user)

      await clickSpell(user, 'Town Portal')

      expect(readSpellBookMessage()).toEqual(['Town Portal', 'Town Portal description.'])
    })
  })

  describe('after a reload', () => {
    test('given a hero who cast Town Portal when the page reloads then they are still in the town with the spell points and movement points spent', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(aPortalScenario(), { eventLog })
      await castSpellFromMap(user, 'Town Portal')

      await setupApp(aPortalScenario(), { eventLog })

      expectHeroAt(6, 2)
      expect(readHeroSpellPoints()).toBe('34')
      expectMovementPoints(1200)
    })
  })
})
