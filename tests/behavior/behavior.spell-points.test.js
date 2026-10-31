// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  confirmTileClickByDispatch,
  holdRightButtonOn,
  readInfoPopupLines
} from './adventure-map.utils.js'
import {
  endTurns,
  getHeroInfoBox,
  getTownInTownList,
  readHeroListSpellPoints,
  readSelectedHeroInHeroList,
  readSpellPoints
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, anArtifact, anArtifactDefinition, aScenario, aTown } from './builders.js'
import { meetHeroAt, readHeroExchangeSpellPoints } from './hero-exchange.utils.js'
import {
  clickHeroInHeroList,
  clickHeroScreenArtifactSlot,
  clickHeroScreenBackpackFrame,
  closeHeroScreen,
  holdRightButtonOnHeroScreenBox,
  hoverOnHeroScreenBox,
  readHeroScreenBox,
  readHeroScreenStatusBar
} from './hero-screen.utils.js'
import { hireHero, leaveTown, openTavern } from './town-screen.utils.js'

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
  artifacts: {
    TOME: anArtifactDefinition()
      .withName('Tome')
      .withSlot('MISC')
      .withPrimarySkills({ knowledge: 2 })
      .build()
  }
}

const HERO = 'Christian'
const OTHER_HERO = 'Valeska'

const knowledge = (value) => ({ attack: 0, defense: 0, power: 1, knowledge: value })
const basic = (skill) => ({ skill, level: 'BASIC' })
const advanced = (skill) => ({ skill, level: 'ADVANCED' })
const expert = (skill) => ({ skill, level: 'EXPERT' })

// A Knight, Knowledge 1, so 10 spell points, unless the test says otherwise.
const aSpellHero = () => aHero().withName(HERO).withSecondarySkills([])

// The hero stands at (3, 3) with a Tome (+2 Knowledge) on (4, 3), just under the entrance of the
// town at (4, 2). The town covers the tiles around its entrance in the rows above.
const aSpellScenario = ({ hero = aSpellHero(), others = [] } = {}) =>
  aScenario()
    .withSize(8, 4)
    .withEntities(hero.at(3, 3), ...others)
    .withDefinitions(gameDefinitions)

const aTome = () => anArtifact().withType('TOME').at(4, 3)

const aTownWith = (buildings) =>
  aTown().named('Whitemoon').ownedByPlayer().withBuildings(buildings).at(4, 2)

async function setupApp(scenario = aSpellScenario(), { eventLog, random } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0, ...(random ? { random } : {}) },
    eventLog
  })
}

