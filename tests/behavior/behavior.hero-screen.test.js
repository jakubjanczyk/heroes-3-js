// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  clickTile,
  confirmTileClickByDispatch,
  expectHeroAt,
  getMapViewCentreTile,
  panCamera
} from './adventure-map.utils.js'
import {
  closeLevelUpPopup,
  getHeroInfoBox,
  getTownInTownList,
  takeFromTreasureChest
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  pressKey,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, aScenario, aTown, aTreasureChest } from './builders.js'
import {
  clickHeroInHeroList,
  closeHeroScreen,
  getHeroScreen,
  hoverOnHeroScreen,
  queryHeroScreen,
  readHeroScreenArmy,
  readHeroScreenBox,
  readHeroScreenPrimarySkills,
  readHeroScreenStatusBar,
  readHeroScreenTitle,
  unhoverOnHeroScreen
} from './hero-screen.utils.js'
import {
  clickGarrisonSlot,
  clickVisitingHeroSlot,
  enterTownAt,
  getVisitingHero,
  queryTownScreen
} from './town-screen.utils.js'

const HERO_NAME = 'Sir Christian'

const gameDefinitions = {
  hero: { ...readGameData('hero.json'), name: HERO_NAME },
  heroClasses: readGameData('hero-classes.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

// Rolls Defense on a Knight's level-up (Attack 35%, Defense 45%, Power 10%, Knowledge 10%).
const ROLL_DEFENSE = 0.5

const pikemen = (count) => ({ creature: 'PIKEMAN', count })
const archers = (count) => ({ creature: 'ARCHER', count })

// The hero starts at (4, 5), two tiles below Whitemoon's entrance at (4, 3).
const aHeroScreenScenario = ({ hero = aHero(), town = aTown().named('Whitemoon') } = {}) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(hero.at(4, 5), town.ownedByPlayer().at(4, 3))
    .withDefinitions(gameDefinitions)

async function setupApp(scenario = aHeroScreenScenario(), options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0, random: () => ROLL_DEFENSE },
    ...options
  })
}

async function openHeroScreen(scenario) {
  const app = await setupApp(scenario)
  await clickHeroInHeroList(app.user, HERO_NAME)
  getHeroScreen()
  return app
}

