// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'
import {
  clickTile,
  confirmMove,
  expectHeroAt,
  expectNoPreview,
  getDwellingEntity,
  getHeroEntity,
  getMapCursor,
  getMineEntity,
  getTownEntity,
  holdRightButtonOn,
  hoverTile,
  longPressOn,
  readPreviewPathTiles
} from './adventure-map.utils.js'
import {
  clickEndTurn,
  endTurns,
  expectCalendarDate,
  expectInteractionModalOpen,
  expectMovementPoints,
  expectResourceTotal,
  getTownInTownList,
  readArmySlots,
  readPrimarySkills,
  readSelectedHeroInHeroList,
  showsMoraleOrLuck,
  showsSpellPoints
} from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import { queryBattleScreen } from './battle.utils.js'
import { aDwelling, aHero, aMine, aScenario, aTown } from './builders.js'
import { GRASS, WATER } from './terrain-codes.js'

const PLAYER_RED = 'rgb(255, 0, 0)'
const PLAYER_BLUE = 'rgb(49, 82, 255)'
const PLAYER_TAN = 'rgb(156, 115, 82)'

function flagOn(entityElement) {
  return within(entityElement).getByRole('img', { name: /player flag$/ })
}

function readFlag(entityElement) {
  const flag = flagOn(entityElement)
  return {
    name: flag.getAttribute('aria-label'),
    colour: window.getComputedStyle(flag).backgroundColor
  }
}

