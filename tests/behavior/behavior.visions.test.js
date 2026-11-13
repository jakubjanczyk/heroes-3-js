// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  confirmMove,
  holdRightButtonOn,
  hoverTile,
  readInfoPopupLines
} from './adventure-map.utils.js'
import {
  clickEndTurn,
  expectStatusBarText,
  getHeroInHeroList,
  readArmySlots,
  readMoraleAndLuck,
  readPrimarySkills,
  readSpellPoints,
  readTownBox,
  showsMoraleOrLuck,
  showsSpellPoints
} from './adventure-panels.utils.js'
import { castSpellFromMap } from './adventure-spells.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import {
  aHero,
  aMonster,
  anArtifactDefinition,
  aScenario,
  aSpellDefinition,
  aTown
} from './builders.js'

const spells = {
  VISIONS: aSpellDefinition()
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
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  artifacts: {
    ORB: anArtifactDefinition()
      .withName('Orb')
      .withSlot('MISC')
      .withPrimarySkills({ power: 4 })
      .build()
  },
  spells
}

const aSeer = ({ power = 1, air, id = 'hero-1', name = 'Seer', x = 0, y = 0 } = {}) =>
  aHero()
    .withId(id)
    .withName(name)
    .withPrimarySkills({ power, knowledge: 10 })
    .withSecondarySkills(air ? [{ skill: 'AIR_MAGIC', level: air }] : [])
    .withSpellBook(true)
    .withSpells(['VISIONS'])
    .at(x, y)

const skeletons = (count, x, y, id = `monster-${x}-${y}`) =>
  aMonster().withId(id).withType('SKELETON').withCount(count).at(x, y)

const aVisionsScenario = ({ hero = aSeer(), others = [] } = {}) =>
  aScenario()
    .withSize(9, 9)
    .withEntities(hero, ...others)
    .withDefinitions(gameDefinitions)

const setupApp = (scenario = aVisionsScenario(), { eventLog } = {}) =>
  setupMovementBehaviorApp({ loadGameOptions: scenario.build(), eventLog })

async function setupSeeingApp(scenario, options) {
  const app = await setupApp(scenario, options)
  await castSpellFromMap(app.user, 'Visions')
  return app
}

async function expectStatusBarOver(user, x, y, text) {
  await hoverTile(user, x, y)
  expectStatusBarText(text)
}