describe('hero screen behavior', () => {
  describe('opening it', () => {
    test("given the hero is selected when the player clicks the hero's portrait in the hero list then the hero screen opens", async () => {
      const { user } = await setupApp()

      await clickHeroInHeroList(user, HERO_NAME)

      expect(queryHeroScreen()).toBeTruthy()
    })

    // As in Heroes 3, the first click on a hero in the list selects them; only a second opens the
    // hero screen.
    test("given a town is selected when the player clicks the hero's portrait in the hero list then the hero is selected and the hero screen stays closed", async () => {
      const { user } = await setupApp()
      await user.click(getTownInTownList('Whitemoon'))

      await clickHeroInHeroList(user, HERO_NAME)

      expect(getHeroInfoBox()).toBeTruthy()
      expect(queryHeroScreen()).toBeNull()
    })

    test('given the hero is selected when the player clicks the hero on the map then the hero screen opens', async () => {
      const { user } = await setupApp()

      await clickTile(user, 4, 5)

      expect(queryHeroScreen()).toBeTruthy()
    })

    // In a town, as in Heroes 3, the first click on the visiting hero's portrait frames it and
    // the second opens the hero screen over the town.
    test("given the town screen with a visiting hero when the player clicks the hero's portrait twice then the hero screen opens", async () => {
      const { user } = await setupApp()
      await enterTownAt(4, 3)

      await user.click(getVisitingHero(HERO_NAME))
      await user.click(getVisitingHero(HERO_NAME))

      expect(queryHeroScreen()).toBeTruthy()
    })

    test("given the town screen with a visiting hero when the player clicks the hero's portrait once then the hero screen stays closed", async () => {
      const { user } = await setupApp()
      await enterTownAt(4, 3)

      await user.click(getVisitingHero(HERO_NAME))

      expect(queryHeroScreen()).toBeNull()
    })
  })

  describe('closing it', () => {
    test('given the hero screen is open when the player presses the ✓ then it closes', async () => {
      const { user } = await openHeroScreen()

      await closeHeroScreen(user)

      expect(queryHeroScreen()).toBeNull()
    })

    test.each([
      '{Enter}',
      '{Escape}'
    ])('given the hero screen is open when the player presses %s then it closes', async (key) => {
      const { user } = await openHeroScreen()

      await pressKey(user, key)

      expect(queryHeroScreen()).toBeNull()
    })

    test('given the hero screen opened from a town when the player presses Escape then the town screen is still open', async () => {
      const { user } = await setupApp()
      await enterTownAt(4, 3)
      await user.dblClick(getVisitingHero(HERO_NAME))

      await pressKey(user, '{Escape}')

      expect(queryHeroScreen()).toBeNull()
      expect(queryTownScreen()).toBeTruthy()
    })

    test('given the hero screen opened from a town when it closes then the arrow keys still leave the map behind the town screen alone', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(60, 40)
          .withEntities(aHero().at(20, 17), aTown().named('Whitemoon').ownedByPlayer().at(20, 15))
          .withDefinitions(gameDefinitions),
        { viewportSize: { width: 1000, height: 700 } }
      )
      await enterTownAt(20, 15)
      await user.dblClick(getVisitingHero(HERO_NAME))
      await closeHeroScreen(user)
      const centreInTown = getMapViewCentreTile()

      panCamera('ArrowRight', 20)

      expect(getMapViewCentreTile()).toEqual(centreInTown)
    })

    test('given the hero screen is open when the page reloads then the adventure map is shown without it', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(aHeroScreenScenario(), { eventLog })
      await clickHeroInHeroList(user, HERO_NAME)

      await setupApp(aHeroScreenScenario(), { eventLog })

      expect(queryHeroScreen()).toBeNull()
      expectHeroAt(4, 5)
    })
  })

  test('given the hero screen is open when the player clicks the map behind it then the hero does not move', async () => {
    await openHeroScreen()

    confirmTileClickByDispatch(5, 5)
    await flushMicrotasks()

    expectHeroAt(4, 5)
  })

  describe('what it shows', () => {
    test("given a hero with no experience then it shows the hero's name and Level 1 Knight", async () => {
      await openHeroScreen()

      expect(readHeroScreenTitle()).toEqual([HERO_NAME, 'Level 1 Knight'])
    })

    test('given a hero with 2000 experience then it shows Level 3 Knight', async () => {
      await openHeroScreen(aHeroScreenScenario({ hero: aHero().withExperience(2000) }))

      expect(readHeroScreenTitle()).toEqual([HERO_NAME, 'Level 3 Knight'])
    })

    test('given a hero with 2000 experience then the Experience box shows 2000', async () => {
      await openHeroScreen(aHeroScreenScenario({ hero: aHero().withExperience(2000) }))

      expect(readHeroScreenBox('Experience')).toBe('Experience 2000')
    })

    test('given a scenario that sets the primary skills then it shows Attack, Defense, Power and Knowledge with those values', async () => {
      await openHeroScreen(
        aHeroScreenScenario({
          hero: aHero().withPrimarySkills({ attack: 5, defense: 0, power: 3, knowledge: 4 })
        })
      )

      expect(readHeroScreenPrimarySkills()).toEqual([
        'Attack 5',
        'Defense 0',
        'Power 3',
        'Knowledge 4'
      ])
    })

    // The chest's 1000 experience takes the hero to level 2, which rolls Defense.
    test('given the hero went up a level then it shows the level, the experience and the gained primary skill', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(5)
          .withEntities(aHero(), aTreasureChest().withTier(2).at(1, 0))
          .withDefinitions(gameDefinitions)
      )
      await takeFromTreasureChest(user, { x: 1, y: 0 }, 'experience')
      await closeLevelUpPopup(user, HERO_NAME)

      await clickHeroInHeroList(user, HERO_NAME)

      expect([
        readHeroScreenTitle()[1],
        readHeroScreenBox('Experience'),
        readHeroScreenPrimarySkills()
      ]).toEqual([
        'Level 2 Knight',
        'Experience 1000',
        ['Attack 2', 'Defense 3', 'Power 1', 'Knowledge 1']
      ])
    })

    test('given a hero army with gaps then the seven army slots show each stack in its slot', async () => {
      await openHeroScreen(
        aHeroScreenScenario({ hero: aHero().withArmy([pikemen(12), null, archers(5)]) })
      )

      expect(readHeroScreenArmy()).toEqual(['Pikemen 12', '', 'Archers 5', '', '', '', ''])
    })

    test("given the hero took a stack from the town's garrison then the hero screen shows it in the hero's army", async () => {
      const { user } = await setupApp(
        aHeroScreenScenario({
          hero: aHero().withArmy([archers(5)]),
          town: aTown()
            .named('Whitemoon')
            .withGarrison([pikemen(10)])
        })
      )
      await enterTownAt(4, 3)
      await clickGarrisonSlot(user, 1)
      await clickVisitingHeroSlot(user, 2)

      await user.dblClick(getVisitingHero(HERO_NAME))

      expect(readHeroScreenArmy()).toEqual(['Archers 5', 'Pikemen 10', '', '', '', '', ''])
    })
  })

  describe('status bar', () => {
    test.each([
      'Attack',
      'Defense',
      'Power',
      'Knowledge'
    ])('hovering %s shows its "View … Info" text', async (skill) => {
      const { user } = await openHeroScreen()

      await hoverOnHeroScreen(user, skill)

      expect(readHeroScreenStatusBar()).toBe(`View ${skill} Info`)
    })

    test('moving off Experience clears the status bar', async () => {
      const { user } = await openHeroScreen()
      await hoverOnHeroScreen(user, 'Experience')

      await unhoverOnHeroScreen(user, 'Experience')

      expect(readHeroScreenStatusBar()).toBe('')
    })

    test('hovering Experience shows "View Experience Info"', async () => {
      const { user } = await openHeroScreen()

      await hoverOnHeroScreen(user, 'Experience')

      expect(readHeroScreenStatusBar()).toBe('View Experience Info')
    })
  })
})
