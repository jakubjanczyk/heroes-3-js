// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { holdRightButtonOn } from './adventure-map.utils.js'
import {
  endTurns,
  expectResourceTotal,
  getTownInTownList,
  readArmySlots,
  readHeroList,
  readPrimarySkills,
  readSelectedHeroInHeroList
} from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'
import {
  closeTavern,
  getHireButton,
  getVisitingHero,
  hireHero,
  holdRightButtonOnHeroForHire,
  hoverHeroForHire,
  leaveTown,
  openTavern,
  queryTavern,
  readHeroesForHire,
  readHeroForHireDescription,
  readHiringCost,
  readSelectedHeroForHire,
  readTavernRumour,
  readTavernStatusBar,
  readVisitingHeroArmy,
  releaseRightButton,
  selectHeroForHire
} from './town-screen.utils.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

// Every roll the lowest: the first heroes of the pool still free (Orrin, then Valeska), the first
// rumour, and the smallest starting army with all three of its stacks.
const LOWEST_ROLLS = () => 0
// Every roll the highest: the last heroes of the pool still free (Christian, then Sorsha).
const HIGHEST_ROLLS = () => 0.99

const TAVERN = ['TAVERN']

// Whitemoon's entrance is at (4, 3) and Greywater's at (12, 3); the hero starts away from both, so
// the player opens the towns from the town list.
const aWhitemoon = () => aTown().named('Whitemoon').ownedByPlayer().withBuildings(TAVERN).at(4, 3)

const aGreywater = () =>
  aTown().withId('town-2').named('Greywater').ownedByPlayer().withBuildings(TAVERN).at(12, 3)

const aTavernScenario = ({
  heroes = [aHero().withName('Sir Christian').at(0, 6)],
  towns = [aWhitemoon()],
  resources = { GOLD_PILE: 10000 }
} = {}) =>
  aScenario()
    .withSize(16, 7)
    .withEntities(...heroes, ...towns)
    .withDefinitions(gameDefinitions)
    .withStartingResources(resources)

async function setupApp(scenario = aTavernScenario(), { random = LOWEST_ROLLS, eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0, random },
    eventLog
  })
}

async function openTown(user, townName) {
  await user.dblClick(getTownInTownList(townName))
}

async function openTavernIn(user, townName = 'Whitemoon') {
  await openTown(user, townName)
  await openTavern(user)
}

async function startInTavern(scenario, options) {
  const app = await setupApp(scenario, options)
  await openTavernIn(app.user)
  return app
}

async function hireHeroInTown(user, heroName, townName = 'Whitemoon') {
  await openTavernIn(user, townName)
  await hireHero(user, heroName)
}