async function walkTo(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

// Knowledge 1 + 2 makes the maximum 30, the hero still having the 10 they started with.
const pickUpTheTome = () => walkTo(4, 3)

async function startOnHeroScreen(hero) {
  const app = await setupApp(aSpellScenario({ hero }))
  await clickHeroInHeroList(app.user, HERO)
  return app
}

function readPopup() {
  return [
    within(screen.getByRole('tooltip')).getByRole('heading').textContent,
    ...readInfoPopupLines()
  ]
}

// The first click selects a hero who isn't selected; a click on the selected one opens the screen.
async function readHeroScreenSpellPoints(user, heroName = HERO) {
  if (!readSelectedHeroInHeroList().includes(heroName)) {
    await clickHeroInHeroList(user, heroName)
  }
  await clickHeroInHeroList(user, heroName)
  const spellPoints = readHeroScreenBox('Spell Points')
  await closeHeroScreen(user)
  return spellPoints
}

describe('spell points behavior', () => {
  describe('shown', () => {
    test('given a hero with Knowledge 3 when the hero screen opens then it shows 30 spell points out of 30', async () => {
      await startOnHeroScreen(aSpellHero().withPrimarySkills(knowledge(3)))

      expect(readHeroScreenBox('Spell Points')).toBe('Spell Points 30/30')
    })

    test('given a hero wearing an artifact with +2 Knowledge when the hero screen opens then the maximum counts it', async () => {
      await startOnHeroScreen(aSpellHero().withArtifacts(['TOME']))

      expect(readHeroScreenBox('Spell Points')).toBe('Spell Points 30/30')
    })

    // 10 × Knowledge 1, then 25, 50 or 100% more, the fraction dropped.
    test.each([
      ['Basic', '12/12', basic],
      ['Advanced', '15/15', advanced],
      ['Expert', '20/20', expert]
    ])('given a hero with %s Intelligence when the hero screen opens then it shows %s', async (_, spellPoints, level) => {
      await startOnHeroScreen(aSpellHero().withSecondarySkills([level('INTELLIGENCE')]))

      expect(readHeroScreenBox('Spell Points')).toBe(`Spell Points ${spellPoints}`)
    })

    test('given the hero screen when the player holds the right button on the spell points then the popup explains them', async () => {
      const { user } = await startOnHeroScreen(aSpellHero().withPrimarySkills(knowledge(2)))

      await holdRightButtonOnHeroScreenBox(user, 'Spell Points')

      expect(readPopup()).toEqual([
        'Spell Points',
        'Christian currently has 20 spell points out of a maximum of 20.  The maximum number of spell points is 10 times your Knowledge.  It is occasionally possible to have more than your maximum spell points from special events or locations.'
      ])
    })

    test('given the hero screen when the player hovers over the spell points then the status bar says what clicking shows', async () => {
      const { user } = await startOnHeroScreen(aSpellHero())

      await hoverOnHeroScreenBox(user, 'Spell Points')

      expect(readHeroScreenStatusBar()).toBe('View Spell Points Info')
    })

    test("given a selected hero when the game loads then the info box shows the hero's spell points", async () => {
      await setupApp(aSpellScenario({ hero: aSpellHero().withPrimarySkills(knowledge(2)) }))

      expect(readSpellPoints(getHeroInfoBox())).toBe('20')
    })

    test("given the hero on the map when the player holds the right button on them then the popup shows the hero's spell points", async () => {
      const { user } = await setupApp(
        aSpellScenario({ hero: aSpellHero().withPrimarySkills(knowledge(2)) })
      )

      await holdRightButtonOn(user, 3, 3)

      expect(readSpellPoints(screen.getByRole('tooltip'))).toBe('20')
    })

    test("given two heroes meet when the exchange screen opens then it shows each hero's spell points", async () => {
      const { user } = await setupApp(
        aSpellScenario({
          others: [
            aHero()
              .withId('hero-2')
              .withName(OTHER_HERO)
              .withPrimarySkills(knowledge(4))
              .withSecondarySkills([])
              .at(5, 3)
          ]
        })
      )

      await meetHeroAt(user, 5, 3)

      expect([readHeroExchangeSpellPoints(HERO), readHeroExchangeSpellPoints(OTHER_HERO)]).toEqual([
        '10',
        '40'
      ])
    })

    test('given the hero picked up a Tome when the hero list shows them then their spell points bar is filled to 10 out of 30', async () => {
      await setupApp(aSpellScenario({ others: [aTome()] }))

      await pickUpTheTome()

      expect(readHeroListSpellPoints()).toEqual({ value: '10', max: '30' })
    })
  })

  describe('gaining and getting them back', () => {
    test('given a hero with 10 spell points when they gain Knowledge then only the maximum goes up', async () => {
      const { user } = await setupApp(aSpellScenario({ others: [aTome()] }))

      await pickUpTheTome()

      expect(await readHeroScreenSpellPoints(user)).toBe('Spell Points 10/30')
    })

    test('given a hero under their maximum when the next day starts then they get 1 spell point back', async () => {
      const { user } = await setupApp(aSpellScenario({ others: [aTome()] }))
      await pickUpTheTome()

      await endTurns(user, 1)

      expect(await readHeroScreenSpellPoints(user)).toBe('Spell Points 11/30')
    })

    test.each([
      ['Basic', '12/30', basic],
      ['Advanced', '13/30', advanced],
      ['Expert', '14/30', expert]
    ])('given a hero with %s Mysticism when the next day starts then they have %s', async (_, spellPoints, level) => {
      const { user } = await setupApp(
        aSpellScenario({
          hero: aSpellHero().withSecondarySkills([level('MYSTICISM')]),
          others: [aTome()]
        })
      )
      await pickUpTheTome()

      await endTurns(user, 1)

      expect(await readHeroScreenSpellPoints(user)).toBe(`Spell Points ${spellPoints}`)
    })

    // 20 short, 4 back a day: full after five days, and no more on the sixth.
    test('given a hero with Expert Mysticism when six days pass then they have no more than their maximum', async () => {
      const { user } = await setupApp(
        aSpellScenario({
          hero: aSpellHero().withSecondarySkills([expert('MYSTICISM')]),
          others: [aTome()]
        })
      )
      await pickUpTheTome()

      await endTurns(user, 6)

      expect(await readHeroScreenSpellPoints(user)).toBe('Spell Points 30/30')
    })

    test('given a hero under their maximum in a town with a Mage Guild when the next day starts then they get all their spell points back', async () => {
      const { user } = await setupApp(
        aSpellScenario({ others: [aTome(), aTownWith(['MAGE_GUILD_1'])] })
      )
      await pickUpTheTome()
      await walkTo(4, 2)
      await leaveTown(user)

      await endTurns(user, 1)

      expect(await readHeroScreenSpellPoints(user)).toBe('Spell Points 30/30')
    })

    test('given a hero under their maximum in a town without a Mage Guild when the next day starts then they get 1 spell point back', async () => {
      const { user } = await setupApp(aSpellScenario({ others: [aTome(), aTownWith([])] }))
      await pickUpTheTome()
      await walkTo(4, 2)
      await leaveTown(user)

      await endTurns(user, 1)

      expect(await readHeroScreenSpellPoints(user)).toBe('Spell Points 11/30')
    })

    // The Tome is the only Misc artifact, so it is worn in the first Misc slot.
    test('given a hero wearing a Tome when they take it off then they keep the spell points over the new maximum', async () => {
      const { user } = await startOnHeroScreen(aSpellHero().withArtifacts(['TOME']))

      await clickHeroScreenArtifactSlot(user, 'Misc 1')
      await clickHeroScreenBackpackFrame(user, 1)

      expect(readHeroScreenBox('Spell Points')).toBe('Spell Points 30/10')
    })

    test('given a hero over their maximum when the next day starts then they get no spell points back', async () => {
      const { user } = await startOnHeroScreen(aSpellHero().withArtifacts(['TOME']))
      await clickHeroScreenArtifactSlot(user, 'Misc 1')
      await clickHeroScreenBackpackFrame(user, 1)
      await closeHeroScreen(user)

      await endTurns(user, 1)

      expect(await readHeroScreenSpellPoints(user)).toBe('Spell Points 30/10')
    })

    // Every roll the lowest: the tavern offers Orrin first, a Knight with Knowledge 1. The town's
    // entrance must be free to hire, so the player opens it from the town list.
    test('given a town with a Tavern when the player hires a hero then the hero has all their spell points', async () => {
      const { user } = await setupApp(
        aSpellScenario({ others: [aTownWith(['TAVERN'])] }).withStartingResources({
          GOLD_PILE: 10000
        }),
        { random: () => 0 }
      )
      await user.dblClick(getTownInTownList('Whitemoon'))
      await openTavern(user)
      await hireHero(user, 'Orrin')
      await leaveTown(user)

      expect(await readHeroScreenSpellPoints(user, 'Orrin')).toBe('Spell Points 10/10')
    })

    test('given a hero got a spell point back when the page reloads then the hero screen shows it', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aSpellScenario({ others: [aTome()] })
      const { user } = await setupApp(scenario, { eventLog })
      await pickUpTheTome()
      await endTurns(user, 1)

      const reloaded = await setupApp(scenario, { eventLog })

      expect(await readHeroScreenSpellPoints(reloaded.user)).toBe('Spell Points 11/30')
    })
  })
})