describe('Visions behavior', () => {
  describe('exact counts', () => {
    test('given a hero who cast Visions when the player hovers a nearby monster then the status bar shows its exact count', async () => {
      const { user } = await setupSeeingApp(aVisionsScenario({ others: [skeletons(12, 2, 0)] }))

      await expectStatusBarOver(user, 2, 0, '12 Skeletons')
    })

    test('given a hero who cast Visions when the player hovers a single nearby monster then the status bar names it in the singular', async () => {
      const { user } = await setupSeeingApp(aVisionsScenario({ others: [skeletons(1, 2, 0)] }))

      await expectStatusBarOver(user, 2, 0, '1 Skeleton')
    })

    test('given a hero who cast Visions when the player holds the right button on a nearby monster then the popup shows its exact count', async () => {
      const { user } = await setupSeeingApp(aVisionsScenario({ others: [skeletons(12, 2, 0)] }))

      await holdRightButtonOn(user, 2, 0)

      expect(readInfoPopupLines()).toEqual(['12 Skeletons'])
    })

    // Power 1 would reach 1 tile; the range is never under 3. A monster counts when it is closer
    // than the range in a straight line: 2 across and 2 down is 2.8 away, 3 across is 3.
    test('given a hero with Power 1 who cast Visions then monsters closer than 3 tiles show their count and one 3 tiles away its size', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({ others: [skeletons(5, 2, 2), skeletons(6, 3, 0)] })
      )

      await expectStatusBarOver(user, 2, 2, '5 Skeletons')
      await expectStatusBarOver(user, 3, 0, 'Several Skeletons')
    })

    // Power 5 at Basic reaches 5 tiles: 4 across and 2 down is 4.5 away, 5 across is 5.
    test('given Basic Air Magic and Power 5 when the hero casts Visions then the range is 5 tiles', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          hero: aSeer({ power: 5, air: 'BASIC' }),
          others: [skeletons(5, 4, 2), skeletons(6, 5, 0)]
        })
      )

      await expectStatusBarOver(user, 4, 2, '5 Skeletons')
      await expectStatusBarOver(user, 5, 0, 'Several Skeletons')
    })

    // Power 2 at Advanced reaches 4 tiles: 3 across and 2 down is 3.6 away, 4 across is 4.
    test('given Advanced Air Magic and Power 2 when the hero casts Visions then the range is twice the Power', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          hero: aSeer({ power: 2, air: 'ADVANCED' }),
          others: [skeletons(5, 3, 2), skeletons(6, 4, 0)]
        })
      )

      await expectStatusBarOver(user, 3, 2, '5 Skeletons')
      await expectStatusBarOver(user, 4, 0, 'Several Skeletons')
    })

    // Power 2 at Expert reaches 6 tiles: 5 across and 3 down is 5.8 away, 6 across is 6.
    test('given Expert Air Magic and Power 2 when the hero casts Visions then the range is three times the Power', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          hero: aSeer({ power: 2, air: 'EXPERT' }),
          others: [skeletons(5, 5, 3), skeletons(6, 6, 0)]
        })
      )

      await expectStatusBarOver(user, 5, 3, '5 Skeletons')
      await expectStatusBarOver(user, 6, 0, 'Several Skeletons')
    })

    test('given no magic school and Power 5 when the hero casts Visions then the range is 5 tiles, as at Basic', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          hero: aSeer({ power: 5 }),
          others: [skeletons(5, 4, 2), skeletons(6, 5, 0)]
        })
      )

      await expectStatusBarOver(user, 4, 2, '5 Skeletons')
      await expectStatusBarOver(user, 5, 0, 'Several Skeletons')
    })

    test('given a monster out of range when the hero walks within range of it then it shows its count', async () => {
      const { user } = await setupSeeingApp(aVisionsScenario({ others: [skeletons(12, 4, 0)] }))
      await expectStatusBarOver(user, 4, 0, 'Pack of Skeletons')

      await confirmMove(user, 2, 0)

      await expectStatusBarOver(user, 4, 0, '12 Skeletons')
    })

    test('given a hero who cast Visions when the player selects another hero who did not then nearby monsters show their size', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          others: [aSeer({ id: 'hero-2', name: 'Other', x: 8, y: 8 }), skeletons(12, 2, 0)]
        })
      )

      await user.click(getHeroInHeroList('Other'))

      await expectStatusBarOver(user, 2, 0, 'Pack of Skeletons')
    })

    // Power 1 and the Orb's 4 make 5, so 4 tiles across is within range.
    test('given a hero whose artifact adds Power when they cast Visions then the range counts it', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          hero: aSeer().withArtifacts(['ORB']),
          others: [skeletons(12, 4, 0)]
        })
      )

      await expectStatusBarOver(user, 4, 0, '12 Skeletons')
    })
  })

  describe('lasting', () => {
    test('given a hero who cast Visions when the next day starts then nearby monsters show their size again', async () => {
      const { user } = await setupSeeingApp(aVisionsScenario({ others: [skeletons(12, 2, 0)] }))

      await clickEndTurn(user)

      await expectStatusBarOver(user, 2, 0, 'Pack of Skeletons')
    })

    test('given a hero who cast Visions when the page reloads then nearby monsters still show their count', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aVisionsScenario({ others: [skeletons(12, 2, 0)] })
      await setupSeeingApp(scenario, { eventLog })

      const { user } = await setupApp(scenario, { eventLog })

      await expectStatusBarOver(user, 2, 0, '12 Skeletons')
    })
  })

  describe('enemy heroes', () => {
    const aBlueHero = (x, y = 0) =>
      aHero()
        .withId('hero-blue')
        .withName('Valeska')
        .ownedBy('blue')
        .withPrimarySkills({ attack: 3, defense: 2, power: 1, knowledge: 2 })
        .withSecondarySkills([{ skill: 'LEADERSHIP', level: 'ADVANCED' }])
        .withArmy([{ creature: 'PIKEMAN', count: 12 }])
        .at(x, y)

    async function readHeroPopupAt(user, x, y) {
      await holdRightButtonOn(user, x, y)
      return screen.getByRole('tooltip')
    }

    const anAdvancedSeer = (options) => aSeer({ power: 2, air: 'ADVANCED', ...options })

    test('given Advanced Visions when the player holds the right button on an enemy hero in range then the popup shows its skills, morale, luck, spell points and exact army', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({ hero: anAdvancedSeer(), others: [aBlueHero(3)] })
      )

      const popup = await readHeroPopupAt(user, 3, 0)

      expect(readPrimarySkills(popup)).toEqual(['Attack 3', 'Defense 2', 'Power 1', 'Knowledge 2'])
      expect(readMoraleAndLuck(popup)).toEqual(['Morale +3', 'Luck 0'])
      expect(readSpellPoints(popup)).toBe('20')
      expect(readArmySlots(popup)).toEqual(['Pikemen 12', '', '', '', '', '', ''])
    })

    test('given Basic Visions when the player holds the right button on an enemy hero in range then the popup shows its army as size words and no skills', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({ hero: aSeer({ power: 5, air: 'BASIC' }), others: [aBlueHero(2)] })
      )

      const popup = await readHeroPopupAt(user, 2, 0)

      expect(readPrimarySkills(popup)).toEqual(['Attack', 'Defense', 'Power', 'Knowledge'])
      expect(showsMoraleOrLuck(popup)).toBe(false)
      expect(showsSpellPoints(popup)).toBe(false)
      expect(readArmySlots(popup)[0]).toBe('Pikemen Pack')
    })

    // Power 2 at Advanced reaches 4 tiles: 3 across is in range, 4 across is not.
    test('given Advanced Visions and Power 2 then an enemy hero 3 tiles away shows its army and one 4 tiles away its size', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          hero: anAdvancedSeer(),
          others: [aBlueHero(3, 0), aBlueHero(4, 4).withId('hero-blue-2').withName('Far')]
        })
      )

      expect(readArmySlots(await readHeroPopupAt(user, 3, 0))[0]).toBe('Pikemen 12')
      expect(readArmySlots(await readHeroPopupAt(user, 4, 4))[0]).toBe('Pikemen Pack')
    })

    test('given a hero who cast Advanced Visions when the player selects another hero who did not then an enemy hero shows its size words', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          hero: anAdvancedSeer(),
          others: [aSeer({ id: 'hero-2', name: 'Other', x: 2, y: 2 }), aBlueHero(3)]
        })
      )

      await user.click(getHeroInHeroList('Other'))

      expect(readArmySlots(await readHeroPopupAt(user, 3, 0))[0]).toBe('Pikemen Pack')
    })

    test('given a hero who cast Advanced Visions when the next day starts then an enemy hero shows its size words', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({ hero: anAdvancedSeer(), others: [aBlueHero(3)] })
      )

      await clickEndTurn(user)

      expect(readArmySlots(await readHeroPopupAt(user, 3, 0))[0]).toBe('Pikemen Pack')
    })

    test('given a hero who cast Advanced Visions when the page reloads then an enemy hero still shows its army', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aVisionsScenario({ hero: anAdvancedSeer(), others: [aBlueHero(3)] })
      await setupSeeingApp(scenario, { eventLog })

      const { user } = await setupApp(scenario, { eventLog })

      expect(readArmySlots(await readHeroPopupAt(user, 3, 0))[0]).toBe('Pikemen 12')
    })
  })

  describe('towns', () => {
    // The town's buildings cover two tiles either side of its gate and two rows above it. Its
    // distance is measured to its bottom-right tile, two tiles right of the gate.
    const aBlueTown = (gateX) =>
      aTown()
        .named('Kirkwall')
        .ownedBy('blue')
        .withGarrison([{ creature: 'PIKEMAN', count: 12 }])
        .at(gateX, 8)

    const anExpertSeer = () => aSeer({ power: 2, air: 'EXPERT', y: 8 })

    async function readTownPopupAt(user, x, y) {
      await holdRightButtonOn(user, x, y)
      return screen.getByRole('tooltip')
    }

    // Power 2 at Expert reaches 6 tiles; the town's bottom-right tile is 5 across.
    test("given Expert Visions when the player holds the right button on another player's town in range then the popup shows its hall, income and exact garrison", async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({ hero: anExpertSeer(), others: [aBlueTown(3)] })
      )

      const popup = await readTownPopupAt(user, 3, 8)

      expect(within(popup).getByRole('heading').textContent).toBe('Kirkwall')
      expect(readTownBox(popup)).toEqual({ buildings: ['Village Hall', 'No fort'], income: '500' })
      expect(readArmySlots(popup, 'Garrison')[0]).toBe('Pikemen 12')
    })

    test("given Advanced Visions when the player holds the right button on another player's town in range then the popup shows only its fort and the garrison's size", async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          hero: aSeer({ power: 2, air: 'ADVANCED', y: 8 }),
          others: [aBlueTown(3)]
        })
      )

      const popup = await readTownPopupAt(user, 3, 8)

      expect(readTownBox(popup)).toEqual({ buildings: ['No fort'], income: null })
      expect(readArmySlots(popup, 'Garrison')[0]).toBe('Pikemen Pack')
    })

    test('given Expert Visions when the player holds the right button on a neutral town in range then the popup shows its hall, income and exact garrison', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          hero: anExpertSeer(),
          others: [
            aTown()
              .named('Kirkwall')
              .withGarrison([{ creature: 'PIKEMAN', count: 5 }])
              .at(3, 8)
          ]
        })
      )

      const popup = await readTownPopupAt(user, 3, 8)

      expect(readTownBox(popup)).toEqual({ buildings: ['Village Hall', 'No fort'], income: '500' })
      expect(readArmySlots(popup, 'Garrison')[0]).toBe('Pikemen 5')
    })

    // The gate is 4 tiles across, within the range of 6, but the bottom-right tile is 6 across.
    test('given Expert Visions then a town whose bottom-right tile is out of range shows its garrison as size words', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({ hero: anExpertSeer(), others: [aBlueTown(4)] })
      )

      const popup = await readTownPopupAt(user, 4, 8)

      expect(readTownBox(popup)).toEqual({ buildings: ['No fort'], income: null })
      expect(readArmySlots(popup, 'Garrison')[0]).toBe('Pikemen Pack')
    })
  })
})