describe('town tavern behavior', () => {
  describe('opening the tavern', () => {
    test('clicking the Tavern on the town picture opens the tavern window', async () => {
      const { user } = await setupApp()
      await openTown(user, 'Whitemoon')

      await openTavern(user)

      expect(queryTavern()).toBeTruthy()
    })

    test("the tavern window tells the barkeep's rumour", async () => {
      await startInTavern()

      expect(readTavernRumour()).toBe(
        'After a generous tip, the barkeep whispers: Griffins strike back at every attacker, however many come at them in a round.'
      )
    })

    test('the tavern window offers two heroes for 2500 gold', async () => {
      await startInTavern()

      expect(readHeroesForHire()).toEqual(['Orrin', 'Valeska'])
      expect(readHiringCost()).toBe('2500')
    })

    test('no hero is picked when the tavern opens', async () => {
      await startInTavern()

      expect(readSelectedHeroForHire()).toBeUndefined()
      expect(readHeroForHireDescription()).toBe('')
    })

    test('recruit is disabled until a hero is picked', async () => {
      await startInTavern()

      expect(getHireButton().disabled).toBe(true)
    })

    test('clicking the other hero selects and describes them', async () => {
      const { user } = await startInTavern()

      await selectHeroForHire(user, 'Valeska')

      expect(readSelectedHeroForHire()).toBe('Valeska')
      expect(readHeroForHireDescription()).toBe('Valeska is a level 1 Knight with 0 artifacts.')
    })

    test("hovering a hero for hire writes 'Select <name>' in the tavern's status bar", async () => {
      const { user } = await startInTavern()

      await hoverHeroForHire(user, 'Valeska')

      expect(readTavernStatusBar()).toBe('Select Valeska')
    })

    test('the close button closes the tavern window', async () => {
      const { user } = await startInTavern()

      await closeTavern(user)

      expect(queryTavern()).toBeNull()
    })
  })

  describe("a hero's info", () => {
    test('holding the right button on a hero for hire shows their name, primary skills and army', async () => {
      const { user } = await startInTavern()

      await holdRightButtonOnHeroForHire(user, 'Valeska')

      const popup = screen.getByRole('tooltip')
      expect(popup.textContent).toContain('Valeska')
      expect(readPrimarySkills(popup)).toEqual(['Attack 2', 'Defense 2', 'Power 1', 'Knowledge 1'])
      expect(readArmySlots(popup)).toEqual([
        'Pikemen 10',
        'Archers 4',
        'Griffins 2',
        '',
        '',
        '',
        ''
      ])
    })

    test("releasing the right button closes the hero's info", async () => {
      const { user } = await startInTavern()
      await holdRightButtonOnHeroForHire(user, 'Valeska')

      await releaseRightButton(user)

      expect(screen.queryByRole('tooltip')).toBeNull()
    })
  })

  describe('hiring', () => {
    test('hiring a hero takes 2500 gold', async () => {
      const { user } = await startInTavern()

      await hireHero(user, 'Orrin')

      expectResourceTotal('Gold', 7500)
    })

    test('hiring a hero closes the tavern and shows them as the town’s visiting hero', async () => {
      const { user } = await startInTavern()

      await hireHero(user, 'Valeska')

      expect(queryTavern()).toBeNull()
      expect(getVisitingHero('Valeska')).toBeTruthy()
    })

    test('the hired hero stands at the town’s entrance, selected in the hero list', async () => {
      const { user } = await startInTavern()
      await hireHero(user, 'Orrin')

      await leaveTown(user)

      expect(readSelectedHeroInHeroList()).toEqual(['Orrin'])
      await holdRightButtonOn(user, 4, 3)
      expect(screen.getByRole('tooltip').textContent).toContain('Orrin')
    })

    test('the hired hero has a full day of movement points', async () => {
      const { user } = await startInTavern()

      await hireHero(user, 'Orrin')

      expect(readHeroList()).toEqual(['Sir Christian 1500', 'Orrin 1500'])
    })

    test('the hired hero comes with their starting army', async () => {
      const { user } = await startInTavern()

      await hireHero(user, 'Orrin')

      expect(readVisitingHeroArmy()).toEqual([
        'Pikemen 10',
        'Archers 4',
        'Griffins 2',
        '',
        '',
        '',
        ''
      ])
    })

    test("another hero takes the hired hero's place in the tavern", async () => {
      const { user } = await startInTavern()
      await hireHero(user, 'Orrin')
      await leaveTown(user)

      await openTavernIn(user)

      expect(readHeroesForHire()).toEqual(['Edric', 'Valeska'])
    })

    test("the hero who takes the hired hero's place brings a single first-level creature", async () => {
      const { user } = await startInTavern()
      await hireHero(user, 'Orrin')
      await leaveTown(user)
      await openTavernIn(user)

      await holdRightButtonOnHeroForHire(user, 'Edric')

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

    test("the hired hero is no longer offered in the player's other tavern", async () => {
      const { user } = await setupApp(aTavernScenario({ towns: [aWhitemoon(), aGreywater()] }))
      await hireHeroInTown(user, 'Orrin', 'Whitemoon')
      await leaveTown(user)

      await openTavernIn(user, 'Greywater')

      expect(readHeroesForHire()).not.toContain('Orrin')
    })

    test('recruit is disabled with less than 2500 gold', async () => {
      const { user } = await startInTavern(aTavernScenario({ resources: { GOLD_PILE: 2499 } }))

      await selectHeroForHire(user, 'Orrin')

      expect(getHireButton().disabled).toBe(true)
    })

    test('recruit is disabled while a hero stands in the town', async () => {
      const { user } = await startInTavern(
        aTavernScenario({ heroes: [aHero().withName('Sir Christian').at(4, 3)] })
      )

      await selectHeroForHire(user, 'Orrin')

      expect(getHireButton().disabled).toBe(true)
    })

    test('recruit is disabled when the player already has 8 heroes', async () => {
      const eightHeroes = Array.from({ length: 8 }, (_, index) =>
        aHero()
          .withId(`hero-${index + 1}`)
          .withName(`Hero ${index + 1}`)
          .at(index, 6)
      )

      const { user } = await startInTavern(aTavernScenario({ heroes: eightHeroes }))

      await selectHeroForHire(user, 'Orrin')

      expect(getHireButton().disabled).toBe(true)
    })
  })

  describe('heroes for hire', () => {
    test('a hero already on the map is not offered', async () => {
      await startInTavern(aTavernScenario({ heroes: [aHero().withName('Orrin').at(0, 6)] }))

      expect(readHeroesForHire()).toEqual(['Valeska', 'Edric'])
    })

    test('every tavern of the player offers the same two heroes', async () => {
      const { user } = await startInTavern(aTavernScenario({ towns: [aWhitemoon(), aGreywater()] }))
      await closeTavern(user)
      await leaveTown(user)

      await openTavernIn(user, 'Greywater')

      expect(readHeroesForHire()).toEqual(['Orrin', 'Valeska'])
    })

    test('a new week offers new heroes', async () => {
      let roll = 0
      const { user } = await startInTavern(aTavernScenario(), { random: () => roll })
      await closeTavern(user)
      await leaveTown(user)
      roll = 0.99

      await endTurns(user, 7)
      await openTavernIn(user)

      expect(readHeroesForHire()).toEqual(['Christian', 'Sorsha'])
    })
  })

  describe('after a reload', () => {
    test('the hired hero is still there with their army, and the gold stays spent', async () => {
      const scenario = aTavernScenario()
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(scenario, { eventLog })
      await hireHeroInTown(user, 'Orrin')

      await setupApp(scenario, { eventLog, random: HIGHEST_ROLLS })

      expect(readHeroList()).toEqual(['Sir Christian 1500', 'Orrin 1500'])
      expectResourceTotal('Gold', 7500)
      expect(readVisitingHeroArmy()).toEqual([
        'Pikemen 10',
        'Archers 4',
        'Griffins 2',
        '',
        '',
        '',
        ''
      ])
    })

    test('the tavern offers the same heroes as before the reload', async () => {
      const scenario = aTavernScenario()
      const eventLog = createMemoryEventLog()
      const { user } = await startInTavern(scenario, { eventLog })
      await closeTavern(user)
      await leaveTown(user)

      const reloaded = await setupApp(scenario, { eventLog, random: HIGHEST_ROLLS })
      await openTavernIn(reloaded.user)

      expect(readHeroesForHire()).toEqual(['Orrin', 'Valeska'])
    })
  })
})