describe('other players behavior', () => {
  test("given a blue hero on the map then it carries a blue flag, and the player's hero a red one", async () => {
    await loadAppStyles()
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(6, 3)
        .withEntities(aHero().at(0, 0), aHero().withId('hero-2').ownedBy('blue').at(4, 2))
        .build()
    })

    expect(readFlag(getHeroEntity('hero-1'))).toEqual({
      name: 'Red player flag',
      colour: PLAYER_RED
    })
    expect(readFlag(getHeroEntity('hero-2'))).toEqual({
      name: 'Blue player flag',
      colour: PLAYER_BLUE
    })
  })

  test('given a blue town, a tan mine and a blue dwelling then each carries its owner’s flag', async () => {
    await loadAppStyles()
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(12, 4)
        .withEntities(
          aHero().at(0, 3),
          aTown().ownedBy('blue').at(2, 2),
          aMine().ownedBy('tan').at(6, 2),
          aDwelling().ownedBy('blue').at(10, 2)
        )
        .build()
    })

    expect(readFlag(getTownEntity())).toEqual({ name: 'Blue player flag', colour: PLAYER_BLUE })
    expect(readFlag(getMineEntity())).toEqual({ name: 'Tan player flag', colour: PLAYER_TAN })
    expect(readFlag(getDwellingEntity())).toEqual({
      name: 'Blue player flag',
      colour: PLAYER_BLUE
    })
  })

  describe('taking turns', () => {
    // Each player owns a gold mine, 1000 gold a day.
    function aTurnsScenario() {
      return aScenario()
        .withSize(12, 4)
        .withEntities(
          aHero().at(0, 3),
          aMine().withId('red-mine').ownedBy('red').at(2, 1),
          aHero().withId('hero-2').withName('Valeska').ownedBy('blue').at(11, 3),
          aMine().withId('tan-mine').ownedBy('tan').at(5, 1),
          aMine().withId('blue-mine').ownedBy('blue').at(8, 1)
        )
        .withDefinitions({
          mines: readGameData('mines.json'),
          resources: readGameData('resources.json')
        })
        .build()
    }

    test("given blue and tan players when the player ends the turn then it is the player's next day, with their own income", async () => {
      const { user } = await setupMovementBehaviorApp({ loadGameOptions: aTurnsScenario() })
      await confirmMove(user, 3, 3)
      expectMovementPoints(1200)

      await clickEndTurn(user)

      expectCalendarDate({ month: 1, week: 1, day: 2 })
      expectMovementPoints(1500)
      expectResourceTotal('Gold', 1000)
    })

    test('given blue and tan players when the player ends the turn and reloads then it is still day 2 and the hero moves', async () => {
      const session = { eventLog: createMemoryEventLog(), loadGameOptions: aTurnsScenario() }
      const { user } = await setupMovementBehaviorApp(session)
      await clickEndTurn(user)

      const reloaded = await setupMovementBehaviorApp(session)
      expectCalendarDate({ month: 1, week: 1, day: 2 })
      await confirmMove(reloaded.user, 1, 3)

      expectHeroAt(1, 3)
      expectResourceTotal('Gold', 1000)
    })

    test('given blue and tan players when the player ends the turn on day 7 then the new week begins once', async () => {
      const { user } = await setupMovementBehaviorApp({ loadGameOptions: aTurnsScenario() })
      await endTurns(user, 6)

      await clickEndTurn(user)

      expectCalendarDate({ month: 1, week: 2, day: 1 })
      expectInteractionModalOpen('A new week begins. Week 2')
    })
  })

  describe('enemy heroes in the way', () => {
    const gameDefinitions = {
      hero: readGameData('hero.json'),
      heroes: readGameData('heroes.json'),
      heroClasses: readGameData('hero-classes.json'),
      towns: readGameData('towns.json')
    }

    async function setupApp(scenario) {
      const app = await setupMovementBehaviorApp({
        loadGameOptions: scenario.withDefinitions(gameDefinitions).build(),
        appConfig: { interactionModalTransitionMs: 0 }
      })
      await loadAppStyles()
      return app
    }

    const aBlueHero = () => aHero().withId('hero-2').withName('Valeska').ownedBy('blue')

    test('given a blue hero the selected hero can reach when the mouse is over it then the cursor is the swords', async () => {
      const { user } = await setupApp(
        aScenario().withSize(6).withEntities(aHero().at(0, 0), aBlueHero().at(4, 0))
      )

      await hoverTile(user, 4, 0)

      expect(getMapCursor()).toBe('attack')
    })

    test('given a blue hero the selected hero reaches tomorrow when the mouse is over it then the swords show 2', async () => {
      const { user } = await setupApp(
        aScenario().withSize(20, 1).withEntities(aHero().at(0, 0), aBlueHero().at(18, 0))
      )

      await hoverTile(user, 18, 0)

      // On grass the hero walks 15 tiles a day, so the tile next to the blue hero is tomorrow.
      expect(getMapCursor()).toBe('attack-2')
    })

    test("given a blue hero the selected hero can't reach when the mouse is over it then the cursor is the arrow", async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(6)
          .withTiles([GRASS, GRASS, WATER, GRASS, GRASS, GRASS])
          .withEntities(aHero().at(0, 0), aBlueHero().at(4, 0))
      )

      await hoverTile(user, 4, 0)

      expect(getMapCursor()).toBe('arrow')
    })

    test('given a town is selected in the town list when the mouse is over a blue hero then the cursor is the arrow', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(6, 4)
          .withEntities(
            aHero().at(0, 3),
            aBlueHero().at(5, 3),
            aTown().named('Whitemoon').ownedByPlayer().at(2, 2)
          )
      )
      await user.click(getTownInTownList('Whitemoon'))

      await hoverTile(user, 5, 3)

      expect(getMapCursor()).toBe('arrow')
    })

    test('given a blue hero when the player walks the hero to it then the hero stops next to it and a battle starts', async () => {
      const { user } = await setupApp(
        aScenario().withSize(6).withEntities(aHero().at(0, 0), aBlueHero().at(4, 0))
      )

      await confirmMove(user, 4, 0)

      expectHeroAt(3, 0)
      expect(queryBattleScreen()).toBeTruthy()
    })

    test("given a blue hero the selected hero can't reach when the player clicks it then it is not selected and no route shows", async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(6)
          .withTiles([GRASS, GRASS, WATER, GRASS, GRASS, GRASS])
          .withEntities(aHero().withName('Orrin').at(0, 0), aBlueHero().at(4, 0))
      )

      await clickTile(user, 4, 0)

      expect(readSelectedHeroInHeroList()).toEqual(['Orrin'])
      expectNoPreview()
    })

    test('given a blue hero standing in a one-tile pass when the player clicks a tile beyond it then no route shows', async () => {
      const { user } = await setupApp(
        aScenario().withSize(6, 1).withEntities(aHero().at(0, 0), aBlueHero().at(2, 0))
      )

      await clickTile(user, 4, 0)

      expectNoPreview()
    })

    test('given a blue hero between the hero and a tile when the player clicks the tile then the route goes around the blue hero', async () => {
      const { user } = await setupApp(
        aScenario().withSize(6, 3).withEntities(aHero().at(0, 1), aBlueHero().at(2, 1))
      )

      await clickTile(user, 4, 1)

      const route = readPreviewPathTiles()
      expect(route.at(-1)).toEqual({ x: 4, y: 1 })
      expect(route).not.toContainEqual({ x: 2, y: 1 })
    })
  })
  describe("an enemy hero's popup", () => {
    const gameDefinitions = {
      hero: readGameData('hero.json'),
      heroClasses: readGameData('hero-classes.json'),
      monsters: readGameData('monsters.json')
    }

    async function setupApp(scenario) {
      return setupMovementBehaviorApp({
        loadGameOptions: scenario.withDefinitions(gameDefinitions).build()
      })
    }

    const skeletons = (count) => ({ creature: 'SKELETON', count })
    const aBlueHeroWith = (army) =>
      aHero().withId('hero-2').withName('Valeska').ownedBy('blue').withArmy(army).at(2, 0)

    test('given a blue hero with 12 Skeletons when the player holds the right button on it then the popup shows its name and Skeletons with "Pack" under them', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(4, 3)
          .withEntities(aHero().at(0, 2), aBlueHeroWith([skeletons(12)]))
      )

      await holdRightButtonOn(user, 2, 0)

      const popup = screen.getByRole('tooltip')
      expect(within(popup).getByRole('heading', { name: 'Valeska' })).toBeTruthy()
      expect(readArmySlots(popup)).toEqual(['Skeletons Pack', '', '', '', '', '', ''])
    })

    test.each([
      [4, 'Few'],
      [5, 'Several'],
      [1000, 'Legion']
    ])('given a blue hero with %i Skeletons when the player holds the right button on it then the slot shows %s', async (count, word) => {
      const { user } = await setupApp(
        aScenario()
          .withSize(4, 3)
          .withEntities(aHero().at(0, 2), aBlueHeroWith([skeletons(count)]))
      )

      await holdRightButtonOn(user, 2, 0)

      expect(readArmySlots(screen.getByRole('tooltip'))[0]).toBe(`Skeletons ${word}`)
    })

    test('given a blue hero when the player holds the right button on it then the popup shows no primary skill values, morale, luck or spell points', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(4, 3)
          .withEntities(aHero().at(0, 2), aBlueHeroWith([skeletons(12)]))
      )

      await holdRightButtonOn(user, 2, 0)

      const popup = screen.getByRole('tooltip')
      expect(readPrimarySkills(popup)).toEqual(['Attack', 'Defense', 'Power', 'Knowledge'])
      expect(showsMoraleOrLuck(popup)).toBe(false)
      expect(showsSpellPoints(popup)).toBe(false)
    })

    test('given a blue hero when the player presses and holds a finger on it then the popup shows its army as size words', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(4, 3)
          .withEntities(aHero().at(0, 2), aBlueHeroWith([skeletons(12)]))
      )

      await longPressOn(user, 2, 0)

      expect(readArmySlots(screen.getByRole('tooltip'))[0]).toBe('Skeletons Pack')
    })
  })
})
